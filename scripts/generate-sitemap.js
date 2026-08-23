// Auto-generates sitemap.xml from data/articles.json — runs via the same
// GitHub Actions workflow that already rebuilds the RSS feed on every CMS
// publish. Keeps the sitemap in sync with live content with zero manual
// editing: static pages stay fixed, article URLs are derived from the
// current article list every time this runs.

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://bangukwetu.co.ke';
const ARTICLES_PATH = path.join(__dirname, '..', 'data', 'articles.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'sitemap.xml');

// Static pages — priority/changefreq mirror what's already in the
// hand-written sitemap so behavior doesn't change for these.
const STATIC_PAGES = [
    { loc: `${SITE_URL}/`, changefreq: 'daily', priority: '1.0' },
    { loc: `${SITE_URL}/about.html`, changefreq: 'monthly', priority: '0.5' },
    { loc: `${SITE_URL}/contact.html`, changefreq: 'monthly', priority: '0.5' },
    { loc: `${SITE_URL}/privacy.html`, changefreq: 'yearly', priority: '0.3' },
];

function escapeXml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function buildUrlEntry({ loc, lastmod, changefreq, priority }) {
    let entry = '  <url>\n';
    entry += `    <loc>${escapeXml(loc)}</loc>\n`;
    if (lastmod) entry += `    <lastmod>${lastmod}</lastmod>\n`;
    entry += `    <changefreq>${changefreq}</changefreq>\n`;
    entry += `    <priority>${priority}</priority>\n`;
    entry += '  </url>';
    return entry;
}

function generateSitemap() {
    let articles = [];
    try {
        const raw = fs.readFileSync(ARTICLES_PATH, 'utf8');
        articles = JSON.parse(raw).articles || [];
    } catch (err) {
        console.error('Could not read articles.json:', err.message);
        process.exit(1);
    }

    const staticEntries = STATIC_PAGES.map(buildUrlEntry);

    // Articles get a higher priority than static pages (0.8) since they're
    // the site's core content. dateModified falls back to date, matching
    // the same pattern already used in article.js's JSON-LD. URLs use the
    // clean slug format (e.g. /gikomba-market-redevelopment-...) served by
    // functions/[slug].js, matching what canonical tags and share/copy-link
    // buttons already output.
    const articleEntries = articles.map((a) =>
        buildUrlEntry({
            loc: `${SITE_URL}/${encodeURIComponent(a.id)}`,
            lastmod: a.updated || a.date,
            changefreq: 'weekly',
            priority: '0.8',
        })
    );

    const xml =
        '<?xml version="1.0" encoding="UTF-8"?>\n' +
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
        [...staticEntries, ...articleEntries].join('\n') +
        '\n</urlset>\n';

    fs.writeFileSync(OUTPUT_PATH, xml, 'utf8');
    console.log(`sitemap.xml generated with ${STATIC_PAGES.length} static pages and ${articles.length} articles.`);
}

generateSitemap();