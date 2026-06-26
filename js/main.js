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
async function loadArticles() {
    const response = await fetch('data/articles.json');
    const articles = await response.json();

    const sections = ['news', 'sports', 'business'];

    sections.forEach(function(cat) {
        const grid = document.querySelector('#' + cat + ' .bk-card-grid');
        if (!grid) return;

        const filtered = articles.filter(function(a) {
            return a.category === cat;
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
    });
}

loadArticles();
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