// ── SAFETY: escape any text before inserting into innerHTML ──────
// Article fields (title, category, date) come from the CMS. If a
// second publisher is ever added, this stops anyone from typing
// HTML/script tags into a field and having them run in visitors'
// browsers. Always run CMS text through this before using it inside
// a template literal that gets assigned to .innerHTML.
function escapeHtml(str) {
    if (str === undefined || str === null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ── 1. HAMBURGER ──────────────────────────────────
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

// ── SEARCH FILTER ──────────────────────────────────
searchInput.addEventListener('input', function() {
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
            return `<a href="article.html?id=${encodeURIComponent(a.id)}" class="bk-search-result-item">${escapeHtml(a.title)}</a>`;
        }).join('');
    }

    searchResults.classList.add('show');
});

// ── 4. FETCH & RENDER ARTICLES ────────────────────
let allArticles = [];

async function loadArticles() {
    const response = await fetch('data/articles.json');
    allArticles = (await response.json()).articles;
    renderBreakingBanner();
    renderLead();
    renderLatest();
    renderHome();
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
function renderBreakingBanner() {
    const container = document.getElementById('bk-breaking-banner');
    const breaking = getLatestBreaking(allArticles);

    if (!breaking) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    container.style.display = 'flex';
    container.innerHTML = `
        <span class="bk-breaking-label">Breaking</span>
        <a href="article.html?id=${encodeURIComponent(breaking.id)}">${escapeHtml(breaking.title)}</a>
    `;
}

// ── LEAD — one sitewide pick, "featured" overrides date order same as "breaking" does ──
function getSitewideLead(articles) {
    const pool = articles.filter(function(a) { return !a.breaking; });
    const sorted = [...pool].sort(function(a, b) {
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
    leadCard.href = `article.html?id=${lead.id}`;
    document.getElementById('bk-lead-image').src = lead.image;
    document.getElementById('bk-lead-image').alt = lead.title;
    document.getElementById('bk-lead-cat').textContent = lead.category;
    document.getElementById('bk-lead-title').textContent = lead.title;
    document.getElementById('bk-lead-date').textContent = lead.date;

    const secondaryList = document.getElementById('bk-secondary-list');
    secondaryList.innerHTML = secondary.map(function(a) {
        return `
        <a href="article.html?id=${encodeURIComponent(a.id)}" class="bk-secondary-item">
            <div class="bk-secondary-thumb">
                <img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}">
            </div>
            <div class="bk-secondary-body">
                <h4 class="bk-secondary-title">${escapeHtml(a.title)}</h4>
                <span class="bk-secondary-date">${escapeHtml(a.date)}</span>
            </div>
        </a>`;
    }).join('');
}

// ── LATEST — vertical list, excludes today's lead + breaking so it doesn't repeat them ──
function renderLatest() {
    const list = document.getElementById('bk-latest-list');
    const lead = getSitewideLead(allArticles)[0];

    const pool = allArticles.filter(function(a) {
        return !a.breaking && (!lead || a.id !== lead.id);
    });
    const latest = getLatestArticles(pool, 3);

    list.innerHTML = latest.map(function(a, index) {
        const isNew = index < 2; // steel-blue edge on the 2 newest rows only
        return `
        <a href="article.html?id=${encodeURIComponent(a.id)}" class="bk-latest-row${isNew ? ' bk-is-new' : ''}">
            <div class="bk-latest-row-thumb">
                <img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}">
            </div>
            <div class="bk-latest-row-body">
                <h4 class="bk-latest-row-title">${escapeHtml(a.title)}</h4>
                <span class="bk-latest-row-date">${escapeHtml(a.date)}</span>
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

        const cards = orderCardsForLead(cardsRaw).slice(0, 4); // preview only, "See all" links to full category

        html += `
        <div class="bk-home-group">
            <div class="bk-section-head">
                <h3 class="bk-section-title">${cat.charAt(0).toUpperCase() + cat.slice(1)}</h3>
            </div>
            <div class="bk-card-grid">
                ${cards.map(function(a) {
                    return `
                    <a href="article.html?id=${encodeURIComponent(a.id)}" class="bk-card-link">
                    <article class="bk-card" data-category="${escapeHtml(a.category)}">
                        <div class="bk-card-image">
                            <img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}">
                        </div>
                        <div class="bk-card-body">
                            ${a.sponsored ? '<span class="bk-badge-sponsored">Sponsored</span>' : ''}
                            <span class="bk-card-cat">${escapeHtml(a.category)}</span>
                            <h3 class="bk-card-title">${escapeHtml(a.title)}</h3>
                            <p class="bk-card-date">${escapeHtml(a.date)}</p>
                        </div>
                    </article>
                    </a>`;
                }).join('')}
            </div>
        </div>`;
    });

    grid.innerHTML = html;
    grid.style.display = 'block';
}

function filterArticles(category) {
    const grid = document.getElementById('bk-main-grid');
    const label = document.getElementById('bk-active-label');
    document.querySelector('#bk-content .bk-section-head').style.display = '';

    label.textContent = category.charAt(0).toUpperCase() + category.slice(1);

    const filtered = allArticles.filter(function(a) {
        return a.category === category;
    });

    grid.innerHTML = filtered.map(function(a) {
        return `
        <a href="article.html?id=${encodeURIComponent(a.id)}" class="bk-card-link">
        <article class="bk-card" data-category="${escapeHtml(a.category)}">
              ${a.breaking ? '<span class="bk-badge-breaking">Breaking</span>' : ''}
            <div class="bk-card-image">
                <img src="${escapeHtml(a.image)}" alt="${escapeHtml(a.title)}">
            </div>
            <div class="bk-card-body">
                ${a.sponsored ? '<span class="bk-badge-sponsored">Sponsored</span>' : ''}
                <span class="bk-card-cat">${escapeHtml(a.category)}</span>
                <h3 class="bk-card-title">${escapeHtml(a.title)}</h3>
                <p class="bk-card-date">${escapeHtml(a.date)}</p>
            </div>
        </article>
        </a>`;
    }).join('');
    grid.style.display = 'grid';
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
    });
});

// ── 5. FETCH & RENDER SHUJAA ──────────────────────
async function loadShujaa() {
    const response = await fetch('data/shujaa.json');
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
}

// WhatsApp button hide-on-scroll-down
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