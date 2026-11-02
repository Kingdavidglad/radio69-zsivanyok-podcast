/* Rádió69 – heti műsorrend és eszközönkénti push értesítések. */
(() => {
  'use strict';

  const scheduleGrid = document.getElementById('scheduleGrid');
  if (!scheduleGrid) return;

  const statusNode = document.getElementById('pushStatus');
  const selectedCountNode = document.getElementById('selectedCount');
  const clearButton = document.getElementById('clearNotifications');
  const streamsNode = document.getElementById('continuousStreams');
  const STORAGE_KEY = 'radio69-show-push-selection-v1';
  const TZ = 'Europe/Budapest';
  const pushConfig = window.RADIO69_SHOW_PUSH_CONFIG || {};
  const supabaseConfig = window.RADIO69_SUPABASE_CONFIG || {};
  const functionBase = /^https:\/\/.+\.supabase\.co$/.test(supabaseConfig.url || '')
    ? `${supabaseConfig.url.replace(/\/$/, '')}/functions/v1`
    : '';
  const publishableKey = String(supabaseConfig.publishableKey || '');
  let scheduleData = null;
  let currentSubscription = null;
  let serviceWorkerRegistration = null;
  let selectedShowIds = new Set(readLocalSelection());
  let busyShowIds = new Set();

  function readLocalSelection() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
    } catch (_) {
      return [];
    }
  }

  function saveLocalSelection() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selectedShowIds)));
    } catch (_) {
      // A local-storage restriction must not prevent the schedule from rendering.
    }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function setStatus(message, state = 'info') {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.dataset.state = state;
  }

  function updateSelectionUi() {
    const count = selectedShowIds.size;
    if (selectedCountNode) {
      selectedCountNode.textContent = `${count} kiválasztott ${count === 1 ? 'műsor' : 'műsor'}`;
    }
    if (clearButton) clearButton.hidden = count === 0 && !currentSubscription;
    scheduleGrid.querySelectorAll('[data-toggle-show]').forEach(button => {
      const isSelected = selectedShowIds.has(button.dataset.toggleShow);
      button.setAttribute('aria-pressed', String(isSelected));
      button.classList.toggle('is-selected', isSelected);
      button.disabled = busyShowIds.has(button.dataset.toggleShow);
      button.innerHTML = isSelected
        ? '<span class="bell" aria-hidden="true">✓</span> Értesítés aktív'
        : '<span class="bell" aria-hidden="true">♧</span> Értesítést kérek';
    });
  }

  function seasonIsActive(season, date = new Date()) {
    if (!season) return true;
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ, month: '2-digit', day: '2-digit'
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const monthDay = `${values.month}-${values.day}`;
    return season.start <= season.end
      ? monthDay >= season.start && monthDay <= season.end
      : monthDay >= season.start || monthDay <= season.end;
  }

  function renderSchedule(data) {
    const shows = data.shows || {};
    scheduleGrid.innerHTML = (data.days || []).map(day => {
      const entries = (day.entries || []).map(entry => {
        const show = shows[entry.showId];
        if (!show) return '';
        const notes = [show.host ? `Műsorvezető: ${show.host}` : '', show.description || ''].filter(Boolean);
        const badges = [];
        if (entry.repeat) badges.push('<span class="schedule-entry-badge repeat">Ismétlés</span>');
        if (show.season) badges.push(`<span class="schedule-entry-badge season">Szezonális · ${escapeHtml(show.season.label || '')}</span>`);
        const activeSeason = seasonIsActive(show.season);
        const seasonHint = show.season && !activeSeason ? 'Jelenleg szezonon kívül' : '';
        if (seasonHint) notes.push(seasonHint);
        const isSelected = selectedShowIds.has(entry.showId);
        const isBusy = busyShowIds.has(entry.showId);
        const buttonText = isSelected
          ? '<span class="bell" aria-hidden="true">✓</span> Értesítés aktív'
          : '<span class="bell" aria-hidden="true">♧</span> Értesítést kérek';
        return `
          <li class="schedule-entry" id="${escapeHtml(`${day.name}-${entry.time}-${entry.showId}`.toLowerCase().replace(/[^a-z0-9áéíóöőúüű-]/g, '-'))}">
            <time class="schedule-entry-time">${escapeHtml(entry.time)}</time>
            <div class="schedule-entry-copy">
              <strong>${escapeHtml(show.title)}</strong>
              ${notes.length ? `<small>${escapeHtml(notes.join(' · '))}</small>` : ''}
              ${badges.length ? `<div class="schedule-entry-badges">${badges.join('')}</div>` : ''}
            </div>
            <button class="schedule-reminder-toggle${isSelected ? ' is-selected' : ''}" type="button" data-toggle-show="${escapeHtml(entry.showId)}" aria-pressed="${String(isSelected)}"${isBusy ? ' disabled' : ''}>${buttonText}</button>
          </li>`;
      }).join('');
      return `
        <article class="schedule-day-card">
          <header class="schedule-day-heading"><h3>${escapeHtml(day.name)}</h3><span>${(day.entries || []).length} műsorblokk</span></header>
          <ul class="schedule-entry-list">${entries}</ul>
        </article>`;
    }).join('');

    if (streamsNode) {
      streamsNode.innerHTML = (data.continuousStreams || []).map(stream => `
        <article class="schedule-stream-card">
          <span class="schedule-stream-icon" aria-hidden="true">♫</span>
          <div><strong>${escapeHtml(stream.title)}</strong><p>${escapeHtml(stream.description)}</p></div>
        </article>`).join('');
    }

    updateSelectionUi();
  }

  function base64UrlToUint8Array(value) {
    const base64 = String(value).replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const raw = atob(base64 + padding);
    return Uint8Array.from(raw, character => character.charCodeAt(0));
  }

  function capabilityMessage() {
    if (!window.isSecureContext) return 'Az értesítések csak biztonságos HTTPS-kapcsolaton használhatók.';
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      return 'Ez a böngésző nem támogatja a háttérben érkező webes push értesítéseket.';
    }
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isIOS && !isStandalone) {
      return 'iPhone-on vagy iPaden először add a Rádió69 oldalt a Főképernyőhöz (Megosztás → Főképernyőhöz adás), majd a megnyitott ikonról kapcsold be az értesítéseket.';
    }
    if (!/^[A-Za-z0-9_-]{80,100}$/.test(pushConfig.vapidPublicKey || '')) {
      return 'A push értesítés szerveroldali kulcsainak beállítása még hátravan. A telepítési útmutató leírja a szükséges lépéseket.';
    }
    if (!functionBase || !publishableKey) {
      return 'A Supabase értesítési végpont nincs megfelelően beállítva.';
    }
    return '';
  }

  async function getServiceWorkerRegistration() {
    if (serviceWorkerRegistration?.active?.state === 'activated') return serviceWorkerRegistration;

    // Separate scope + separate PushManager keeps the existing site-wide push subscriptions intact.
    const registration = await navigator.serviceWorker.register(
      '/radio69-show-push/service-worker.js',
      { scope: '/radio69-show-push/' }
    );

    const worker = registration.installing || registration.waiting || registration.active;
    if (!worker) throw new Error('A műsorértesítések háttérszolgáltatása nem indult el.');

    if (worker.state !== 'activated' && registration.active?.state !== 'activated') {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          worker.removeEventListener('statechange', onStateChange);
          reject(new Error('A műsorértesítések háttérszolgáltatása nem aktiválódott.'));
        }, 15000);

        function onStateChange() {
          if (worker.state === 'activated' || registration.active?.state === 'activated') {
            clearTimeout(timeout);
            worker.removeEventListener('statechange', onStateChange);
            resolve();
          } else if (worker.state === 'redundant') {
            clearTimeout(timeout);
            worker.removeEventListener('statechange', onStateChange);
            reject(new Error('A műsorértesítések háttérszolgáltatása nem indult el.'));
          }
        }

        worker.addEventListener('statechange', onStateChange);
        onStateChange();
      });
    }

    if (!registration.active) throw new Error('A műsorértesítések háttérszolgáltatása nem aktív.');
    serviceWorkerRegistration = registration;
    return registration;
  }

  async function getOrCreateSubscription() {
    const issue = capabilityMessage();
    if (issue) throw new Error(issue);

    let permission = Notification.permission;
    if (permission !== 'granted') permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Az értesítési engedélyt nem kaptuk meg. A böngésző webhelybeállításaiban később is engedélyezheted.');
    }

    const registration = await getServiceWorkerRegistration();
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(pushConfig.vapidPublicKey)
      });
    }
    currentSubscription = subscription;
    return subscription;
  }

  async function callSubscriptionApi(payload) {
    const response = await fetch(`${functionBase}/radio69-show-subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: publishableKey
      },
      body: JSON.stringify(payload)
    });
    let result = {};
    try { result = await response.json(); } catch (_) { /* keep empty result */ }
    if (!response.ok) throw new Error(result.error || `A szerver ${response.status} hibát jelzett.`);
    return result;
  }

  async function toggleShow(showId) {
    if (!scheduleData?.shows?.[showId] || busyShowIds.has(showId)) return;
    const next = new Set(selectedShowIds);
    const shouldEnable = !next.has(showId);
    if (shouldEnable) next.add(showId);
    else next.delete(showId);

    busyShowIds.add(showId);
    updateSelectionUi();
    try {
      let subscription = currentSubscription;
      if (shouldEnable) subscription = await getOrCreateSubscription();
      if (subscription) {
        await callSubscriptionApi({
          action: 'save',
          subscription: subscription.toJSON(),
          showIds: Array.from(next)
        });
      } else if (next.size > 0) {
        throw new Error('Nem sikerült létrehozni a böngésző push-előfizetését.');
      }
      selectedShowIds = next;
      saveLocalSelection();
      setStatus(shouldEnable
        ? `Bekapcsolva: ${scheduleData.shows[showId].title}. A kezdés előtt 15 perccel értesítünk ezen az eszközön.`
        : `Kikapcsoltuk a(z) ${scheduleData.shows[showId].title} értesítéseit ezen az eszközön.`, 'success');
    } catch (error) {
      setStatus(error?.message || 'Nem sikerült elmenteni az értesítési beállítást.', 'error');
    } finally {
      busyShowIds.delete(showId);
      updateSelectionUi();
    }
  }

  async function clearAllNotifications() {
    if (!selectedShowIds.size && !currentSubscription) return;
    clearButton.disabled = true;
    try {
      let subscription = currentSubscription;
      if (!subscription && 'serviceWorker' in navigator) {
        const registration = await getServiceWorkerRegistration();
        subscription = await registration.pushManager.getSubscription();
      }
      if (subscription) {
        await callSubscriptionApi({ action: 'remove', endpoint: subscription.endpoint });
        try { await subscription.unsubscribe(); } catch (_) { /* server-side row is already removed */ }
      }
      currentSubscription = null;
      selectedShowIds.clear();
      saveLocalSelection();
      updateSelectionUi();
      setStatus('Az összes műsorértesítést kikapcsoltuk ezen az eszközön.', 'success');
    } catch (error) {
      setStatus(error?.message || 'Nem sikerült kikapcsolni az értesítéseket.', 'error');
    } finally {
      clearButton.disabled = false;
    }
  }

  async function restoreExistingSelection() {
    const issue = capabilityMessage();
    if (issue && !/kulcsainak beállítása|végpont nincs/i.test(issue)) {
      setStatus(issue, 'info');
      return;
    }
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !functionBase || !publishableKey) {
      setStatus(issue || 'Az értesítési szolgáltatás beállítása folyamatban van.', 'info');
      return;
    }
    try {
      const registration = await getServiceWorkerRegistration();
      currentSubscription = await registration.pushManager.getSubscription();
      if (!currentSubscription) {
        setStatus('Válaszd ki a kedvenc műsoraidat, és engedélyezd az értesítéseket.', 'info');
        updateSelectionUi();
        return;
      }
      const saved = await callSubscriptionApi({ action: 'load', endpoint: currentSubscription.endpoint });
      if (saved.found) {
        selectedShowIds = new Set((saved.showIds || []).filter(id => scheduleData.shows[id]));
        saveLocalSelection();
      } else if (selectedShowIds.size > 0) {
        await callSubscriptionApi({
          action: 'save',
          subscription: currentSubscription.toJSON(),
          showIds: Array.from(selectedShowIds)
        });
      }
      const count = selectedShowIds.size;
      setStatus(count
        ? `${count} műsor értesítése aktív ezen az eszközön. A jelzések 15 perccel a kezdés előtt érkeznek.`
        : 'A push értesítések engedélyezve vannak. Lent válaszd ki, mely műsorokról kérsz jelzést.', 'success');
      updateSelectionUi();
    } catch (error) {
      setStatus('A műsorrend megtekinthető, de az értesítési beállításokat most nem sikerült lekérni.', 'info');
    }
  }

  scheduleGrid.addEventListener('click', event => {
    const button = event.target.closest('[data-toggle-show]');
    if (button) toggleShow(button.dataset.toggleShow);
  });
  clearButton?.addEventListener('click', clearAllNotifications);

  (async () => {
    try {
      const response = await fetch('/show-schedule.json', { cache: 'no-cache' });
      if (!response.ok) throw new Error('A műsorrend nem érhető el.');
      scheduleData = await response.json();
      renderSchedule(scheduleData);
      await restoreExistingSelection();
    } catch (error) {
      scheduleGrid.innerHTML = '<div class="schedule-loading">A műsorrendet most nem sikerült betölteni. Frissítsd az oldalt, vagy nézd meg a Rádió69 hivatalos műsorlistáját.</div>';
      setStatus(error?.message || 'Hiba történt a műsorrend betöltésekor.', 'error');
    }
  })();
})();
