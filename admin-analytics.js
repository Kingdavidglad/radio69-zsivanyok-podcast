/* Rádió69 – GA4 admin panel. A már beléptetett főszerkesztő Supabase-munkamenetét használja. */
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const appView = $('appView');
  const refreshButton = $('refreshAnalyticsBtn');
  const messageBox = $('analyticsMessage');
  const updatedLabel = $('analyticsUpdated');
  const chart = $('gaPageViewsTrend');
  let db = null;
  let busy = false;
  let loadedOnce = false;

  const number = (value) => new Intl.NumberFormat('hu-HU').format(Number(value || 0));
  const duration = (seconds) => {
    const total = Math.max(0, Math.round(Number(seconds || 0)));
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    return `${minutes}:${String(rest).padStart(2, '0')} perc`;
  };

  function showMessage(text, isError = false) {
    if (!messageBox) return;
    messageBox.textContent = text;
    messageBox.classList.add('show');
    messageBox.classList.toggle('ok', !isError);
  }

  function setMetric(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function formatDate(dateValue) {
    if (!/^\d{8}$/.test(String(dateValue || ''))) return String(dateValue || 'Dátum');
    const year = Number(dateValue.slice(0, 4));
    const month = Number(dateValue.slice(4, 6)) - 1;
    const day = Number(dateValue.slice(6, 8));
    return new Intl.DateTimeFormat('hu-HU', { month: '2-digit', day: '2-digit' }).format(new Date(year, month, day));
  }

  function renderChart(days) {
    if (!chart) return;
    chart.replaceChildren();
    const rows = Array.isArray(days) ? days.slice(-28) : [];
    if (!rows.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'Ehhez az időszakhoz még nincs napi bontású adat.';
      chart.appendChild(empty);
      return;
    }
    const max = Math.max(1, ...rows.map(row => Number(row.pageViews || 0)));
    rows.forEach((row) => {
      const value = Number(row.pageViews || 0);
      const slot = document.createElement('div');
      slot.className = 'analytics-bar-slot';
      const bar = document.createElement('span');
      bar.className = 'analytics-bar';
      bar.style.height = `${Math.max(2, (value / max) * 100)}%`;
      bar.title = `${formatDate(row.date)}: ${number(value)} oldalmegtekintés`;
      bar.setAttribute('aria-label', bar.title);
      slot.appendChild(bar);
      chart.appendChild(slot);
    });
  }

  async function loadAnalytics(force = false) {
    if (busy || !appView || appView.classList.contains('hidden')) return;
    if (loadedOnce && !force) return;
    db = db || window.radio69AdminSupabase;
    if (!db?.functions?.invoke) {
      showMessage('Nem érhető el a bejelentkezett Supabase-munkamenet. Frissítsd az oldalt, majd lépj be újra.', true);
      return;
    }
    busy = true;
    if (refreshButton) {
      refreshButton.disabled = true;
      refreshButton.textContent = 'Betöltés…';
    }
    showMessage('Google Analytics-adatok lekérése folyamatban…');
    try {
      const { data, error } = await db.functions.invoke('radio69-analytics', { method: 'POST' });
      if (error) {
        let detail = error.message || 'A statisztikai lekérdezés nem sikerült.';
        try {
          const response = error.context;
          if (response && typeof response.json === 'function') {
            const payload = await response.json();
            if (payload?.error) detail = payload.error;
          }
        } catch { /* Az SDK hibaüzenete marad. */ }
        throw new Error(detail);
      }
      if (!data?.success || !data.metrics) throw new Error(data?.error || 'A Google Analytics nem adott vissza statisztikai adatokat.');
      const m = data.metrics;
      setMetric('gaActiveUsers', number(m.activeUsers));
      setMetric('gaNewUsers', number(m.newUsers));
      setMetric('gaPageViews', number(m.pageViews));
      setMetric('gaSessions', number(m.sessions));
      setMetric('gaEngagement', `${(Number(m.engagementRate || 0) * 100).toLocaleString('hu-HU', { maximumFractionDigits: 1 })}%`);
      setMetric('gaAvgDuration', duration(m.averageSessionDuration));
      renderChart(data.dailyPageViews);
      const timestamp = data.generatedAt ? new Date(data.generatedAt) : new Date();
      updatedLabel.textContent = `Utoljára frissítve: ${new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp)} · GA4-tulajdon: ${data.propertyId || 'Rádió69'}`;
      showMessage('A Google Analytics-adatok sikeresen betöltődtek.', false);
      loadedOnce = true;
    } catch (error) {
      showMessage(`Nem sikerült betölteni a Google Analytics-statisztikákat. ${error.message || ''}`, true);
    } finally {
      busy = false;
      if (refreshButton) {
        refreshButton.disabled = false;
        refreshButton.textContent = '↻ Statisztikák frissítése';
      }
    }
  }

  if (refreshButton) refreshButton.addEventListener('click', () => loadAnalytics(true));
  if (!appView) return;
  const observer = new MutationObserver(() => {
    if (!appView.classList.contains('hidden')) loadAnalytics();
    else loadedOnce = false;
  });
  observer.observe(appView, { attributes: true, attributeFilter: ['class'] });
  if (!appView.classList.contains('hidden')) loadAnalytics();
})();
