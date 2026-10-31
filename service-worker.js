/* Rádió69 × Zsiványok Podcast — lightweight PWA cache. */
'use strict';

const CACHE_NAME = 'radio69-pwa-v5-article-community-20261031';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/style.css?v=nav-menu-responsive-20261025-v2',
  '/mediaajanlat.html',
  '/barter-inquiry.js',
  '/supabase-config.js',
  '/script.js',
  '/articles.js',
  '/article.js',
  '/article-community.js?v=radio69-community-20261031',
  '/article-community.css?v=radio69-community-20261031',
  '/share.js',
  '/pwa.js',
  '/push-config.js',
  '/push-notifications.js',
  '/analytics.js?v=radio69-analytics-20261028',
  '/analytics-config.json',
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
  if (url.pathname === '/analytics-config.json') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetch(request, { cache: 'no-store' });
        if (response && response.ok && response.type === 'basic') {
          await cache.put('/analytics-config.json', response.clone());
        }
        return response;
      } catch (_) {
        return (await cache.match('/analytics-config.json')) || Response.error();
      }
    })());
    return;
  }

  // Never cache editor pages; this avoids showing a stale private/admin interface offline.
  if (url.pathname.includes('cikk-szerkeszto') || url.pathname.includes('admin-hozzaszolasok')) return;

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


// Display only user-authorized Web Push notifications.
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (_) { payload = {}; }
  const title = typeof payload.title === 'string' ? payload.title.slice(0, 90) : 'Rádió69 – új tartalom';
  const body = typeof payload.body === 'string' ? payload.body.slice(0, 160) : 'Új olvasnivaló érkezett a Rádió69-re.';
  const rawUrl = typeof payload.url === 'string' ? payload.url : '/';
  const safeUrl = (() => { try { const parsed = new URL(rawUrl, self.location.origin); return parsed.origin === self.location.origin ? parsed.href : self.location.origin + '/'; } catch (_) { return self.location.origin + '/'; } })();
  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: typeof payload.icon === 'string' ? payload.icon : '/assets/pwa-192.png',
    badge: typeof payload.badge === 'string' ? payload.badge : '/assets/favicon.png',
    tag: typeof payload.tag === 'string' ? payload.tag.slice(0, 100) : 'radio69-update',
    data: { url: safeUrl },
    renotify: false
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const rawUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
    let target = self.location.origin + '/';
    try { const parsed = new URL(rawUrl, self.location.origin); if (parsed.origin === self.location.origin) target = parsed.href; } catch (_) {}
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (client.url === target && 'focus' in client) return client.focus();
    }
    for (const client of windows) {
      if ('navigate' in client && 'focus' in client) { await client.navigate(target); return client.focus(); }
    }
    return self.clients.openWindow(target);
  })());
});
