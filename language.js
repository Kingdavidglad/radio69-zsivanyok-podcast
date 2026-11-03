/* Rádió69 kétnyelvű felület – magyar/angol automatikus fordítás Google Fordítóval. */
(() => {
  'use strict';
  const COOKIE_NAME = 'googtrans';
  const SOURCE_LANG = 'hu';
  const TARGET_LANGS = ['hu', 'en'];
  const readLanguage = () => {
    const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
    if (!match) return 'hu';
    try {
      const value = decodeURIComponent(match[1]);
      const target = value.split('/').filter(Boolean).pop();
      return TARGET_LANGS.includes(target) ? target : 'hu';
    } catch (_) { return 'hu'; }
  };
  const setLanguageCookie = language => {
    const value = language === 'en' ? '/hu/en' : '/hu/hu';
    const secure = location.protocol === 'https:' ? '; Secure; SameSite=Lax' : '; SameSite=Lax';
    document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=31536000${secure}`;
  };

  function addLanguageControl() {
    const header = document.querySelector('header.site-header') || document.querySelector('body > header');
    if (!header || document.querySelector('.r69-language-switcher')) return;

    const wrap = document.createElement('div');
    wrap.className = 'r69-language-switcher';
    wrap.innerHTML = `
      <span class="r69-language-icon" aria-hidden="true">🌐</span>
      <label class="r69-sr-only" for="r69-language-select">Website language</label>
      <select id="r69-language-select" aria-label="Weboldal nyelve">
        <option value="hu">🇭🇺 Magyar</option>
        <option value="en">🇬🇧 English</option>
      </select>
      <span class="r69-translate-credit">Google Translate</span>`;
    header.appendChild(wrap);

    const select = wrap.querySelector('select');
    select.value = readLanguage();
    select.addEventListener('change', () => {
      const next = select.value;
      if (!TARGET_LANGS.includes(next)) return;
      setLanguageCookie(next);
      location.reload();
    });
  }

  function initGoogleTranslate() {
    if (document.getElementById('google_translate_element')) return;
    const mount = document.createElement('div');
    mount.id = 'google_translate_element';
    mount.setAttribute('aria-hidden', 'true');
    mount.style.cssText = 'position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;';
    document.body.appendChild(mount);

    window.googleTranslateElementInit = () => {
      if (!window.google?.translate?.TranslateElement) return;
      new window.google.translate.TranslateElement({
        pageLanguage: SOURCE_LANG,
        includedLanguages: TARGET_LANGS.join(','),
        autoDisplay: false,
        multilanguagePage: true
      }, 'google_translate_element');
      const combo = document.querySelector('.goog-te-combo');
      if (combo && readLanguage() === 'en' && combo.value !== 'en') {
        combo.value = 'en';
        combo.dispatchEvent(new Event('change'));
      }
    };
    const script = document.createElement('script');
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.onerror = () => console.warn('A Google Fordító jelenleg nem tölthető be.');
    document.head.appendChild(script);
  }

  function applyLanguageMetadata() {
    const lang = readLanguage();
    document.documentElement.lang = lang === 'en' ? 'en' : 'hu';
    document.documentElement.dataset.siteLanguage = lang;
  }

  function start() {
    addLanguageControl();
    applyLanguageMetadata();
    initGoogleTranslate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
