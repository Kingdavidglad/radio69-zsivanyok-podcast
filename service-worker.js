/* Rádió69 × Zsiványok Podcast — lightweight PWA cache. */
'use strict';

const CACHE_NAME = 'radio69-pwa-v6-community-20261104';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/style.css?v=nav-menu-responsive-20261025-v2',
  '/mediaajanlat.html',
  '/musoraink.html',
  '/musoraink.css?v=20261102-push',
  '/musoraink.js?v=20261102-push',
  '/show-push-config.js',
  '/show-schedule.json',
  '/barter-inquiry.js',
  '/supabase-config.js',
  '/script.js',
  '/language.js',
  '/language.css',
  '/articles.js',
  '/article.js',
  '/article-community.js',
  '/article-community.css',
  '/share.js',
  '/pwa.js',
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


// Valódi Web Push üzenetek fogadása akkor is, ha az oldal nincs megnyitva.
self.addEventListener('push', (event) => {
  event.waitUntil((async () => {
    let payload = {};
    try {
      payload = event.data ? event.data.json() : {};
    } catch (_) {
      payload = { body: event.data ? event.data.text() : '' };
    }

    const title = String(payload.title || 'Rádió69 – műsorértesítő').slice(0, 120);
    const options = {
      body: String(payload.body || 'Hamarosan kezdődik a kiválasztott műsor!').slice(0, 240),
      icon: '/assets/pwa-192.png',
      badge: '/assets/pwa-192.png',
      tag: String(payload.tag || 'radio69-show-reminder').slice(0, 64),
      renotify: true,
      timestamp: Number(payload.timestamp) || Date.now(),
      data: {
        url: typeof payload.url === 'string' ? payload.url : '/musoraink.html',
        showId: typeof payload.showId === 'string' ? payload.showId : ''
      }
    };

    await self.registration.showNotification(title, options);
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    let target = new URL('/musoraink.html', self.location.origin);
    try {
      const candidate = new URL(event.notification.data?.url || '/musoraink.html', self.location.origin);
      if (candidate.origin === self.location.origin) target = candidate;
    } catch (_) {
      // A hibás vagy külső cél helyett a műsorrend nyílik meg.
    }

    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
        await client.navigate(target.href);
        return client.focus();
      }
    }
    return self.clients.openWindow(target.href);
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
  if (/\.(?:css|js|json|png|jpe?g|webp|svg|ico|woff2?|webmanifest)$/i.test(url.pathname)) {
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
