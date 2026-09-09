const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://bangukwetu.co.ke';

// Static pages that always belong in the sitemap, with their own
// changefreq/priority. Keep this list in sync with the real pages
// in the repo root (about.html, contact.html, privacy.html, etc.)
const STATIC_PAGES = [
  { loc: '/', changefreq: 'daily', priority: '1.0' },
  { loc: '/about.html', changefreq: 'monthly', priority: '0.5' },
  { loc: '/contact.html', changefreq: 'monthly', priority: '0.5' },
  { loc: '/privacy.html', changefreq: 'yearly', priority: '0.3' },
];

function toW3cDate(dateStr) {
  const d = new Date(dateStr);
  return isNaN(d) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
}

const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'articles.json'), 'utf8');
const { articles } = JSON.parse(raw);

const validArticles = articles.filter(a => a.id && a.title && a.date);

// Static page entries
const staticEntries = STATIC_PAGES.map(p => `  <url>
    <loc>${SITE_URL}${p.loc}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`);

// Article entries — same clean-slug URL format used by functions/[slug].js,
// canonical tags, share/copy-link buttons, and generate-feed.js.
// "updated" is used when set (non-empty), otherwise falls back to "date".
const articleEntries = validArticles.map(a => {
  const url = `${SITE_URL}/${encodeURIComponent(a.id)}`;
  const lastmodSource = (a.updated && a.updated.trim()) ? a.updated : a.date;
  return `  <url>
    <loc>${url}</loc>
    <lastmod>${toW3cDate(lastmodSource)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticEntries, ...articleEntries].join('\n')}
</urlset>
`;

fs.writeFileSync(path.join(__dirname, '..', 'sitemap.xml'), sitemap);
console.log(`sitemap.xml generated with ${STATIC_PAGES.length} static pages + ${articleEntries.length} articles.`);