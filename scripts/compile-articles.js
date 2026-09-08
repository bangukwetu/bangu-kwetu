// Compiles all individual article files in content/articles/ into a single
// data/articles.json — same shape { "articles": [...] } that article.js,
// the homepage script, and feed.js already read. Nothing on the frontend
// needs to change; this script just replaces how the file gets built.
//
// Also writes small per-category paginated files to data/categories/
// (e.g. nairobi-1.json, nairobi-2.json) so category pages on the site
// only download a batch at a time instead of the whole archive.
//
// Run manually with: node scripts/compile-articles.js
// In CI, this is triggered automatically on push to content/articles/**
// (see .github/workflows/compile-articles.yml)

const fs = require('fs');
const path = require('path');

const ARTICLES_DIR = path.join(__dirname, '..', 'content', 'articles');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'articles.json');
const PAGE_SIZE = 10;
const CATEGORIES_DIR = path.join(__dirname, '..', 'data', 'categories');

function readArticles() {
  if (!fs.existsSync(ARTICLES_DIR)) {
    throw new Error(`Articles folder not found: ${ARTICLES_DIR}`);
  }

  const files = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.json'));

  const articles = files.map(file => {
    const filePath = path.join(ARTICLES_DIR, file);
    const raw = fs.readFileSync(filePath, 'utf8');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      throw new Error(`Invalid JSON in ${file}: ${err.message}`);
    }

    if (parsed.date) parsed.date = normalizeDate(parsed.date);
    if (parsed.updated) parsed.updated = normalizeDate(parsed.updated);

    return parsed;
  });

  const seenIds = new Set();
  for (const a of articles) {
    if (!a.id) throw new Error(`Article in a file is missing an "id" field.`);
    if (seenIds.has(a.id)) throw new Error(`Duplicate article id found: ${a.id}`);
    seenIds.add(a.id);
    if (!a.title) throw new Error(`Article "${a.id}" is missing a title.`);
    if (!a.date) throw new Error(`Article "${a.id}" is missing a date.`);
  }

  articles.sort((a, b) => new Date(b.date) - new Date(a.date));

  return articles;
}

function normalizeDate(value) {
  const d = new Date(value);
  if (isNaN(d)) return value;
  return value;
}

// Splits the already-sorted (newest-first) article list into small
// per-category page files: data/categories/<category>-<page>.json
// Each file holds up to PAGE_SIZE articles plus its page number and
// the category's total page count, so the frontend knows when to stop
// fetching more.
function writeCategoryPages(articles) {
  const byCategory = {};
  for (const a of articles) {
    const cat = (a.category || 'uncategorized').toLowerCase();
    (byCategory[cat] = byCategory[cat] || []).push(a);
  }

  fs.mkdirSync(CATEGORIES_DIR, { recursive: true });

  for (const [cat, list] of Object.entries(byCategory)) {
    const totalPages = Math.ceil(list.length / PAGE_SIZE);
    for (let page = 1; page <= totalPages; page++) {
      const slice = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      fs.writeFileSync(
        path.join(CATEGORIES_DIR, `${cat}-${page}.json`),
        JSON.stringify({ page, totalPages, articles: slice }, null, 2)
      );
    }
  }
}

function main() {
  const articles = readArticles();
  writeCategoryPages(articles);

  const output = { articles };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log(`data/articles.json compiled with ${articles.length} article(s).`);
  console.log(`Category pages written to ${CATEGORIES_DIR}`);
}

main();