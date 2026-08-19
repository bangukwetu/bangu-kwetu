// Compiles all individual article files in content/articles/ into a single
// data/articles.json — same shape { "articles": [...] } that article.js,
// the homepage script, and feed.js already read. Nothing on the frontend
// needs to change; this script just replaces how the file gets built.
//
// Run manually with: node scripts/compile-articles.js
// In CI, this is triggered automatically on push to content/articles/**
// (see .github/workflows/compile-articles.yml)

const fs = require('fs');
const path = require('path');

const ARTICLES_DIR = path.join(__dirname, '..', 'content', 'articles');
const OUTPUT_FILE = path.join(__dirname, '..', 'data', 'articles.json');

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

    // Sveltia's datetime widget outputs an ISO timestamp (e.g.
    // "2026-08-07T00:00:00.000Z") with the config in this project.
    // Normalize both date and updated down to plain YYYY-MM-DD so the
    // frontend (which just displays/sorts the string) keeps working
    // exactly as before, and old free-text dates parse the same way.
    if (parsed.date) parsed.date = normalizeDate(parsed.date);
    if (parsed.updated) parsed.updated = normalizeDate(parsed.updated);

    return parsed;
  });

  // Basic sanity checks so a bad entry fails the build loudly instead of
  // silently shipping a broken articles.json.
  const seenIds = new Set();
  for (const a of articles) {
    if (!a.id) throw new Error(`Article in a file is missing an "id" field.`);
    if (seenIds.has(a.id)) throw new Error(`Duplicate article id found: ${a.id}`);
    seenIds.add(a.id);
    if (!a.title) throw new Error(`Article "${a.id}" is missing a title.`);
    if (!a.date) throw new Error(`Article "${a.id}" is missing a date.`);
  }

  // Newest first, matching how the site and feed already expect articles.
  articles.sort((a, b) => new Date(b.date) - new Date(a.date));

  return articles;
}

function normalizeDate(value) {
  const d = new Date(value);
  if (isNaN(d)) return value; // leave untouched if unparseable, rather than corrupt it
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function main() {
  const articles = readArticles();
  const output = { articles };

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log(`data/articles.json compiled with ${articles.length} article(s).`);
}

main();