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
const searchBtn   = document.getElementById('bk-search-btn');
const searchClose = document.getElementById('bk-search-close');
const searchBox   = document.getElementById('bk-search-box');
const searchInput = document.getElementById('bk-search-input');

searchBtn.addEventListener('click', function() {
    searchBox.classList.add('open');
    searchBtn.style.display = 'none';
    setTimeout(function() { searchInput.focus(); }, 50);
});

searchClose.addEventListener('click', function() {
    searchBox.classList.remove('open');
    searchBtn.style.display = '';
    searchInput.value = '';
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        searchBox.classList.remove('open');
        searchBtn.style.display = '';
        searchInput.value = '';
        hamburgerBtn.classList.remove('open');
        bkNav.classList.remove('active');
    }
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
    allArticles = await response.json();
    renderHome();
}

function renderHome() {
    const grid = document.getElementById('bk-main-grid');
    const label = document.getElementById('bk-active-label');
    document.querySelector('#bk-content .bk-section-head').style.display = 'none';

    const categories = ['news', 'sports', 'business'];
    let html = '';

    categories.forEach(function(cat) {
        const cards = allArticles.filter(function(a) {
            return a.category === cat;
        });

        html += `
        <div class="bk-home-group">
            <div class="bk-section-head">
                <h3 class="bk-section-title">${cat.charAt(0).toUpperCase() + cat.slice(1)}</h3>
                <a href="#" class="bk-see-all">See all →</a>
            </div>
            <div class="bk-card-grid">
                ${cards.map(function(a) {
                    return `
                    <article class="bk-card" data-category="${a.category}">
                        <div class="bk-card-image">
                            <img src="${a.image}" alt="${a.title}">
                        </div>
                        <div class="bk-card-body">
                            <span class="bk-card-cat">${a.category}</span>
                            <h3 class="bk-card-title">${a.title}</h3>
                            <p class="bk-card-date">${a.date}</p>
                        </div>
                    </article>`;
                }).join('')}
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
        <article class="bk-card" data-category="${a.category}">
            <div class="bk-card-image">
                <img src="${a.image}" alt="${a.title}">
            </div>
            <div class="bk-card-body">
                <span class="bk-card-cat">${a.category}</span>
                <h3 class="bk-card-title">${a.title}</h3>
                <p class="bk-card-date">${a.date}</p>
            </div>
        </article>`;
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
    const s = await response.json();

    document.getElementById('bk-shujaa-name').textContent = s.name;
    document.getElementById('bk-shujaa-eyebrow').textContent = s.eyebrow;
    document.getElementById('bk-shujaa-desc').textContent = s.desc;
    document.getElementById('bk-shujaa-link').href = s.link;
    document.getElementById('bk-shujaa-avatar').textContent = s.avatar;
}

loadShujaa();