const hamburgerBtn = document.getElementById('bk-hamburger');
const bkNav = document.getElementById('bk-nav');

hamburgerBtn.addEventListener('click', function () {
    hamburgerBtn.classList.toggle('open');
    bkNav.classList.toggle('active');
});

bkNav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
        hamburgerBtn.classList.remove('open');
        bkNav.classList.remove('active');
    });
});

const searchBtn = document.getElementById('bk-search-btn');
const searchClose = document.getElementById('bk-search-close');
const searchBox = document.getElementById('bk-search-box');
const searchInput = document.getElementById('bk-search-input');

searchBtn.addEventListener('click', function () {
    searchBox.classList.add('open');
    searchBtn.style.display = 'none';
    setTimeout(function () { searchInput.focus(); }, 50);
});

searchClose.addEventListener('click', function () {
    searchBox.classList.remove('open');
    searchBtn.style.display = '';
    searchInput.value = '';
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

        const bodyEl = document.getElementById('bk-article-body');
        if (article.content) {
            bodyEl.textContent = article.content;
        } else {
            bodyEl.innerHTML = '<p class="bk-article-placeholder">Full story coming soon.</p>';
        }

        const shareBtn = document.getElementById('bk-share-whatsapp');
        const shareMessage = `Check out this story from Bangu Kwetu: ${article.title} ${window.location.href}`;
        shareBtn.href = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

        const fbBtn = document.getElementById('bk-share-fb');
               fbBtn.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;

                const xBtn = document.getElementById('bk-share-x');
                xBtn.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(window.location.href)}`;

                const copyBtn = document.getElementById('bk-share-copy');
                const copyFeedback = document.getElementById('bk-copy-feedback');
                copyBtn.addEventListener('click', async function () {
                    try {
                        await navigator.clipboard.writeText(window.location.href);
                        copyFeedback.classList.add('show');
                        setTimeout(function () { copyFeedback.classList.remove('show'); }, 2000);
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