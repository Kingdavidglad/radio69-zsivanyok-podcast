/* Rádió69 Web Push subscription UI. Permission is requested only after a button click. */
(() => {
  'use strict';
  const buttonSelector = '[data-radio69-push-button]';
  const statusSelector = '[data-radio69-push-status]';
  const siteOrigin = 'https://radio69zsivanyok.hu';
  let busy = false;

  const buttons = () => [...document.querySelectorAll(buttonSelector)];
  const statusNodes = () => [...document.querySelectorAll(statusSelector)];
  function status(message, isError = false) {
    statusNodes().forEach(node => {
      node.hidden = !message;
      node.textContent = message;
      node.classList.toggle('is-error', Boolean(isError));
    });
  }
  function setButtons(label, disabled = false) {
    buttons().forEach(button => {
      button.textContent = label;
      button.disabled = disabled || busy;
      button.setAttribute('aria-busy', String(busy));
    });
  }
  function base64UrlToBytes(value) {
    const padding = '='.repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    return Uint8Array.from(raw, char => char.charCodeAt(0));
  }
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error('A Supabase kliensbeállítása nem tölthető be.'));
      document.head.appendChild(script);
    });
  }
  async function getConfig() {
    if (!window.RADIO69_SUPABASE_CONFIG) await loadScript('/supabase-config.js');
    const cfg = window.RADIO69_SUPABASE_CONFIG || {};
    if (!/^https:\/\/.+\.supabase\.co$/.test(cfg.url || '') || !cfg.publishableKey) {
      throw new Error('A Supabase nyilvános kliensbeállítása hiányzik.');
    }
    return cfg;
  }
  async function callSubscriptionApi(action, value) {
    const cfg = await getConfig();
    const response = await fetch(`${cfg.url}/functions/v1/manage-push-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: cfg.publishableKey,
        Authorization: `Bearer ${cfg.publishableKey}`
      },
      body: JSON.stringify(action === 'subscribe'
        ? { action, subscription: value }
        : { action, endpoint: value })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success !== true) {
      throw new Error(data.error || 'A feliratkozás mentése nem sikerült.');
    }
    return data;
  }
  async function getRegistration() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      throw new Error('Ez a böngésző nem támogatja a webes értesítéseket.');
    }
    await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
    return navigator.serviceWorker.ready;
  }
  async function refreshState() {
    if (!buttons().length) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setButtons('Értesítések nem támogatottak', true);
      return;
    }
    if (Notification.permission === 'denied') {
      setButtons('Értesítések letiltva a böngészőben', true);
      return;
    }
    try {
      const registration = await getRegistration();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) setButtons('🔕 Értesítések kikapcsolása');
      else setButtons('🔔 Értesítések bekapcsolása');
    } catch (error) {
      setButtons('Értesítések beállítása', false);
      status(error.message || 'Az értesítési funkció most nem érhető el.', true);
    }
  }
  async function toggleNotifications() {
    if (busy) return;
    busy = true;
    setButtons('Feldolgozás…', true);
    status('Az értesítések beállítása folyamatban…');
    try {
      const registration = await getRegistration();
      const current = await registration.pushManager.getSubscription();
      if (current) {
        await callSubscriptionApi('unsubscribe', current.endpoint);
        await current.unsubscribe();
        status('Kikapcsoltad a Rádió69 böngészős értesítéseit.');
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          if (permission === 'denied') {
            throw new Error('A böngészőben letiltottad az értesítéseket. A webhelyengedélyeknél tudod újra engedélyezni.');
          }
          throw new Error('Az értesítési engedélyt nem adtad meg.');
        }
        const pushConfig = window.RADIO69_PUSH_CONFIG || {};
        if (!pushConfig.vapidPublicKey) throw new Error('A nyilvános VAPID-kulcs beállítása hiányzik.');
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64UrlToBytes(pushConfig.vapidPublicKey)
        });
        try {
          await callSubscriptionApi('subscribe', subscription.toJSON());
        } catch (error) {
          await subscription.unsubscribe().catch(() => {});
          throw error;
        }
        status('Sikeresen feliratkoztál! Értesítést küldünk, amikor új cikk jelenik meg a Rádió69-en.');
      }
    } catch (error) {
      status(error.message || 'Nem sikerült módosítani az értesítési beállítást.', true);
    } finally {
      busy = false;
      buttons().forEach(button => button.removeAttribute('aria-busy'));
      await refreshState();
      buttons().forEach(button => { button.disabled = typeof Notification !== 'undefined' && Notification.permission === 'denied'; });
    }
  }

  function addFooterButtonIfMissing() {
    if (buttons().length) return;
    const footer = document.querySelector('.site-footer, .footer');
    if (!footer) return;
    const wrap = document.createElement('div');
    wrap.className = 'radio69-push-footer';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'small-action';
    button.dataset.radio69PushButton = '';
    button.textContent = '🔔 Értesítések bekapcsolása';
    const live = document.createElement('span');
    live.className = 'radio69-push-status';
    live.dataset.radio69PushStatus = '';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.hidden = true;
    wrap.append(button, live);
    footer.appendChild(wrap);
  }
  function init() {
    addFooterButtonIfMissing();
    buttons().forEach(button => button.addEventListener('click', toggleNotifications));
    const style = document.createElement('style');
    style.textContent = '.radio69-push-status{display:block;margin-top:8px;color:#a7f3d0;font-size:11px;line-height:1.55}.radio69-push-status.is-error{color:#fda4af}.radio69-push-status[hidden]{display:none}.radio69-push-footer{display:flex;flex-direction:column;align-items:flex-start;gap:4px;margin:10px 0}.radio69-push-footer button{font:inherit;cursor:pointer}button[data-radio69-push-button]:disabled{opacity:.58;cursor:not-allowed}';
    document.head.appendChild(style);
    refreshState();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
