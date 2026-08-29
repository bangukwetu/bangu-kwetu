// ── SAFETY: escape any text before inserting into innerHTML ──────
// Article fields (title, category, date) come from the CMS. This
// prevents HTML/script tags typed into a field from executing in
// visitors' browsers (XSS). Always run CMS text through this before using 
// it inside a template literal assigned to .innerHTML.
function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Converts a stored YYYY-MM-DD date into a readable display format,
// e.g. "2026-08-18" -> "August 18, 2026". Storage stays ISO (for
// reliable sorting); only the on-screen text changes.
// Parses a stored date value that may be either legacy date-only
// ("2026-08-18") or a full ISO timestamp with time and offset
// ("2026-08-25T14:30:00+03:00", once the CMS starts capturing time).
// Date-only strings get anchored to local midnight (avoids the
// UTC-midnight-vs-local off-by-one issue bare ISO dates have); full
// timestamps are trusted as-is since they carry their own offset.
function parseArticleDate(isoDate) {
    return isoDate.includes('T') ? new Date(isoDate) : new Date(isoDate + 'T00:00:00');
}

// Converts a stored date into a readable display format,
// e.g. "2026-08-18" -> "August 18, 2026". Storage stays ISO (for
// reliable sorting); only the on-screen text changes.
function formatDisplayDate(isoDate) {
    const d = parseArticleDate(isoDate);
    if (isNaN(d)) return isoDate;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── RELATIVE DATE (e.g. "3 days ago", or "40 minutes ago" once an
// article carries a real timestamp) ────────────────
// Legacy date-only articles top out at day-level precision ("Today" /
// "Yesterday" / "N days ago"). Articles with a real time component get
// minute/hour precision for same-day posts, then fall into the same
// day-tier ladder. Falls back to the full absolute date once an
// article is old enough that "N weeks ago" stops being useful.
function formatRelativeDate(isoDate) {
    const d = parseArticleDate(isoDate);
    if (isNaN(d)) return isoDate;
    const hasTime = isoDate.includes('T');
    const now = new Date();

    if (hasTime) {
        const diffMs = now - d;
        const diffMin = Math.round(diffMs / 60000);
        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
        const diffHours = Math.round(diffMin / 60);
        if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    }

    const startOfDay = function (dt) {
        return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
    };
    const diffDays = Math.round((startOfDay(now) - startOfDay(d)) / 86400000);
    if (diffDays < 0) return formatDisplayDate(isoDate); // future-dated, just show the date
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDisplayDate(isoDate);
}

// ── FRESHNESS CHECK (< 24 hours old) ───────────────
// Drives whether a list item's meta line shows "CATEGORY | time ago" or
// just "time ago" once it's no longer new. Legacy date-only articles are
// anchored to local midnight by parseArticleDate, so "Today" is treated
// as the closest available approximation of "under 24 hours".
function isFreshArticle(isoDate) {
    const d = parseArticleDate(isoDate);
    if (isNaN(d)) return false;
    const diffMs = new Date() - d;
    return diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000;
}

// ── META LINE BUILDER (category + time, or time-only once stale) ──
// Shared across every list-style section (Latest, Secondary, and the
// News/Sports/Business/Nairobi stack rows) so the 24h rule and the "|"
// separator stay identical everywhere it's used. classPrefix controls
// which CSS classes get applied (e.g. "bk-latest-row" produces
// bk-latest-row-cat / -dot / -date), so each section keeps its own
// styling hook without duplicating this logic three times.
function renderMetaLine(category, date, classPrefix) {
    const dateHtml = `<span class="${classPrefix}-date">${formatRelativeDate(date)}</span>`;
    if (!isFreshArticle(date)) return dateHtml;
    return `<span class="${classPrefix}-cat">${escapeHtml(category)}</span>`
        + `<span class="${classPrefix}-dot">|</span>`
        + dateHtml;
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
    const d = parseArticleDate(isoDate);
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
// different story that goes breaking later in the same session.
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
        // sessionStorage unavailable (e.g. private mode edge cases) —
        // banner just won't remember the dismissal, not a functional break.
    }
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

// ── 1. HAMBURGER ──────────────────────────────────
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

hamburgerBtn.addEventListener('click', function() {
    bkNav.classList.contains('active') ? closeNav() : openNav();
});
navClose.addEventListener('click', closeNav);
navOverlay.addEventListener('click', closeNav);

bkNav.querySelectorAll('a').forEach(function(link) {
    link.addEventListener('click', closeNav);
});

// ── 2. SEARCH TOGGLE ──────────────────────────────
const searchBtn     = document.getElementById('bk-search-btn');
const searchClose   = document.getElementById('bk-search-close');
const searchBox     = document.getElementById('bk-search-box');
const searchInput   = document.getElementById('bk-search-input');
const searchResults = document.getElementById('bk-search-results');

searchBtn.addEventListener('click', function() {
    searchBox.classList.add('open');
    searchBtn.style.display = 'none';
    setTimeout(function() { searchInput.focus(); }, 50);
});

searchClose.addEventListener('click', function() {
    searchBox.classList.remove('open');
    searchBtn.style.display = '';
    searchInput.value = '';
    searchResults.classList.remove('show');
    searchResults.innerHTML = '';
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        searchBox.classList.remove('open');
        searchBtn.style.display = '';
        searchInput.value = '';
        searchResults.classList.remove('show');
        searchResults.innerHTML = ''; 
        closeNav();
    }
});
// ── DEBOUNCE ─────────────────────────────────────
// Delays running fn until the user stops typing for `delay` ms —
// prevents the search filter from re-running on every single keystroke.
function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ── SEARCH FILTER ──────────────────────────────────

searchInput.addEventListener('input', debounce(function() {
    const query = searchInput.value.trim().toLowerCase();

    if (query === '') {
        searchResults.classList.remove('show');
        searchResults.innerHTML = '';
        return;
    }

    const matches = allArticles.filter(function(a) {
        return a.title.toLowerCase().includes(query) ||
               a.category.toLowerCase().includes(query); 
    });

    if (matches.length === 0) {
        searchResults.innerHTML = '<div class="bk-search-no-results">No results found</div>';
    } else {
        searchResults.innerHTML = matches.map(function(a) {
            return `<a href="/${encodeURIComponent(a.id)}" class="bk-search-result-item">${escapeHtml(a.title)}</a>`;
        }).join('');
    }

    searchResults.classList.add('show');
}, 200));

// ── 4. FETCH & RENDER ARTICLES ────────────────────
let allArticles = [];

// Renders N skeleton rows into a container while real data loads
function renderSkeleton(container, count = 3) {
    if (!container) return;
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
            <div class="skeleton-row">
                <div class="skeleton-thumb"></div>
                <div class="skeleton-lines">
                    <div class="skeleton-line"></div>
                    <div class="skeleton-line short"></div>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

async function loadArticles() {
    // Show skeletons immediately, before the fetch even starts
    renderSkeleton(document.getElementById('bk-latest-list'), 3);
    renderSkeleton(document.getElementById('bk-secondary-list'), 3);
    renderSkeleton(document.getElementById('bk-main-grid'), 3);

    try {
        const response = await fetch('/data/articles.json');
        if (!response.ok) throw new Error('Network response was not ok');
        allArticles = (await response.json()).articles;
        renderBreakingBanner();
        renderLead();
        renderLatest();
        renderHome();
        applyCategoryFromUrl();
    } catch (err) {
        console.error('Could not load articles:', err);
        const grid = document.getElementById('bk-main-grid');
        if (grid) {
            grid.innerHTML = '<p class="bk-load-error">Couldn\'t load stories — check your connection and try again.</p>';
            grid.style.display = 'block';
        }
    }
}

function getLatestArticles(articles, count) {
    return [...articles]
        .sort(function(a, b) { return new Date(b.date) - new Date(a.date); })
        .slice(0, count);
}

function getLatestBreaking(articles) {
    return [...articles]
        .filter(function(a) { return a.breaking; })
        .sort(function(a, b) { return new Date(b.date) - new Date(a.date); })[0] || null;
}

// ── BREAKING — thin text bar above the header, not a card ──
// Single story only, no rotation — if more than one article is flagged
// breaking, only the newest is shown; older breaking flags are silently
// superseded. Dismissible per-session, keyed to the article id so a new
// breaking story always gets a fresh chance to be seen even if a
// previous one was dismissed earlier in the same session.
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
        <a href="/${encodeURIComponent(breaking.id)}">
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

// Keeps #bk-cat-nav pinned directly below the header block, whether or not
// the breaking banner is currently showing. The banner's height changes
// depending on whether there's a breaking story, so a hardcoded top offset
// would cause the cat-nav to overlap the header when the banner appears.
function updateStickyOffset() {
    const headerBlock = document.querySelector('.bk-header-block');
    if (headerBlock) {
        document.documentElement.style.setProperty('--bk-header-offset', headerBlock.offsetHeight + 'px');
    }
}

window.addEventListener('resize', updateStickyOffset);

// ── LEAD — one sitewide pick, controlled ONLY by "featured". ──
// "breaking" and "featured" are fully independent, manual flags:
//   - breaking  → shows in the top banner. Nothing else. Good for alerting
//                 readers to a fast-moving story before there's enough
//                 material to justify the big hero treatment.
//   - featured  → takes the Lead slot. Nothing else.
// A story can carry both, one, or neither — it's your editorial call each
// time, not automatic. If a breaking story is ready to be the lead too,
// just tick "featured" on it yourself; the code won't do it for you, and
// it won't stop you either.
function getSitewideLead(articles) {
    const sorted = [...articles].sort(function(a, b) {
        return new Date(b.date) - new Date(a.date);
    });

    const featuredIndex = sorted.findIndex(function(a) { return a.featured; });
    if (featuredIndex > 0) {
        const featuredCard = sorted.splice(featuredIndex, 1)[0];
        sorted.unshift(featuredCard);
    }

    return sorted;
}

function renderLead() {
    const cards = getSitewideLead(allArticles);
    if (cards.length === 0) return;

    const lead = cards[0];
    const secondary = cards.slice(1, 4); // 2–3 secondary items

    const leadCard = document.getElementById('bk-lead-card');
    leadCard.href = `/${encodeURIComponent(lead.id)}`;
    document.getElementById('bk-lead-image').src = lead.image;
    document.getElementById('bk-lead-image').alt = lead.title;
    document.getElementById('bk-lead-title').textContent = lead.title;

    const secondaryList = document.getElementById('bk-secondary-list');
    secondaryList.innerHTML = secondary.map(function(a) {
        return `
        <a href="/${encodeURIComponent(a.id)}" class="bk-secondary-item">
            <div class="bk-secondary-thumb">
                <img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}" loading="lazy">
            </div>
            <div class="bk-secondary-body">
                <h4 class="bk-secondary-title">${escapeHtml(a.title)}</h4>
                <div class="bk-secondary-meta">${renderMetaLine(a.category, a.date, 'bk-secondary')}</div>
            </div>
        </a>`;
    }).join('');
}

// ── LATEST — vertical list, excludes today's lead so it doesn't repeat it ──
function renderLatest() {
    const list = document.getElementById('bk-latest-list');
    const lead = getSitewideLead(allArticles)[0];

    const pool = allArticles.filter(function(a) {
        return !lead || a.id !== lead.id;
    });
    const latest = getLatestArticles(pool, 3);

    list.innerHTML = latest.map(function(a) {
       return `
        <a href="/${encodeURIComponent(a.id)}" class="bk-latest-row">
            <div class="bk-latest-row-thumb">
                <img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}" loading="lazy">
            </div>
            <div class="bk-latest-row-body">
                <h4 class="bk-latest-row-title">${escapeHtml(a.title)}</h4>
                <div class="bk-latest-row-meta">${renderMetaLine(a.category, a.date, 'bk-latest-row')}</div>
            </div>
        </a>`;
    }).join('');
}

// ── ORDER CARDS FOR A CATEGORY GRID ────────────────
// Baseline: newest first. "featured" pins one to the front, same rule as elsewhere.
function orderCardsForLead(cards) {
    let sorted = [...cards].sort(function(a, b) {
        return new Date(b.date) - new Date(a.date);
    });

    const featuredIndex = sorted.findIndex(function(a) { return a.featured; });

    if (featuredIndex > 0) {
        const featuredCard = sorted.splice(featuredIndex, 1)[0];
        sorted.unshift(featuredCard);
    }

    return sorted;
}

// ── CATEGORY SECTIONS — plain preview grids, no per-category lead ──
function renderHome() {
    const grid = document.getElementById('bk-main-grid');
    document.querySelector('#bk-content .bk-section-head').style.display = 'none';

    const categories = ['news', 'sports', 'business', 'nairobi'];
    let html = '';

    categories.forEach(function(cat) {
        const cardsRaw = allArticles.filter(function(a) {
            return a.category === cat;
        });

        if (cardsRaw.length === 0) return;

        const cards = orderCardsForLead(cardsRaw).slice(0, 3); // always 3, matches Latest — rest live on the category page

        html += `
        <div class="bk-home-group">
            <div class="bk-section-head">
                <h3 class="bk-section-title">${cat.charAt(0).toUpperCase() + cat.slice(1)}</h3>
            </div>
            <div class="bk-stack-list">
                ${cards.map(function(a) {
                    return `
                    <a href="/${encodeURIComponent(a.id)}" class="bk-stack-row" data-category="${escapeHtml(a.category)}">
                        <div class="bk-stack-row-image">
                            <img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}" loading="lazy">
                        </div>
                        ${a.sponsored ? '<span class="bk-badge-sponsored">Sponsored</span>' : ''}
                        <h4 class="bk-stack-row-title">${escapeHtml(a.title)}</h4>
                        <div class="bk-stack-row-meta">${renderMetaLine(a.category, a.date, 'bk-stack-row')}</div>
                    </a>`;
                }).join('')}
            </div>
        </div>`;
    });

    grid.innerHTML = html;
    grid.style.display = 'block';
}

// ── CATEGORY PAGE PAGINATION ──────────────────────
// First article = hero (image + headline). Everything after = plain
// divider rows, thumbnail + text, no card box/border/shadow — matches
// the BBC-style list pattern. Same structure on mobile and desktop;
// desktop CSS arranges the rows into 2 columns via media query.
const CATEGORY_ROW_BATCH = 6;
let categoryPageState = { category: null, visibleRows: CATEGORY_ROW_BATCH };

// Single-category view (clicking a category in nav). Breaking badge removed
// here on purpose — the breaking bar at the top of the site already covers
// that story; repeating a "Breaking" tag on its card in every category grid
// it happens to belong to was redundant and looked odd once we saw it live.

function filterArticles(category, reset) {
    if (reset === undefined) reset = true;

    const grid = document.getElementById('bk-main-grid');
    const label = document.getElementById('bk-active-label');
    document.querySelector('#bk-content .bk-section-head').style.display = '';

    label.textContent = category.charAt(0).toUpperCase() + category.slice(1);

    if (reset || categoryPageState.category !== category) {
        categoryPageState = { category: category, visibleRows: CATEGORY_ROW_BATCH };
    }

    const filtered = allArticles
        .filter(function(a) { return a.category === category; })
        .sort(function(a, b) { return new Date(b.date) - new Date(a.date); });

    if (filtered.length === 0) {
        grid.innerHTML = '<p class="bk-load-error">No stories in this category yet.</p>';
        grid.style.display = 'block';
        return;
    }

    const heroArticle = filtered[0];
    const remaining = filtered.slice(1);
    const rowArticles = remaining.slice(0, categoryPageState.visibleRows);
    const hasMore = remaining.length > categoryPageState.visibleRows;

    const heroHtml = `
        <a href="/${encodeURIComponent(heroArticle.id)}" class="bk-cat-hero-link">
        <article class="bk-cat-hero" data-category="${escapeHtml(heroArticle.category)}">
            <div class="bk-cat-hero-image">
                <img src="${escapeHtml(heroArticle.image)}" alt="${escapeHtml(heroArticle.title)}" loading="lazy">
            </div>
            <div class="bk-cat-hero-body">
                ${heroArticle.sponsored ? '<span class="bk-badge-sponsored">Sponsored</span>' : ''}
                <h3 class="bk-cat-hero-title">${escapeHtml(heroArticle.title)}</h3>
                <div class="bk-cat-hero-meta">
                    <span class="bk-cat-hero-cat">${escapeHtml(heroArticle.category)}</span>
                    <span class="bk-cat-hero-dot">|</span>
                    <span class="bk-cat-hero-date">${formatRelativeDate(heroArticle.date)}</span>
                </div>
            </div>
        </article>
        </a>`;

    const rowsHtml = rowArticles.map(function(a) {
        return `
        <a href="/${encodeURIComponent(a.id)}" class="bk-cat-row-link">
        <article class="bk-cat-row" data-category="${escapeHtml(a.category)}">
            <div class="bk-cat-row-thumb"> 
                <img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}" loading="lazy">
            </div>
            <div class="bk-cat-row-body">
                ${a.sponsored ? '<span class="bk-badge-sponsored">Sponsored</span>' : ''}
                <h3 class="bk-cat-row-title">${escapeHtml(a.title)}</h3>
                <p class="bk-cat-row-date">${formatRelativeDate(a.date)}</p>
            </div>
        </article>
        </a>`;
    }).join('');

    grid.innerHTML = heroHtml
        + `<div class="bk-cat-row-list">${rowsHtml}</div>`
        + (hasMore ? '<button id="bk-load-more" class="bk-load-more-btn">Load More</button>' : '');
    grid.style.display = 'block';

    if (hasMore) {
        document.getElementById('bk-load-more').addEventListener('click', function() { 
            categoryPageState.visibleRows += CATEGORY_ROW_BATCH;
            filterArticles(category, false);
        });
    }
}

// ── SHOW/HIDE HOMEPAGE-ONLY SECTIONS ──────────────
// Lead+Secondary, Latest, and Shujaa are editorial picks for the whole site —
// they don't belong to any single category, so they only show on Home.
function setHomepageSectionsVisible(visible) {
    const display = visible ? '' : 'none';
    document.getElementById('bk-lead-section').style.display = display;
    document.getElementById('bk-latest-section').style.display = display;
    document.getElementById('bk-shujaa-section').style.display = display;
}

// ── APPLY CATEGORY FROM URL ────────────────────────
// Reads ?cat= from the URL on page load. This is what lets a category link
// clicked from article.html (or anywhere off-page) land directly on the
// right filtered category instead of always falling back to Home — index.html
// on its own has no way of knowing which category you meant to see otherwise.
function applyCategoryFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('cat');
    if (!cat || cat === 'home') return;

    document.querySelectorAll('.bk-cat-link').forEach(function (l) {
        l.classList.toggle('active', l.getAttribute('data-cat') === cat);
    });
    setHomepageSectionsVisible(false);
    filterArticles(cat);
}

