#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'radio69zsivanyok.hu';
const EXCLUDED = /(^|\/)(?:404\.html|google[0-9a-f]+\.html|cikk-szerkeszto(?:-helyi-backup)?\.html)$/i;
const errors = [];
const warnings = [];
const htmlFiles = [];

async function walk(dir, rel = '') {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const relative = rel ? `${rel}/${entry.name}` : entry.name;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(abs, relative);
    else if (/\.html?$/i.test(entry.name) && !EXCLUDED.test(relative) && !relative.startsWith('social-previews/')) htmlFiles.push({ abs, relative });
  }
}
function hasTag(html, re) { return re.test(html); }
function existsTarget(target) {
  if (!target || target === '/') return fs.access(path.join(ROOT, 'index.html')).then(() => true).catch(() => false);
  const candidate = path.resolve(ROOT, target.replace(/^\/+/, ''));
  if (candidate !== ROOT && !candidate.startsWith(ROOT + path.sep)) return Promise.resolve(false);
  return fs.stat(candidate).then(async stat => {
    if (stat.isFile()) return true;
    if (stat.isDirectory()) return fs.access(path.join(candidate, 'index.html')).then(() => true).catch(() => false);
    return false;
  }).catch(() => fs.access(path.join(candidate, 'index.html')).then(() => true).catch(() => false));
}

await walk(ROOT);
for (const file of htmlFiles) {
  const html = await fs.readFile(file.abs, 'utf8');
  const dynamicTemplate = /^(?:cikk|article)\.html$/i.test(file.relative);
  if (!hasTag(html, /<title\b[^>]*>\s*[^<]{2,}/i)) errors.push(`${file.relative}: hiányzó vagy üres <title>`);
  if (!hasTag(html, /<meta\s+[^>]*name=["']description["'][^>]*content=["'][^"']{10,}["']/i)) warnings.push(`${file.relative}: meta description hiányzik vagy túl rövid`);
  if (!dynamicTemplate && !hasTag(html, /<link\s+[^>]*rel=["']canonical["'][^>]*href=["']https:\/\/radio69zsivanyok\.hu\//i)) errors.push(`${file.relative}: hiányzó vagy rossz canonical URL`);
  const canonical = (html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)/i) || [])[1] || '';
  const ogUrl = (html.match(/<meta\s+[^>]*property=["']og:url["'][^>]*content=["']([^"']+)/i) || [])[1] || '';
  if (/github\.io/i.test(`${canonical} ${ogUrl}`)) errors.push(`${file.relative}: régi github.io domain maradt canonical/Open Graph adatban`);
  const tagRe = /\b(?:href|src|poster)\s*=\s*(["'])(.*?)\1/gi;
  let match;
  while ((match = tagRe.exec(html)) !== null) {
    const ref = match[2].trim();
    if (!ref || /\$\{[^}]*\}/.test(ref) || /^(?:#|https?:|mailto:|tel:|javascript:|data:|blob:|\/\/)/i.test(ref)) continue;
    let url;
    try { url = new URL(ref, `https://${HOST}/${file.relative}`); } catch { continue; }
    if (url.hostname !== HOST) continue;
    const pathname = decodeURIComponent(url.pathname);
    const target = pathname.replace(/^\/+/, '') || 'index.html';
    if (!(await existsTarget(target))) warnings.push(`${file.relative}: nem található helyi hivatkozás/erőforrás: ${ref}`);
  }
}

const sitemapPath = path.join(ROOT, 'sitemap.xml');
try {
  const xml = await fs.readFile(sitemapPath, 'utf8');
  const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1].replace(/&amp;/g, '&'));
  if (!locations.length) errors.push('sitemap.xml: nincs <loc> bejegyzés');
  for (const item of locations) {
    let url;
    try { url = new URL(item); } catch { errors.push(`sitemap.xml: hibás URL: ${item}`); continue; }
    if (url.protocol !== 'https:' || url.hostname !== HOST) { errors.push(`sitemap.xml: nem kanonikus domain: ${item}`); continue; }
    const target = decodeURIComponent(url.pathname.replace(/^\/+/, '')) || 'index.html';
    if (!(await existsTarget(target))) errors.push(`sitemap.xml: hiányzó céloldal: ${item}`);
  }
  console.log(`Sitemap: ${locations.length} URL ellenőrizve.`);
} catch { errors.push('sitemap.xml: nem olvasható vagy hiányzik'); }

console.log(`HTML oldalak ellenőrizve: ${htmlFiles.length}`);
for (const warn of warnings) console.warn(`FIGYELMEZTETÉS: ${warn}`);
for (const error of errors) console.error(`HIBA: ${error}`);
if (errors.length) process.exitCode = 1;
else console.log('SEO-alapellenőrzés sikeres: kötelező metaadatok, canonical domainek és oldaltérkép rendben.');
