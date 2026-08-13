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

        const el = document.createElement(tag);
        el.innerHTML = renderInlineMarkdown(text);
        container.appendChild(el);
    });
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
}
function closeNav() {
    hamburgerBtn.classList.remove('open');
    bkNav.classList.remove('active');
    navOverlay.classList.remove('active');
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
// needs its own fetch of articles.json to have something to filter.
let allArticles = [];

async function loadArticlesForSearch() {
    try {
        const response = await fetch('data/articles.json');
        if (!response.ok) throw new Error('Network response was not ok');
        allArticles = (await response.json()).articles;
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
window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    if (currentScroll > bkLastScroll && currentScroll > 100) {
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
        document.getElementById('bk-article-date').textContent = article.date;
        document.getElementById('bk-article-image').src = article.image;
        document.getElementById('bk-article-image').alt = article.title;

        // SEO / social share tags — reuses the existing Excerpt field, no
        // new CMS field needed. setAttribute is safe here (not innerHTML).
        const metaDesc = article.desc || article.title;
        document.getElementById('bk-meta-description').setAttribute('content', metaDesc);
        document.getElementById('bk-og-title').setAttribute('content', article.title + ' — Bangu Kwetu');
        document.getElementById('bk-og-description').setAttribute('content', metaDesc);
        document.getElementById('bk-og-image').setAttribute('content', article.image);
        document.getElementById('bk-og-url').setAttribute('content', window.location.href);

        // NewsArticle structured data — helps search/AI engines identify this
        // as a news article, its headline, image, and publish date.
        const jsonLd = {
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            "headline": article.title,
            "image": [article.image],
            "datePublished": article.date,
            "author": {
                "@type": "Organization",
                "name": "Bangu Kwetu"
            },
            "publisher": {
                "@type": "Organization",
                "name": "Bangu Kwetu"
            },
            "mainEntityOfPage": window.location.href
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
        const shareMessage = `Check out this story from Bangu Kwetu: ${article.title} ${window.location.href}`;
        shareBtn.href = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

        const fbBtn = document.getElementById('bk-share-fb');
               fbBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;

                const xBtn = document.getElementById('bk-share-x');
                xBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(window.location.href)}`;

                const copyBtn = document.getElementById('bk-share-copy');
                const copyLabel = document.getElementById('bk-share-copy-label');
                copyBtn.addEventListener('click', async function () {
                    try {
                        await navigator.clipboard.writeText(window.location.href);
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