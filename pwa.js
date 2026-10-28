/* Rádió69 PWA: register the service worker without changing the page UI. */
(() => {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      .catch((error) => {
        // The website remains fully usable if offline support is unavailable.
        console.warn('Rádió69 offline support could not be enabled.', error);
      });
  }, { once: true });
})();
