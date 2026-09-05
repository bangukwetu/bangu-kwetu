// Cloudflare Pages Function — serves article.html's content under clean
// slug URLs like /gikomba-market-redevelopment-nairobi-7000-traders,
// while keeping that URL in the address bar (no redirect, no rewrite).
//
// Deliberately NOT implemented via _redirects: Cloudflare Pages has a known
// bug where a wildcard rewrite whose destination re-matches its own source
// pattern (e.g. /:slug -> /article.html, and /article.html itself matches
// /:slug) causes an infinite internal loop (ERR_TOO_MANY_REDIRECTS).
// Pages Functions do real routing instead of reprocessed pattern-rewriting,
// so this sidesteps that bug entirely.
//
// Safety: [slug].js matches ANY single path segment. Cloudflare Pages ALSO
// automatically strips ".html" from static page URLs by default (e.g. a
// click on href="privacy.html" arrives here as a request for "/privacy",
// extension already gone) — so reserved names must be listed WITHOUT their
// extension too, or real static pages get mistaken for article slugs.

const RESERVED_NAMES = new Set([
    'article', 'article.html',
    'index', 'index.html',
    'about', 'about.html',
    'contact', 'contact.html',
    'privacy', 'privacy.html',
    '404', '404.html',
    'road-to-2027', 'road-to-2027.html',
    'admin',
    'favicon.svg',
    'manifest.json',
    'sitemap.xml',
    'robots.txt',
    'style.css',
    'feed.xml',
]);

export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);
    const slug = url.pathname.replace(/^\/+/, '').replace(/\/+$/, '');

    // Anything with a file extension (.css, .js, .json, .xml, .txt, .svg,
    // .png, .jpg, etc.) or a known reserved name (with or without its own
    // extension) is NOT an article slug — let it fall through to normal
    // static asset handling untouched.
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(slug);
    if (hasExtension || RESERVED_NAMES.has(slug) || slug === '') {
        return next();
    }

    // Genuine bare slug — serve article.html's content while keeping the
    // clean URL in the address bar. article.js reads the slug itself from
    // window.location.pathname, so no query string or redirect is needed.
    const articleAssetUrl = new URL('/article.html', url.origin);
    const response = await env.ASSETS.fetch(articleAssetUrl.toString());
    const html = await response.text();

    return new Response(html, {
        status: response.status,
        headers: response.headers,
    });
}