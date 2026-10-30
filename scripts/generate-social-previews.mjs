#!/usr/bin/env node
/**
 * Generate static, Open Graph-readable article pages for GitHub Pages.
 * Meta tags are emitted into the initial HTML so social scrapers do not need to run JavaScript.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');
const OUTPUT_DIR = path.join(ROOT, 'social-previews');
const SITEMAP_FILE = path.join(ROOT, 'sitemap.xml');
const ARTICLES_DIR = path.join(ROOT, 'cikkek');
const SITE_ORIGIN = 'https://radio69zsivanyok.hu';
const FALLBACK_IMAGE = `${SITE_ORIGIN}/assets/R%C3%A1di%C3%B369.jpg`;

export function escapeHtml(value = '') {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
}

function textValue(value) {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function articleDate(value) {
  const raw = textValue(value);
  if (!raw) return '';
  const match = raw.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function safeImageUrl(value) {
  const raw = textValue(value);
  if (!raw) return FALLBACK_IMAGE;
  if (/^https:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      return parsed.protocol === 'https:' ? parsed.href : FALLBACK_IMAGE;
    } catch {
      return FALLBACK_IMAGE;
    }
  }
  if (/^assets\/[a-z0-9_./% -]+$/i.test(raw) && !raw.includes('..')) {
    return new URL(raw.split('/').map((part, index) => index === 0 ? part : encodeURIComponent(decodeURIComponentSafe(part))).join('/'), `${SITE_ORIGIN}/`).href;
  }
  return FALLBACK_IMAGE;
}

function decodeURIComponentSafe(value) {
  try { return decodeURIComponent(value); } catch { return value; }
}

function normalizeBody(value) {
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean);
  if (typeof value === 'string') return value.split(/\r?\n(?:\s*\r?\n)?/).map(textValue).filter(Boolean);
  return [];
}

function normalizeSources(value) {
  if (Array.isArray(value)) return value.filter(item => item && typeof item === 'object');
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(item => item && typeof item === 'object') : [];
    } catch { return []; }
  }
  return [];
}

export function renderSocialPreview(article, options = {}) {
  const id = textValue(article?.id);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(`Invalid article id: ${id || '(empty)'}`);

  const title = textValue(article.seo_title) || textValue(article.title) || 'Rádió69 × Zsiványok Podcast';
  const description = textValue(article.excerpt) || textValue(article.intro) || 'Olvasd a Rádió69 × Zsiványok Podcast cikkét.';
  const canonicalUrl = textValue(options.canonicalUrl) || `${SITE_ORIGIN}/cikk.html?id=${encodeURIComponent(id)}`;
  const shareUrl = `${SITE_ORIGIN}/social-previews/${encodeURIComponent(id)}/`;
  const imageUrl = safeImageUrl(article.image_url || article.image);
  const imageAlt = textValue(article.image_alt || article.imageAlt) || title;
  const category = textValue(article.category) || 'Rádió69';
  const tag = textValue(article.tag) || 'CIKK';
  const publishedAt = articleDate(article.published_at || article.publishedAt);
  const readTime = textValue(article.read_time || article.readTime) || '3 perc';
  const intro = textValue(article.intro);
  const body = normalizeBody(article.body);
  const sources = normalizeSources(article.sources);
  const sourceNote = textValue(article.source_note || article.sourceNote);
  const imageCaption = textValue(article.image_caption || article.imageCaption);

  const bodyHtml = body.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('\n');
  const sourceHtml = sources.map(source => {
    const label = textValue(source.label) || textValue(source.url);
    const href = textValue(source.url);
    let validHref = '';
    try {
      const parsed = new URL(href);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') validHref = parsed.href;
    } catch { /* invalid source URL is displayed as text only */ }
    if (!validHref) return `<li>${escapeHtml(label)}</li>`;
    return `<li><a href="${escapeHtml(validHref)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>${source.note ? ` – ${escapeHtml(textValue(source.note))}` : ''}</li>`;  }).join('\n');

  return `<!doctype html>
<html lang="hu">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#090912">
  <meta name="robots" content="noindex,follow,max-image-preview:large">
  <meta name="author" content="Rádió69 × Zsiványok Podcast">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(title)} | Rádió69 × Zsiványok Podcast</title>
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Rádió69 × Zsiványok Podcast">
  <meta property="og:locale" content="hu_HU">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:alt" content="${escapeHtml(imageAlt)}">
  <meta property="og:url" content="${escapeHtml(shareUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}">
  <link rel="icon" type="image/png" href="../../assets/favicon.png">
  <link rel="stylesheet" href="../../style.css?v=radio69-social-preview-20261028">
  <style>
    .cloud-article-body{max-width:760px;margin:0 auto;padding-bottom:60px}
    .cloud-article-body p{font-size:16px;line-height:1.9;color:#c7c3d5;margin:0 0 22px}
    .cloud-article-body .intro{font-size:19px;color:#f7f4ff;line-height:1.75}
    .cloud-source-list{padding:17px 20px;border:1px solid rgba(98,233,241,.18);border-radius:14px;background:#62e9f108;margin:30px 0;color:#b9b6ca;font-size:12px}
    .cloud-source-list h2{font-size:18px;color:#fff;margin:0 0 12px}
    .cloud-source-list li{margin:8px 0}.cloud-source-list a{color:#aeeef4;text-decoration:underline}
    .cloud-caption{font-size:11px;color:#88849b;padding:10px 15px;background:#11101b}
    .cloud-meta{font-size:10px;font-weight:800;letter-spacing:1px;color:#b89af0;margin-bottom:16px}
    .cloud-article-title{font:800 clamp(36px,5vw,62px)/1.06 var(--font-head,'Outfit',sans-serif);letter-spacing:-1.8px;margin:16px 0}
    .cloud-article-hero{margin:24px 0 35px;border:1px solid var(--line);border-radius:20px;overflow:hidden;background:#12121f}
    .cloud-article-hero img{display:block;width:100%;height:clamp(240px,45vw,510px);object-fit:cover}
    .cloud-back{display:inline-flex;margin:10px 0 30px;color:#d2bcff;font-size:12px;font-weight:800}
    .cloud-source-list ul{padding-left:20px}
  </style>
</head>
<body>
  <div class="ambient ambient-one" aria-hidden="true"></div><div class="ambient ambient-two" aria-hidden="true"></div>
  <header class="site-header page-width">
    <a class="brand" href="../../index.html" aria-label="Főoldal"><img src="../../assets/radio69-icon.png" class="brand-logo" alt="Rádió69 logó"><span class="brand-divider"></span><span class="brand-name">RÁDIÓ<span>69</span><small>× ZSIVÁNYOK</small></span></a>
    <nav class="main-nav" aria-label="Fő navigáció"><a href="../../index.html#home">Főoldal</a><a href="../../index.html#friss">Olvasnivalók</a><a href="../../index.html#radio69">Rádió69</a><a href="../../index.html#podcast">Zsiványok Podcast</a><a href="../../dj-k.html">DJ-k</a><a href="../../rendezvenyek.html">Rendezvények</a><a href="../../mediaajanlat.html">Médiaajánlat</a></nav>
    <a class="header-link" href="../../rolunk-kapcsolat.html#kapcsolat">KAPCSOLAT <span>↗</span></a>
  </header>
  <main class="page-width article-main">
    <div class="breadcrumbs"><a href="../../index.html#home">Főoldal</a><span>›</span><a href="../../index.html#friss">Olvasnivalók</a><span>›</span><span>${escapeHtml(title)}</span></div>
    <article class="longform-article">
      <header class="article-header">
        <span class="article-category-pill">${escapeHtml(tag)}</span>
        <h1 class="cloud-article-title">${escapeHtml(textValue(article.title) || title)}</h1>
        <p class="article-deck">${escapeHtml(description)}</p>
        <div class="cloud-meta">${escapeHtml(category)}${publishedAt ? ` · ${escapeHtml(publishedAt)}` : ''} · ${escapeHtml(readTime)} olvasás</div>
        <div class="article-actions cloud-share-actions"><button type="button" id="shareArticle" class="small-action">↗ <span>Megosztás</span></button></div>
      </header>
      <figure class="cloud-article-hero"><img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(imageAlt)}" loading="eager" decoding="async">${imageCaption ? `<figcaption class="cloud-caption">${escapeHtml(imageCaption)}</figcaption>` : ''}</figure>
      <div class="cloud-article-body">${intro ? `<p class="intro">${escapeHtml(intro)}</p>` : ''}${bodyHtml}${sourceNote ? `<p class="editorial-note"><span>ⓘ</span>${escapeHtml(sourceNote)}</p>` : ''}${sourceHtml ? `<section class="cloud-source-list"><h2>Források</h2><ul>${sourceHtml}</ul></section>` : ''}<a class="cloud-back" href="../../index.html#friss">← Vissza az olvasnivalókhoz</a></div>
    </article>
  </main>
  <footer class="site-footer page-width"><a class="footer-brand" href="../../index.html"><img src="../../assets/radio69-icon.png" alt=""><span>RÁDIÓ<span>69</span><small>× ZSIVÁNYOK PODCAST</small></span></a><span class="footer-middle">Zene. Történetek. Közösség.</span><a class="footer-policy-link" href="../../adatvedelem.html">Adatvédelem</a><span class="copyright">© <span id="year">2026</span> Rádió69 × Zsiványok</span></footer>
  <script>document.getElementById('year').textContent = new Date().getFullYear();</script>
  <script src="../../share.js?v=radio69-social-preview-20261028"></script>
  <script src="/analytics.js?v=radio69-analytics-20261028" defer></script>
</body>
</html>
`;
}




