// ONE-TIME migration script.
// Splits the old single data/articles.json into individual files under
// content/articles/, one per article — matching the new entry-collection
// config.yml. Also normalizes dates to YYYY-MM-DD for the new datetime widget.
//
// Run once with: node scripts/migrate-to-entries.js
// Safe to re-run — it will overwrite files with the same id.

const fs = require('fs');
const path = require('path');

const SOURCE_FILE = path.join(__dirname, '..', 'data', 'articles.json');
const OUTPUT_DIR = path.join(__dirname, '..', 'content', 'articles');

function normalizeDate(value) {
  const d = new Date(value);
  if (isNaN(d)) return value;
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function slugify(id) {
  return String(id)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '');
}

function main() {
  if (!fs.existsSync(SOURCE_FILE)) {
    throw new Error(`Source file not found: ${SOURCE_FILE}`);
  }

  const raw = fs.readFileSync(SOURCE_FILE, 'utf8');
  const { articles } = JSON.parse(raw);

  if (!Array.isArray(articles)) {
    throw new Error('data/articles.json does not contain an "articles" array.');
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let count = 0;
  const seenIds = new Set();

  for (const article of articles) {
    if (!article.id) {
      console.warn('Skipping an article with no id:', article.title || '(no title)');
      continue;
    }

    const safeId = slugify(article.id);
    if (seenIds.has(safeId)) {
      throw new Error(`Duplicate id after slugifying: ${safeId}`);
    }
    seenIds.add(safeId);

    const normalized = {
      ...article,
      id: safeId,
      date: article.date ? normalizeDate(article.date) : article.date,
      updated: article.updated ? normalizeDate(article.updated) : article.updated,
    };

    const filePath = path.join(OUTPUT_DIR, `${safeId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(normalized, null, 2));
    count++;
  }

  console.log(`Migrated ${count} article(s) into ${OUTPUT_DIR}`);
  console.log('Next: run "node scripts/compile-articles.js" to rebuild data/articles.json, then verify the site still works before deleting the old flow.');
}

main();