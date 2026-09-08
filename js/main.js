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

function parseArticleDate(isoDate) {
    return isoDate.includes('T') ? new Date(isoDate) : new Date(isoDate + 'T00:00:00');
}

function formatDisplayDate(isoDate) {
    const d = parseArticleDate(isoDate);
    if (isNaN(d)) return isoDate;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

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
    if (diffDays < 0) return formatDisplayDate(isoDate);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDisplayDate(isoDate);
}

function isFreshArticle(isoDate) {
    const d = parseArticleDate(isoDate);
    if (isNaN(d)) return false;
    const diffMs = new Date() - d;
    return diffMs >= 0 && diffMs < 24 * 60 * 60 * 1000;
}

function renderMetaLine(category, date, classPrefix) {
    const dateHtml = `<span class="${classPrefix}-date">${formatRelativeDate(date)}</span>`;
    if (!isFreshArticle(date)) return dateHtml;
    return `<span class="${classPrefix}-cat">${escapeHtml(category)}</span>`
        + `<span class="${classPrefix}-dot">|</span>`
        + dateHtml;
}

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
    } catch (e) {}
}

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

hamburgerBtn.addEventListener('click', function() {
    bkNav.classList.contains('active') ? closeNav() : openNav();
});
navClose.addEventListener('click', closeNav);
navOverlay.addEventListener('click', closeNav);

bkNav.querySelectorAll('a').forEach(function(link) {
    link.addEventListener('click', closeNav);
});

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

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

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

let allArticles = [];

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
        renderRoad2027();
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