const SUPABASE_URL = 'https://zmejdydtgxotkscluqlo.supabase.co';

function readSupabaseConfig() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY?.trim() || '';

  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    throw new Error(
      'A GitHub Actions SUPABASE_PUBLISHABLE_KEY beállítása hiányzik vagy hibás.'
    );
  }

  const url = new URL(SUPABASE_URL);

  if (url.hostname !== 'zmejdydtgxotkscluqlo.supabase.co') {
    throw new Error('Érvénytelen Supabase URL.');
  }

    return {
    url: url.origin,
    key
  };
}


async function fetchPublishedArticles({ url, key }) {
  const query = new URLSearchParams({
    select: 'id,title,seo_title,category,tag,excerpt,image_url,image_alt,image_caption,read_time,published_at,intro,body,sources,source_note,status',
    status: 'eq.published',
    order: 'published_at.desc',
    limit: '5000'
  });
  const response = await fetch(`${url}/rest/v1/articles?${query.toString()}`, {
    headers: { apikey: key, accept: 'application/json' },
    signal: AbortSignal.timeout(25000)
  });
  const payload = await response.text();
  if (!response.ok) throw new Error(`Supabase olvasási hiba (${response.status}): ${payload.slice(0, 400)}`);
  let articles;
  try { articles = JSON.parse(payload); } catch { throw new Error('A Supabase válasza nem érvényes JSON.'); }
  if (!Array.isArray(articles)) throw new Error('A Supabase válasz nem cikklista.');
  return articles;
}


