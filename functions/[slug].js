//
// Safety: [slug].js matches ANY single path segment, including about.html,
// contact.html, sitemap.xml, etc. We must only treat genuine bare slugs
// (no file extension) as articles, and let everything else fall through
// to normal static asset serving via context.next().

const RESERVED_NAMES = new Set([
    'article', 'article.html',
    'index', 'index.html',
    'about.html',
    'contact.html',
    'privacy.html',
    '404.html',
    'favicon.svg',
    'manifest.json',
    'sitemap.xml',
    'robots.txt',
    'style.css',
]);

export async function onRequest(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);
    const slug = url.pathname.replace(/^\/+/, '');

    // Anything with a file extension (.html, .css, .js, .json, .xml, .txt,
    // .svg, .png, .jpg, etc.) or a known reserved name is NOT an article
    // slug — let it fall through to normal static asset handling untouched.
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