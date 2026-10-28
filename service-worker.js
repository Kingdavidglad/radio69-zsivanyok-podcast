/* Rádió69 × Zsiványok Podcast — lightweight PWA cache. */
'use strict';

const CACHE_NAME = 'radio69-pwa-v1-20261028';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/style.css?v=nav-menu-responsive-20261025-v2',
  '/script.js',
  '/articles.js',
  '/article.js',
  '/share.js',
  '/pwa.js',
  '/assets/favicon.png',
  '/assets/pwa-192.png',
  '/assets/pwa-512.png',
  '/assets/pwa-maskable-512.png',
  '/assets/apple-touch-icon.png',
  '/assets/radio69-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache entries individually so one optional file cannot fail installation.
    await Promise.all(APP_SHELL.map(async (url) => {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response.ok && response.type === 'basic') await cache.put(url, response);
      } catch (_) {
        // Network may be unavailable during install; installation can still proceed.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((key) => key.startsWith('radio69-pwa-') && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Never cache editor pages; this avoids showing a stale private/admin interface offline.
  if (url.pathname.includes('cikk-szerkeszto')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          await cache.put(request, response.clone());
        }
        return response;
      } catch (_) {
        return (await cache.match(request)) || (await cache.match('/index.html')) || Response.error();
      }
    })());
    return;
  }

  // Cache only ordinary static assets; let Supabase and other dynamic requests use the network.
  if (/\.(?:css|js|png|jpe?g|webp|svg|ico|woff2?|webmanifest)$/i.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      const update = fetch(request).then(async (response) => {
        if (response && response.ok && response.type === 'basic') {
          await cache.put(request, response.clone());
        }
        return response;
      }).catch(() => cached);
      return cached || (await update) || Response.error();
    })());
  }
});
