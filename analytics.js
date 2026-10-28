/* Rádió69 × Zsiványok Podcast — basic-consent Google Analytics 4 loader. */
(() => {
  'use strict';

  const CONSENT_KEY = 'radio69_analytics_consent_v1';
  const CONFIG_URL = '/analytics-config.json';
  const GA_ID_PATTERN = /^G-[A-Z0-9]{6,20}$/i;
  let measurementId = '';
  let banner = null;
  let googleTagStarted = false;

  const safeStorageGet = (key) => {
    try { return window.localStorage.getItem(key); } catch (_) { return null; }
  };
  const safeStorageSet = (key, value) => {
    try { window.localStorage.setItem(key, value); return true; } catch (_) { return false; }
  };

  function addStyles() {
    if (document.getElementById('radio69-analytics-styles')) return;
    const style = document.createElement('style');
    style.id = 'radio69-analytics-styles';
    style.textContent = `
      #radio69-analytics-banner{position:fixed;z-index:2147483000;left:16px;right:16px;bottom:16px;margin:0 auto;width:min(100% - 32px,1020px);box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:center;padding:20px 22px;border:1px solid rgba(167,139,250,.55);border-radius:20px;background:linear-gradient(135deg,rgba(24,18,43,.98),rgba(10,15,29,.98));box-shadow:0 18px 60px rgba(0,0,0,.48);color:#f6f3ff;font:500 14px/1.6 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;backdrop-filter:blur(18px)}
      #radio69-analytics-banner *{box-sizing:border-box}
      #radio69-analytics-banner .r69-consent-title{margin:0 0 6px;color:#fff;font-size:16px;font-weight:800;line-height:1.3}
      #radio69-analytics-banner .r69-consent-copy{margin:0;color:#d3cde6;font-size:13px;line-height:1.6}
      #radio69-analytics-banner a{color:#8be9f6;text-decoration:underline;text-underline-offset:3px}
      #radio69-analytics-banner .r69-consent-actions{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:9px;max-width:360px}
      #radio69-analytics-banner button{min-height:42px;padding:10px 13px;border-radius:11px;border:1px solid rgba(193,160,255,.5);font:800 12px/1.25 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;cursor:pointer}
      #radio69-analytics-banner .r69-consent-reject{background:transparent;color:#f6f3ff}
      #radio69-analytics-banner .r69-consent-accept{border-color:transparent;background:linear-gradient(110deg,#c1a0ff,#f39acb);color:#160e25}
      #radio69-analytics-banner button:focus-visible,#radio69-analytics-banner a:focus-visible{outline:3px solid #67e8f9;outline-offset:3px}
      .r69-analytics-settings-trigger{display:inline-flex;align-items:center;gap:8px;margin-top:12px;padding:10px 14px;border:1px solid rgba(181,138,255,.5);border-radius:11px;background:#b58aff12;color:#e7dbff;font:800 12px/1.4 system-ui,sans-serif;cursor:pointer}
      .r69-analytics-settings-trigger:hover{border-color:#67e8f9;background:#62e9f10c}
      .r69-analytics-settings-trigger:focus-visible{outline:3px solid #67e8f9;outline-offset:3px}
      @media(max-width:720px){#radio69-analytics-banner{grid-template-columns:minmax(0,1fr);gap:13px;left:10px;right:10px;bottom:10px;width:auto;padding:17px;border-radius:16px;max-height:calc(100dvh - 20px);overflow-y:auto}#radio69-analytics-banner .r69-consent-actions{max-width:none;justify-content:stretch}#radio69-analytics-banner .r69-consent-actions button{flex:1 1 130px}}
      @media(prefers-reduced-motion:reduce){#radio69-analytics-banner *{scroll-behavior:auto!important;transition:none!important}}
    `;
    document.head.appendChild(style);
  }

  function clearGoogleAnalyticsCookies() {
    try {
      const names = document.cookie.split(';').map(part => part.trim().split('=')[0]).filter(name => /^_ga(?:_|$)/.test(name));
      const host = window.location.hostname;
      for (const name of names) {
        document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
        document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${host}; SameSite=Lax`;
        if (host.includes('.')) document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${host}; SameSite=Lax`;
      }
    } catch (_) { /* Cookie access may be blocked by the browser. */ }
  }

  function loadGoogleAnalytics() {
    if (googleTagStarted || !GA_ID_PATTERN.test(measurementId)) return;
    googleTagStarted = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('consent', 'update', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      send_page_view: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.referrerPolicy = 'strict-origin-when-cross-origin';
    script.onerror = () => { googleTagStarted = false; };
    document.head.appendChild(script);
  }

  function persistChoice(choice) {
    safeStorageSet(CONSENT_KEY, choice);
    if (banner) banner.remove();
    banner = null;
    if (choice === 'granted') {
      loadGoogleAnalytics();
      return;
    }
    // A prior consent may have loaded GA already. Remove its first-party cookies
    // and reload so no further page views/events are sent after refusal/revocation.
    clearGoogleAnalyticsCookies();
    if (googleTagStarted) window.location.reload();
  }

  function showBanner() {
    if (banner) banner.remove();
    addStyles();
    banner = document.createElement('section');
    banner.id = 'radio69-analytics-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Analitikai adatkezelési beállítások');
    banner.innerHTML = `
      <div class="r69-consent-copy-wrap">
        <h2 class="r69-consent-title">Látogatottsági statisztikák</h2>
        <p class="r69-consent-copy">A Google Analytics 4 segítségével megérthetjük, mely cikkeket olvassák és honnan érkeznek a látogatók. Az analitika csak a hozzájárulásod után töltődik be. Elutasítás esetén az oldal nem küld analitikai adatot a Google-nek. <a href="/adatvedelem.html#sutik">Adatvédelmi tájékoztató</a>.</p>
      </div>
      <div class="r69-consent-actions">
        <button type="button" class="r69-consent-reject" data-r69-consent="denied">Csak szükséges</button>
        <button type="button" class="r69-consent-accept" data-r69-consent="granted">Elfogadom az analitikát</button>
      </div>`;
    banner.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-r69-consent]');
      if (!button) return;
      const choice = button.getAttribute('data-r69-consent');
      if (choice === 'granted' || choice === 'denied') persistChoice(choice);
    });
    document.body.appendChild(banner);
  }

  function setUpSettingsButton() {
    const settingsButton = document.getElementById('radio69AnalyticsSettings');
    if (!settingsButton) return;
    settingsButton.hidden = false;
    settingsButton.addEventListener('click', showBanner);
  }

  async function init() {
    // Basic-consent behavior: no Google script or request exists before a valid
    // Measurement ID is configured AND the visitor has accepted analytics.
    let config;
    try {
      const response = await fetch(CONFIG_URL, { cache: 'no-store', credentials: 'same-origin' });
      if (!response.ok) return;
      config = await response.json();
    } catch (_) {
      return; // Analytics is optional; the website continues working normally.
    }
    const rawId = String(config?.measurementId || '').trim().toUpperCase();
    if (!GA_ID_PATTERN.test(rawId)) return;
    measurementId = rawId;
    setUpSettingsButton();

    const choice = safeStorageGet(CONSENT_KEY);
    if (choice === 'granted') loadGoogleAnalytics();
    else if (choice !== 'denied') showBanner();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
