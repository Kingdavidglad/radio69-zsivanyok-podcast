/* Rádió69 műsorértesítések – önálló push-regisztráció.
   Külön scope-ot használ, ezért nem módosítja a weboldal meglévő push-feliratkozásait. */
'use strict';

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', event => {
  event.waitUntil((async () => {
    let payload = {};
    try {
      payload = event.data ? event.data.json() : {};
    } catch (_) {
      payload = { body: event.data ? event.data.text() : '' };
    }

    const title = String(payload.title || 'Rádió69 – műsorértesítő').slice(0, 120);
    const body = String(payload.body || 'Hamarosan kezdődik a kiválasztott műsor!').slice(0, 240);
    const candidateUrl = typeof payload.url === 'string' ? payload.url : '/musoraink.html';
    let safeUrl = self.location.origin + '/musoraink.html';

    try {
      const parsed = new URL(candidateUrl, self.location.origin);
      if (parsed.origin === self.location.origin) safeUrl = parsed.href;
    } catch (_) {
      // Hibás vagy külső cél helyett a műsorrend nyílik meg.
    }

    await self.registration.showNotification(title, {
      body,
      icon: '/assets/pwa-192.png',
      badge: '/assets/pwa-192.png',
      tag: String(payload.tag || 'radio69-show-reminder').slice(0, 64),
      renotify: false,
      timestamp: Number(payload.timestamp) || Date.now(),
      data: { url: safeUrl, showId: typeof payload.showId === 'string' ? payload.showId : '' }
    });
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    let target = self.location.origin + '/musoraink.html';
    try {
      const candidate = new URL(event.notification.data?.url || '/musoraink.html', self.location.origin);
      if (candidate.origin === self.location.origin) target = candidate.href;
    } catch (_) {
      // Marad az alapértelmezett műsorrend-oldal.
    }

    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
        if ('navigate' in client) await client.navigate(target);
        return client.focus();
      }
    }
    return self.clients.openWindow(target);
  })());
});
