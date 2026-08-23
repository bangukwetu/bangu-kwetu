// Converts a stored YYYY-MM-DD date into a readable display format,
// e.g. "2026-08-18" -> "August 18, 2026". Storage stays ISO (for
// reliable sorting); only the on-screen text changes.
function formatDisplayDate(isoDate) {
    const d = new Date(isoDate + 'T00:00:00');
    if (isNaN(d)) return isoDate; // fallback: show raw value rather than break
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}
// ── SAFETY: escape any text before inserting into innerHTML ──────
function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function isSafeUrl(url) {
    return /^https?:\/\//i.test(url.trim());
}

// Scans for [label](url) manually instead of a naive regex, so URLs that
// contain their own parentheses (e.g. Wikipedia-style links) are captured
// correctly instead of truncating at the first ')'.
function extractLinks(text) {
    const links = [];
    let result = '';
    let i = 0;
    while (i < text.length) {
        if (text[i] === '[') {
            const labelEnd = text.indexOf(']', i);
            if (labelEnd !== -1 && text[labelEnd + 1] === '(') {
                let depth = 1;
                let j = labelEnd + 2;
                while (j < text.length && depth > 0) {
                    if (text[j] === '(') depth++;
                    else if (text[j] === ')') depth--;
                    if (depth > 0) j++;
                }
                if (depth === 0) {
                    const label = text.slice(i + 1, labelEnd);
                    const url = text.slice(labelEnd + 2, j);
                    const idx = links.length;
                    links.push({ label: label, url: url.trim() });
                    result += '\u0000LINK' + idx + '\u0000';
                    i = j + 1;
                    continue;
                }
            }
        }
        result += text[i];
        i++;
    }
    return { text: result, links: links };
}