function getTagAttribute(tag, attributeName) {
  const regex = new RegExp(`(?:^|\\s)${attributeName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const match = tag.match(regex);
  return match ? (match[1] ?? match[2] ?? match[3] ?? '').trim() : '';
}

function hasNoindexDirective(html) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  return tags.some(tag => {
    const name = getTagAttribute(tag, 'name').toLowerCase();
    if (name !== 'robots' && name !== 'googlebot') return false;
    return /\bnoindex\b/i.test(getTagAttribute(tag, 'content'));
  });
}

function canonicalFromHtml(html) {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const rel = getTagAttribute(tag, 'rel').toLowerCase().split(/\s+/);
    if (rel.includes('canonical')) return getTagAttribute(tag, 'href');
  }
  return '';
}

function isCanonicalSiteUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.origin === SITE_ORIGIN && !parsed.hash;
  } catch {
    return false;
  }
}

async function getStaticArticleIds() {
  try {
    const entries = await fs.readdir(ARTICLES_DIR, { withFileTypes: true });
    return new Set(entries
      .filter(entry => entry.isFile() && /^[a-z0-9]+(?:-[a-z0-9]+)*\.html$/i.test(entry.name))
      .map(entry => entry.name.replace(/\.html$/i, '')));
  } catch (error) {
    if (error.code === 'ENOENT') return new Set();
    throw error;
  }
}

export async function buildSitemapXml(publishedArticles = [], staticArticleIds = undefined) {
  const urls = new Set();
  const publicPages = [
    { file: 'index.html', fallback: `${SITE_ORIGIN}/` },
    { file: 'a-csapat.html', fallback: `${SITE_ORIGIN}/a-csapat.html` },
    { file: 'adatvedelem.html', fallback: `${SITE_ORIGIN}/adatvedelem.html` },
    { file: 'dj-k.html', fallback: `${SITE_ORIGIN}/dj-k.html` },
    { file: 'folyamatos-fejlesztes.html', fallback: `${SITE_ORIGIN}/folyamatos-fejlesztes.html` },
    { file: 'fotogaleria.html', fallback: `${SITE_ORIGIN}/fotogaleria.html` },
    { file: 'impresszum.html', fallback: `${SITE_ORIGIN}/impresszum.html` },
    { file: 'mediaajanlat.html', fallback: `${SITE_ORIGIN}/mediaajanlat.html` },
    { file: 'rendezvenyek.html', fallback: `${SITE_ORIGIN}/rendezvenyek.html` },
    { file: 'rolunk-kapcsolat.html', fallback: `${SITE_ORIGIN}/rolunk-kapcsolat.html` }
  ];

  for (const page of publicPages) {
    try {
      const html = await fs.readFile(path.join(ROOT, page.file), 'utf8');
      if (hasNoindexDirective(html)) continue;
      const canonical = canonicalFromHtml(html) || page.fallback;
      if (isCanonicalSiteUrl(canonical)) urls.add(canonical);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  const actualStaticArticleIds = staticArticleIds || await getStaticArticleIds();
  try {
    const entries = await fs.readdir(ARTICLES_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !/^[a-z0-9]+(?:-[a-z0-9]+)*\.html$/i.test(entry.name)) continue;
      const html = await fs.readFile(path.join(ARTICLES_DIR, entry.name), 'utf8');
      if (hasNoindexDirective(html)) continue;
      const fallback = `${SITE_ORIGIN}/cikkek/${entry.name}`;
      const canonical = canonicalFromHtml(html) || fallback;
      if (isCanonicalSiteUrl(canonical)) urls.add(canonical);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  for (const article of publishedArticles) {
    const id = textValue(article?.id);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !textValue(article?.title)) continue;
    if (actualStaticArticleIds.has(id)) continue;
    urls.add(`${SITE_ORIGIN}/cikk.html?id=${encodeURIComponent(id)}`);
  }

  const xmlEscape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    [...urls].sort().map(url => `  <url><loc>${xmlEscape(url)}</loc></url>`).join('\n') +
    '\n</urlset>\n';
}

async function main() {
  const { url, key } = await readSupabaseConfig();
  const articles = await fetchPublishedArticles({ url, key });
  const validArticles = articles.filter(item => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(textValue(item?.id)) && textValue(item?.title));

  // Fail safely if RLS/config returns no rows while old generated pages exist.
  if (validArticles.length === 0) {
    try {
      const current = await fs.readdir(OUTPUT_DIR);
      if (current.some(name => name !== '.gitkeep')) throw new Error('A cikklista üres, de korábban generált oldalak vannak. A fájlokat nem törlöm automatikusan; ellenőrizd a Supabase-hozzáférést.');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  const staticArticleIds = await getStaticArticleIds();
  const nextDir = `${OUTPUT_DIR}.next`;
  await fs.rm(nextDir, { recursive: true, force: true });
  await fs.mkdir(nextDir, { recursive: true });
  let generated = 0;
  for (const article of validArticles) {
    
const id = textValue(article.id);
const articleDir = path.join(nextDir, id);
await fs.mkdir(articleDir, { recursive: true });

// codeql[js/http-to-file-access] Intentional static HTML generation. Article IDs are validated, HTML content is escaped, and output is restricted to social-previews.
await fs.writeFile(path.join(articleDir, 'index.html'), renderSocialPreview(article), 'utf8');

// codeql[js/http-to-file-access] Safe intentional static-page generation: article IDs are validated, HTML values are escaped, and output is restricted to the social-previews directory.
await fs.writeFile(path.join(articleDir, 'index.html'), renderSocialPreview(article), 'utf8');    generated += 1;
  }

  await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
  await fs.rename(nextDir, OUTPUT_DIR);
  const sitemapXml = await buildSitemapXml(validArticles, staticArticleIds);
  await fs.writeFile(SITEMAP_FILE, sitemapXml, 'utf8');
  console.log(`Kész: ${generated} publikált cikk megosztási előnézete frissült.`);
  console.log(`Kész: ${sitemapXml.match(/<url>/g)?.length || 0} indexelhető URL került a sitemap.xml fájlba.`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath && pathToFileURL(invokedPath).href === import.meta.url) {
  main().catch(error => {
    console.error(`Hiba a megosztási előnézetek előállításakor: ${error.message}`);
    process.exitCode = 1;
  });
}