// Homepage-only features (lead/latest/shujaa/category grid) only exist on index.html.
// On other pages (about/contact/privacy) these elements are absent, so we skip
// initializing them and let category links navigate normally instead of erroring.
const isHomePage = document.getElementById('bk-main-grid') !== null;

if (isHomePage) {
    loadArticles();
    loadShujaa();
}

// ── CATEGORY NAV CLICKS ───────────────────────────
// Handles both the top bar (#bk-cat-nav-inner) AND the hamburger nav (#bk-nav) —
// both use the same .bk-cat-link class + data-cat attribute, so clicking either
// keeps them in sync and highlights the matching category in both places.
document.querySelectorAll('.bk-cat-link').forEach(function(link) {
    link.addEventListener('click', function(e) {
        if (!isHomePage) return; // not on index.html — let the link navigate normally
        e.preventDefault();
        const cat = link.getAttribute('data-cat');

        document.querySelectorAll('.bk-cat-link').forEach(function(l) {
            l.classList.toggle('active', l.getAttribute('data-cat') === cat);
        });

        if (cat === 'home') {
            setHomepageSectionsVisible(true);
            renderHome();
        } else {
            setHomepageSectionsVisible(false);
            filterArticles(cat);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

// ── 5. FETCH & RENDER SHUJAA ──────────────────────
// Shujaa wa Siku is a scheduled feature — it only appears on Wednesdays and
// Fridays. Any other day, the section hides itself automatically regardless
// of what's in shujaa.json, so nothing has to be manually taken down.
function isShujaaDay() {
    const day = new Date().getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    return day === 3 || day === 5;
}

async function loadShujaa() {
    if (!isShujaaDay()) {
        document.getElementById('bk-shujaa-section').style.display = 'none';
        return;
    }

    try {
        const response = await fetch('/data/shujaa.json');
        const data = await response.json();
        const s = data.shujaa[0];

        if (!s || !s.name || !s.photo) {
            document.getElementById('bk-shujaa-section').style.display = 'none';
            return;
        }

        document.getElementById('bk-shujaa-name').textContent = s.name;
        document.getElementById('bk-shujaa-eyebrow').textContent = s.eyebrow;
        document.getElementById('bk-shujaa-desc').textContent = s.desc;
        document.getElementById('bk-shujaa-link').href = s.link;
        document.getElementById('bk-shujaa-avatar').src = s.photo;
        document.getElementById('bk-shujaa-avatar').alt = s.name;
        document.getElementById('bk-shujaa-section').style.display = '';
    } catch (err) {
        // Slow/failed network request (e.g. weak signal) used to leave the
        // empty skeleton (banner + label, no content) visible on screen —
        // now it just hides itself like the "no data" case above.
        console.error('Could not load Shujaa wa Siku:', err);
        document.getElementById('bk-shujaa-section').style.display = 'none';
    }
}

// ── WHATSAPP FLOAT — hide on scroll down, show on scroll up ──
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