function renderRoad2027() {
  const phases = [
    { label: "Resignations", date: "2027-02-10" },
    { label: "Primaries",    date: "2027-05-08" },
    { label: "Nominations",  date: "2027-06-11" },
    { label: "Campaign",     date: "2027-08-07" },
    { label: "Election Day", date: "2027-08-10" }
  ];
  const now = new Date();
  const start = new Date("2026-08-01");
  const end = new Date(phases[phases.length - 1].date);
  const totalSpan = end - start;
  const elapsed = Math.min(Math.max(now - start, 0), totalSpan);
  const pct = (elapsed / totalSpan) * 100;

  document.getElementById('bk-road-fill').style.width = pct + '%';

  const track = document.getElementById('bk-road-checkpoints');
  track.innerHTML = '';
  let activePhase = phases[0];

  phases.forEach((phase, i) => {
    const phaseDate = new Date(phase.date);
    const pos = ((phaseDate - start) / totalSpan) * 100;
    const isDone = now > phaseDate;
    const isActive = !isDone && (i === 0 || now > new Date(phases[i - 1].date));
    if (isActive) activePhase = phase;

    const dot = document.createElement('div');
    dot.className = 'bk-checkpoint' + (isDone ? ' done' : isActive ? ' active' : '');
    dot.style.left = pos + '%';
    track.appendChild(dot);

    const label = document.createElement('div');
    label.className = 'bk-checkpoint-label'
        + (i % 2 === 1 ? ' bk-label-low' : '')
        + (isActive ? ' bk-label-current' : '');
    label.style.left = pos + '%';
    label.textContent = phase.label;
    track.appendChild(label);
  });

  const daysLeft = Math.ceil((new Date(activePhase.date) - now) / 86400000);
  document.getElementById('bk-road-status').innerHTML =
    `<strong>${daysLeft} days</strong> until ${activePhase.label.toLowerCase()} — Kenya votes August 10, 2027`;
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

function updateStickyOffset() {
    const headerBlock = document.querySelector('.bk-header-block');
    if (headerBlock) {
        document.documentElement.style.setProperty('--bk-header-offset', headerBlock.offsetHeight + 'px');
    }
}

window.addEventListener('resize', updateStickyOffset);

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
    const secondary = cards.slice(1, 4);

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

        const cards = orderCardsForLead(cardsRaw).slice(0, 3);

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
const CATEGORY_ROW_BATCH = 6;
let categoryPageState = { category: null, page: 1, totalPages: 1, buffer: [], visibleRows: CATEGORY_ROW_BATCH };
let freshnessTimer = null;

async function fetchCategoryPage(category, page) {
    const res = await fetch(`/data/categories/${category}-${page}.json`);
    if (!res.ok) throw new Error('Category page fetch failed');
    return res.json();
}

async function filterArticles(category, reset) {
    if (reset === undefined) reset = true;
    const grid = document.getElementById('bk-main-grid');
    const label = document.getElementById('bk-active-label');
    document.querySelector('#bk-content .bk-section-head').style.display = '';
    label.textContent = category.charAt(0).toUpperCase() + category.slice(1);

    if (reset || categoryPageState.category !== category) {
        renderSkeleton(grid, 3);
        try {
            const data = await fetchCategoryPage(category, 1);
            categoryPageState = { category, page: 1, totalPages: data.totalPages, buffer: data.articles, visibleRows: CATEGORY_ROW_BATCH };
            startFreshnessPolling(category);
        } catch (err) {
            grid.innerHTML = '<p class="bk-load-error">Couldn\'t load stories — check your connection and try again.</p>';
            grid.style.display = 'block';
            return;
        }
    }

    while (categoryPageState.buffer.length < categoryPageState.visibleRows + 1 && categoryPageState.page < categoryPageState.totalPages) {
        categoryPageState.page++;
        const next = await fetchCategoryPage(category, categoryPageState.page);
        categoryPageState.buffer = categoryPageState.buffer.concat(next.articles);
    }

    const filtered = categoryPageState.buffer;
    if (filtered.length === 0) {
        grid.innerHTML = '<p class="bk-load-error">No stories in this category yet.</p>';
        grid.style.display = 'block';
        return;
    }

    const heroArticle = filtered[0];
    const remaining = filtered.slice(1);
    const rowArticles = remaining.slice(0, categoryPageState.visibleRows);
    const hasMore = remaining.length > categoryPageState.visibleRows || categoryPageState.page < categoryPageState.totalPages;

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

async function checkForNewStories(category) {
    if (!categoryPageState.buffer.length) return;
    try {
        const res = await fetch(`/data/categories/${category}-1.json`, { cache: 'no-store' });
        const data = await res.json();
        const newestKnownId = categoryPageState.buffer[0].id;
        const newestFetchedId = data.articles[0]?.id;
        if (newestFetchedId && newestFetchedId !== newestKnownId) {
            showNewStoriesPill(category);
        }
    } catch (e) {}
}

function startFreshnessPolling(category) {
    clearInterval(freshnessTimer);
    freshnessTimer = setInterval(() => checkForNewStories(category), 120000);
}

function showNewStoriesPill(category) {
    if (document.getElementById('bk-new-stories-pill')) return;
    const grid = document.getElementById('bk-main-grid');
    const pill = document.createElement('button');
    pill.id = 'bk-new-stories-pill';
    pill.className = 'bk-new-stories-pill';
    pill.textContent = '↑ New stories available — tap to refresh';
    pill.addEventListener('click', () => {
        pill.remove();
        filterArticles(category, true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    grid.parentNode.insertBefore(pill, grid);
}

function setHomepageSectionsVisible(visible) {
    const display = visible ? '' : 'none';
    document.getElementById('bk-lead-section').style.display = display;
    document.getElementById('bk-latest-section').style.display = display;
    document.getElementById('bk-shujaa-section').style.display = display;
}

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

const isHomePage = document.getElementById('bk-main-grid') !== null;

if (isHomePage) {
    loadArticles();
    loadShujaa();
}

document.querySelectorAll('.bk-cat-link').forEach(function(link) {
    link.addEventListener('click', function(e) {
        if (!isHomePage) return;
        e.preventDefault();
        const cat = link.getAttribute('data-cat');

        document.querySelectorAll('.bk-cat-link').forEach(function(l) {
            l.classList.toggle('active', l.getAttribute('data-cat') === cat);
        });

        if (cat === 'home') {
            clearInterval(freshnessTimer);
            setHomepageSectionsVisible(true);
            renderHome();
        } else {
            setHomepageSectionsVisible(false);
            filterArticles(cat);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

function isShujaaDay() {
    const day = new Date().getDay();
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
        console.error('Could not load Shujaa wa Siku:', err);
        document.getElementById('bk-shujaa-section').style.display = 'none';
    }
}

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