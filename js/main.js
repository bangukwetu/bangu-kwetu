// ── 1. HAMBURGER ──────────────────────────────────
const hamburgerBtn = document.getElementById('bk-hamburger');
const bkNav = document.getElementById('bk-nav');

hamburgerBtn.addEventListener('click', function() {
    hamburgerBtn.classList.toggle('open');
    bkNav.classList.toggle('active');
});

bkNav.querySelectorAll('a').forEach(function(link) {
    link.addEventListener('click', function() {
        hamburgerBtn.classList.remove('open');
        bkNav.classList.remove('active');
    });
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
        hamburgerBtn.classList.remove('open');
        bkNav.classList.remove('active');
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
            return `<a href="article.html?id=${a.id}" class="bk-search-result-item">${a.title}</a>`;
        }).join('');
    }

    searchResults.classList.add('show');
});

// ── 3. ACTIVE CATEGORY LINK ───────────────────────
document.querySelectorAll('.bk-cat-link').forEach(function(link) {
    link.addEventListener('click', function() {
        document.querySelectorAll('.bk-cat-link').forEach(function(l) {
            l.classList.remove('active');
        });
        link.classList.add('active');
    });
});

// ── 4. FETCH & RENDER ARTICLES ────────────────────
let allArticles = [];

async function loadArticles() {
    const response = await fetch('data/articles.json');
    allArticles = (await response.json()).articles;
    renderBreakingBanner();
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

function renderBreakingBanner() {
    const container = document.getElementById('bk-breaking-banner');
    const breaking = getLatestBreaking(allArticles);

    if (!breaking) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
    <a href="article.html?id=${breaking.id}" class="bk-breaking-card">
        <span class="bk-badge-breaking">Breaking</span>
        <div class="bk-breaking-image">
            <img src="${breaking.image}" alt="${breaking.title}">
        </div>
        <div class="bk-breaking-body">
            <span class="bk-breaking-cat">${breaking.category}</span>
            <h2 class="bk-breaking-title">${breaking.title}</h2>
            <span class="bk-breaking-date">${breaking.date}</span>
        </div>
    </a>`;
}

function renderLatest() {
    const grid = document.getElementById('bk-latest-grid');
    const nonBreaking = allArticles.filter(function(a) { return !a.breaking; });
    const latest = getLatestArticles(nonBreaking, 4);

    grid.innerHTML = latest.map(function(a) {
        return `
        <a href="article.html?id=${a.id}" class="bk-latest-item">
            <div class="bk-latest-thumb">
                <img src="${a.image}" alt="${a.title}">
            </div>
            <div class="bk-latest-body">
                <span class="bk-latest-cat">${a.category}</span>
                <h4 class="bk-latest-title">${a.title}</h4>
                <span class="bk-latest-date">${a.date}</span>
            </div>
        </a>`;
    }).join('');
}

function renderHome() {
    const grid = document.getElementById('bk-main-grid');
    document.querySelector('#bk-content .bk-section-head').style.display = 'none';

    const categories = ['news', 'sports', 'business'];
    let html = '';

    categories.forEach(function(cat) {
        const cards = allArticles.filter(function(a) {
            return a.category === cat;
        });

        if (cards.length === 0) return;

        const lead = cards[0];
        const rest = cards.slice(1);

        html += `
        <div class="bk-home-group">
            <div class="bk-section-head">
                <h3 class="bk-section-title">${cat.charAt(0).toUpperCase() + cat.slice(1)}</h3>
                <a href="#" class="bk-see-all">See all →</a>
            </div>
            <div class="bk-lead-layout">
                <a href="article.html?id=${lead.id}" class="bk-lead-card">
                    ${lead.breaking ? '<span class="bk-badge-breaking">Breaking</span>' : ''}
                    <div class="bk-lead-image">
                        <img src="${lead.image}" alt="${lead.title}">
                    </div>
                    <div class="bk-lead-body">
                        <span class="bk-lead-cat">${lead.category}</span>
                        <h3 class="bk-lead-title">${lead.title}</h3>
                        <span class="bk-lead-date">${lead.date}</span>
                    </div>
                </a>
                <div class="bk-secondary-list">
                    ${rest.map(function(a) {
                        return `
                        <a href="article.html?id=${a.id}" class="bk-secondary-item">
                            <div class="bk-secondary-thumb">
                                <img src="${a.image}" alt="${a.title}">
                            </div>
                            <div class="bk-secondary-body">
                                <h4 class="bk-secondary-title">${a.title}</h4>
                                <span class="bk-secondary-date">${a.date}</span>
                            </div>
                        </a>`;
                    }).join('')}
                </div>
            </div>
        </div>`;
    });

    grid.innerHTML = html;
    grid.style.display = 'block'
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
        <a href="article.html?id=${a.id}" class="bk-card-link">
        <article class="bk-card" data-category="${a.category}">
              ${a.breaking ? '<span class="bk-badge-breaking">Breaking</span>' : ''}
            <div class="bk-card-image">
                <img src="${a.image}" alt="${a.title}">
            </div>
            <div class="bk-card-body">
                <span class="bk-card-cat">${a.category}</span>
                <h3 class="bk-card-title">${a.title}</h3>
                <p class="bk-card-date">${a.date}</p>
            </div>
        </article>
        </a>`;
    }).join('');
    grid.style.display = 'grid';
}

loadArticles();

// ── CATEGORY NAV CLICKS ───────────────────────────
document.querySelectorAll('.bk-cat-link').forEach(function(link) {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        document.querySelectorAll('.bk-cat-link').forEach(function(l) {
            l.classList.remove('active');
        });
        link.classList.add('active');

        const cat = link.getAttribute('data-cat');
        if (cat === 'home') {
            renderHome();
        } else {
            filterArticles(cat);
        }
    });
});

// ── 5. FETCH & RENDER SHUJAA ──────────────────────
async function loadShujaa() {
    const response = await fetch('data/shujaa.json');
    const data = await response.json();
    const s = data.shujaa[0];

    document.getElementById('bk-shujaa-name').textContent = s.name;
    document.getElementById('bk-shujaa-eyebrow').textContent = s.eyebrow;
    document.getElementById('bk-shujaa-desc').textContent = s.desc;
    document.getElementById('bk-shujaa-link').href = s.link;
    document.getElementById('bk-shujaa-avatar').src = s.photo;
    document.getElementById('bk-shujaa-avatar').alt = s.name;
}

loadShujaa();

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