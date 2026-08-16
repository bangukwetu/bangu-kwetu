const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://bangukwetu.co.ke';
const FEED_TITLE = 'Bangu Kwetu';
const FEED_DESC = 'Independent news covering Eastlands, Nairobi — Kariobangi North, Dandora, Embakasi North, and Outering.';
const MAX_ITEMS = 30;

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRfc822(dateStr) {
  const d = new Date(dateStr);
  return isNaN(d) ? new Date().toUTCString() : d.toUTCString();
}

const raw = fs.readFileSync(path.join(__dirname, '..', 'data', 'articles.json'), 'utf8');
const { articles } = JSON.parse(raw);

const sorted = [...articles]
  .filter(a => a.id && a.title && a.date)
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .slice(0, MAX_ITEMS);

const items = sorted.map(a => {
  const url = `${SITE_URL}/article.html?id=${encodeURIComponent(a.id)}`;
  return `    <item>
      <title>${escapeXml(a.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${toRfc822(a.date)}</pubDate>
      <category>${escapeXml(a.category)}</category>
      <description>${escapeXml(a.desc || a.title)}</description>
    </item>`;
}).join('\n');

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE_URL}</link>
    <description>${escapeXml(FEED_DESC)}</description>
    <language>en-ke</language>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

fs.writeFileSync(path.join(__dirname, '..', 'feed.xml'), feed);
console.log(`feed.xml generated with ${sorted.length} items.`);