// Converts a small, fixed set of Markdown (bold, italic, links) into safe
// HTML. Raw text is escaped first — only tags we generate ourselves
// (<strong>, <em>, <a>) ever reach innerHTML, so a compromised or malicious
// CMS entry can't inject arbitrary HTML/scripts through this field.
function renderInlineMarkdown(rawText) {
    const extracted = extractLinks(rawText);
    let working = escapeHtml(extracted.text);
    working = working.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    working = working.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    working = working.replace(/\u0000LINK(\d+)\u0000/g, function (match, idx) {
        const link = extracted.links[Number(idx)];
        const safeLabel = escapeHtml(link.label);
        if (!isSafeUrl(link.url)) return safeLabel;
        const safeUrl = escapeHtml(link.url);
        return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeLabel}</a>`;
    });

    return working;
}

// Splits article content into paragraphs/headings (#, ##, ###) and renders
// each safely via renderInlineMarkdown.
function renderMarkdownBody(content, container) {
    container.innerHTML = '';
    const blocks = content.split(/\n\s*\n/).filter(function (b) { return b.trim() !== ''; });

    blocks.forEach(function (raw) {
        const trimmed = raw.trim();
        let tag = 'p';
        let text = trimmed;

        if (/^###\s+/.test(trimmed)) {
            tag = 'h4';
            text = trimmed.replace(/^###\s+/, '');
        } else if (/^##\s+/.test(trimmed)) {
            tag = 'h3';
            text = trimmed.replace(/^##\s+/, '');
        } else if (/^#\s+/.test(trimmed)) {
            tag = 'h2';
            text = trimmed.replace(/^#\s+/, '');
        }

        // A stray "#" with no real text after it (e.g. leftover from a
        // paste, or typed as a section-break) would otherwise still create
        // an empty heading element — headings carry their own spacing even
        // with nothing inside, which shows up as a blank gap in the article.
        if (text.trim() === '') return;

        const el = document.createElement(tag);
        el.innerHTML = renderInlineMarkdown(text);
        container.appendChild(el);
    });
}

// ── BREAKING BANNER TIME LABEL ─────────────────────
// Articles only store a day-level date (no time-of-day), so true
// "2h ago" precision isn't available without adding a datetime field to
// the CMS. Three tiers instead:
//   - published today      → no label at all (redundant — "breaking"
//                             already implies recent; the pulsing dot
//                             alone signals "live")
//   - published yesterday  → "Yesterday"
//   - older (flag forgotten in CMS) → full absolute date, same format
//                             used everywhere else on the site
// Returns '' (empty string) for "today" so the caller can skip rendering
// the time element entirely rather than showing a redundant label.
function formatBreakingTime(isoDate) {
    const d = new Date(isoDate + 'T00:00:00');
    const now = new Date();
    const startOfDay = function (dt) {
        return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    };
    const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
    if (diffDays <= 0) return '';
    if (diffDays === 1) return 'Yesterday';
    return formatDisplayDate(isoDate);
}

// ── BREAKING BANNER DISMISS (session-scoped) ──────
// Dismissal is keyed to the specific article's id, not just "banner
// dismissed" — so dismissing today's breaking story won't suppress a
// different story that goes breaking later in the same session. Shared
// key with main.js so a dismissal on the homepage also applies here,
// and vice versa.
function isBreakingDismissed(id) {
    try {
        return sessionStorage.getItem('bk-dismissed-breaking') === id;
    } catch (e) {
        return false;
    }
}

function dismissBreaking(id) {
    try {
        sessionStorage.setItem('bk-dismissed-breaking', id);
    } catch (e) {
        // sessionStorage unavailable — banner just won't remember the 
        // dismissal, not a functional break.
    }
}

function getLatestBreaking(articles) {
    return [...articles]
        .filter(function (a) { return a.breaking; })
        .sort(function (a, b) { return new Date(b.date) - new Date(a.date); })[0] || null;
}

// Keeps #bk-cat-nav pinned directly below the header block, whether or not
// the breaking banner is currently showing.
function updateStickyOffset() {
    const headerBlock = document.querySelector('.bk-header-block');
    if (headerBlock) {
        document.documentElement.style.setProperty('--bk-header-offset', headerBlock.offsetHeight + 'px');
    }
}
window.addEventListener('resize', updateStickyOffset);

// ── BREAKING — shows on article pages too, even for a different story ──
// A reader deep in one article might not know something else just broke —
// this is standard behavior across major news sites, not specific to the
// story currently being read.
function renderBreakingBanner() {
    const container = document.getElementById('bk-breaking-banner');
    if (!container) return;

    const breaking = getLatestBreaking(allArticles);

    if (!breaking || isBreakingDismissed(breaking.id)) {
        container.style.display = 'none';
        container.innerHTML = '';
        updateStickyOffset();
        return;
    }

    const timeLabel = formatBreakingTime(breaking.date);
    const timeHtml = timeLabel ? `<span class="bk-breaking-time">${escapeHtml(timeLabel)}</span>` : '';

    container.style.display = 'flex';
    container.innerHTML = `
        <span class="bk-breaking-badge">
            <span class="bk-breaking-dot" aria-hidden="true"></span>
            <span class="bk-breaking-label">Breaking</span>
        </span>
        <a href="article.html?id=${encodeURIComponent(breaking.id)}">
            <span class="bk-breaking-title">${escapeHtml(breaking.title)}</span>
            <span class="bk-breaking-chevron" aria-hidden="true">→</span>
        </a>
        ${timeHtml}
        <button type="button" class="bk-breaking-dismiss" id="bk-breaking-dismiss" aria-label="Dismiss breaking news">✕</button>
    `;

    const dismissBtn = document.getElementById('bk-breaking-dismiss');
    dismissBtn.addEventListener('click', function () {
        dismissBreaking(breaking.id);
        container.style.display = 'none';
        container.innerHTML = '';
        updateStickyOffset();
    });

    updateStickyOffset();
}

// ── THEME TOGGLE ───────────────────────────────────
const themeToggle = document.getElementById('bk-theme-toggle');
themeToggle.addEventListener('click', function () {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('bk-theme', 'light');
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('bk-theme', 'dark');
    }
});

const hamburgerBtn = document.getElementById('bk-hamburger');
const bkNav = document.getElementById('bk-nav');
const navOverlay = document.getElementById('bk-nav-overlay');
const navClose = document.getElementById('bk-nav-close');

function openNav() {
    hamburgerBtn.classList.add('open');
    bkNav.classList.add('active');
    navOverlay.classList.add('active');
    document.body.classList.add('bk-nav-open');
}
function closeNav() {
    hamburgerBtn.classList.remove('open');
    bkNav.classList.remove('active');
    navOverlay.classList.remove('active');
    document.body.classList.remove('bk-nav-open');
}

hamburgerBtn.addEventListener('click', function () {
    bkNav.classList.contains('active') ? closeNav() : openNav();
});
navClose.addEventListener('click', closeNav);
navOverlay.addEventListener('click', closeNav);

bkNav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeNav);
});

// ── SEARCH ─────────────────────────────────────────
const searchBtn = document.getElementById('bk-search-btn');
const searchClose = document.getElementById('bk-search-close');
const searchBox = document.getElementById('bk-search-box');
const searchInput = document.getElementById('bk-search-input');
const searchResults = document.getElementById('bk-search-results');

// Article pages never load the full article list elsewhere, so search
// (and now the breaking banner) needs its own fetch of articles.json.
let allArticles = [];

async function loadArticlesForSearch() {
    try {
        const response = await fetch('data/articles.json');
        if (!response.ok) throw new Error('Network response was not ok');
        allArticles = (await response.json()).articles;
        renderBreakingBanner();
    } catch (err) {
        console.error('Could not load articles for search:', err);
    }
}
loadArticlesForSearch();

searchBtn.addEventListener('click', function () {
    searchBox.classList.add('open');
    searchBtn.style.display = 'none';
    setTimeout(function () { searchInput.focus(); }, 50);
});

searchClose.addEventListener('click', function () {
    searchBox.classList.remove('open');
    searchBtn.style.display = '';
    searchInput.value = '';
    searchResults.classList.remove('show');
    searchResults.innerHTML = '';
});

searchInput.addEventListener('input', function () {
    const query = searchInput.value.trim().toLowerCase();

    if (query === '') {
        searchResults.classList.remove('show');
        searchResults.innerHTML = '';
        return;
    }

    const matches = allArticles.filter(function (a) {
        return a.title.toLowerCase().includes(query) ||
               a.category.toLowerCase().includes(query);
    });

    if (matches.length === 0) {
        searchResults.innerHTML = '<div class="bk-search-no-results">No results found</div>';
    } else {
        searchResults.innerHTML = matches.map(function (a) {
            return `<a href="article.html?id=${encodeURIComponent(a.id)}" class="bk-search-result-item">${escapeHtml(a.title)}</a>`;
        }).join('');
    }

    searchResults.classList.add('show');
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        searchBox.classList.remove('open');
        searchBtn.style.display = '';
        searchInput.value = '';
        searchResults.classList.remove('show');
        searchResults.innerHTML = '';
        closeNav();
    }
});

let bkLastScroll = 0;
const bkWaBtn = document.getElementById('bk-whatsapp-float');
// Ignores scroll movements smaller than this — mobile touch-scroll momentum
// causes small up/down jitter even during steady downward scrolling.
const BK_SCROLL_THRESHOLD = 8;
window.addEventListener('scroll', () => {
    // Clamp to the page's real scrollable range — mobile browsers "bounce"
    // past the top/bottom edge (rubber-band overscroll), which otherwise
    // reads as a false scroll-up signal and brings the button back even
    // while still actively scrolling down.
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    let currentScroll = window.pageYOffset;
    currentScroll = Math.max(0, Math.min(currentScroll, maxScroll));

    const delta = currentScroll - bkLastScroll;
    if (Math.abs(delta) < BK_SCROLL_THRESHOLD) return;
    if (delta > 0 && currentScroll > 100) {
        bkWaBtn.classList.add('bk-hide');
    } else {
        bkWaBtn.classList.remove('bk-hide');
    }
    bkLastScroll = currentScroll;
});

async function loadArticle() {
    const params = new URLSearchParams(window.location.search);
    const articleId = params.get('id');

    const notFoundBlock = document.getElementById('bk-article-notfound');
    const contentBlock = document.getElementById('bk-article-content');

    if (!articleId) {
        notFoundBlock.style.display = 'block';
        return;
    }

    // Canonical, share, and copy-link URLs always point to the live
    // custom domain — never window.location.href, which would leak the
    // pages.dev URL if someone lands there before the redirect fires.
    const canonicalUrl = `https://bangukwetu.co.ke/article.html?id=${encodeURIComponent(articleId)}`;

    try {
        const response = await fetch('data/articles.json');
        const data = await response.json();
        const articles = data.articles;
        const article = articles.find(a => a.id === articleId);

        if (!article) {
            notFoundBlock.style.display = 'block';
            return;
        }

        document.getElementById('bk-page-title').textContent = article.title + ' — Bangu Kwetu';
        document.getElementById('bk-article-cat').textContent = article.category;
        document.getElementById('bk-article-title').textContent = article.title;
        document.getElementById('bk-article-date').textContent = formatDisplayDate(article.date);
        document.getElementById('bk-article-image').src = article.image;
        document.getElementById('bk-article-image').alt = article.title;

        // SEO / social share tags — reuses the existing Excerpt field, no
        // new CMS field needed. setAttribute is safe here (not innerHTML).
        const metaDesc = article.desc || article.title;
        document.getElementById('bk-meta-description').setAttribute('content', metaDesc);
        document.getElementById('bk-og-title').setAttribute('content', article.title + ' — Bangu Kwetu');
        document.getElementById('bk-og-description').setAttribute('content', metaDesc);
        document.getElementById('bk-og-image').setAttribute('content', article.image);
        document.getElementById('bk-og-url').setAttribute('content', canonicalUrl);
        document.getElementById('bk-canonical').setAttribute('href', canonicalUrl);

        // NewsArticle structured data — helps search/AI engines identify this
        // as a news article, its headline, image, and publish date.
        const jsonLd = {
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            "headline": article.title,
            "image": [article.image],
            "datePublished": article.date,
            "dateModified": article.updated || article.date,
            "author": {
                "@type": "Organization",
                "name": "Bangu Kwetu"
            },
            "publisher": {
                "@type": "Organization",
                "name": "Bangu Kwetu"
            },
            "mainEntityOfPage": canonicalUrl
        };
        document.getElementById('bk-json-ld').textContent = JSON.stringify(jsonLd);

        const bodyEl = document.getElementById('bk-article-body');
        if (article.content) {
            renderMarkdownBody(article.content, bodyEl);
        } else {
            bodyEl.innerHTML = '';
            const p = document.createElement('p');
            p.className = 'bk-article-placeholder';
            p.textContent = 'Full story coming soon.';
            bodyEl.appendChild(p);
        }

        const shareBtn = document.getElementById('bk-share-whatsapp');
        const shareMessage = `Check out this story from Bangu Kwetu: ${article.title} ${canonicalUrl}`;
        shareBtn.href = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

        const fbBtn = document.getElementById('bk-share-fb');
        fbBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonicalUrl)}`;

        const xBtn = document.getElementById('bk-share-x');
        xBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(canonicalUrl)}`;

        const copyBtn = document.getElementById('bk-share-copy');
        const copyLabel = document.getElementById('bk-share-copy-label');
        copyBtn.addEventListener('click', async function () {
            try {
                await navigator.clipboard.writeText(canonicalUrl);
                copyLabel.textContent = 'Copied!';
                copyBtn.classList.add('bk-copied');
                setTimeout(function () {
                    copyLabel.textContent = 'Copy Link';
                    copyBtn.classList.remove('bk-copied');
                }, 2000);
            } catch (err) {
                console.error('Copy failed:', err);
            }
        });

        contentBlock.style.display = 'block';

    } catch (err) {
        console.error('Could not load article:', err);
        notFoundBlock.style.display = 'block';
    }
}

loadArticle();