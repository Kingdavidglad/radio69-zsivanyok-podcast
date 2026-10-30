/* Rádió69 – GA4 és belső szerkesztőségi statisztikai központ. */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const cfg = window.RADIO69_SUPABASE_CONFIG || {};
  const loginView = $('loginView');
  const appView = $('appView');
  const loginForm = $('loginForm');
  const loginButton = $('loginButton');
  const userPill = $('userPill');
  const logoutButton = $('logoutBtn');
  const appMessage = $('appMessage');
  const rangeSelect = $('rangeSelect');
  const refreshButton = $('refreshBtn');
  const loadingState = $('loadingState');
  const dashboard = $('dashboard');
  const exportButton = $('exportBtn');

  let db = null;
  let currentUser = null;
  let currentProfile = null;
  let report = null;
  let loading = false;

  const fmt = new Intl.NumberFormat('hu-HU');
  const percent = (value) => `${(Number(value || 0) * 100).toLocaleString('hu-HU', { maximumFractionDigits: 1 })}%`;
  const number = (value) => fmt.format(Number(value || 0));

  function showMessage(element, text, isError = false) {
    element.textContent = text;
    element.classList.add('show');
    element.classList.toggle('ok', !isError);
  }
  function hideMessage(element) {
    element.textContent = '';
    element.classList.remove('show', 'ok');
  }
  function clear(element) {
    while (element.firstChild) element.removeChild(element.firstChild);
  }
  function setLoggedOut() {
    currentUser = null;
    currentProfile = null;
    report = null;
    appView.classList.add('hidden');
    loginView.classList.remove('hidden');
    userPill.classList.add('hidden');
    logoutButton.classList.add('hidden');
    dashboard.classList.add('hidden');
    exportButton.disabled = true;
  }
  async function verifyChiefEditor(authUser) {
    const { data, error } = await db
      .from('editor_profiles')
      .select('user_id,display_name,role')
      .eq('user_id', authUser.id)
      .single();
    if (error || !data) throw new Error('A fiókhoz nem található szerkesztői profil. Ellenőrizd a Supabase editor_profiles tábláját.');
    if (data.role !== 'chief_editor') throw new Error('Ehhez az oldalhoz főszerkesztői jogosultság szükséges.');
    return data;
  }
  async function openAdmin(authUser) {
    if (!authUser || (currentUser?.id === authUser.id && currentProfile)) return;
    currentUser = authUser;
    loginButton.disabled = true;
    try {
      currentProfile = await verifyChiefEditor(authUser);
      loginView.classList.add('hidden');
      appView.classList.remove('hidden');
      userPill.textContent = `${currentProfile.display_name || authUser.email || 'Főszerkesztő'} · FŐSZERKESZTŐ`;
      userPill.classList.remove('hidden');
      logoutButton.classList.remove('hidden');
      await loadStatistics();
    } catch (error) {
      currentProfile = null;
      appView.classList.add('hidden');
      loginView.classList.remove('hidden');
      showMessage($('loginMessage'), error.message || 'Nem sikerült ellenőrizni a jogosultságot.', true);
    } finally {
      loginButton.disabled = false;
    }
  }
  function formatDuration(seconds) {
    const total = Math.max(0, Math.round(Number(seconds || 0)));
    const minutes = Math.floor(total / 60);
    const remain = total % 60;
    return minutes ? `${minutes} perc ${remain} mp` : `${remain} mp`;
  }
  function formatDate(value) {
    const raw = String(value || '');
    if (/^\d{8}$/.test(raw)) {
      return `${raw.slice(6, 8)}.${raw.slice(4, 6)}.`;
    }
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat('hu-HU', { month: 'short', day: 'numeric' }).format(date);
  }
  function setText(id, value) {
    const node = $(id);
    if (node) node.textContent = value;
  }
  function renderKpis(summary = {}) {
    setText('kpiUsers', number(summary.activeUsers));
    setText('kpiSessions', number(summary.sessions));
    setText('kpiViews', number(summary.screenPageViews));
    setText('kpiEngagement', percent(summary.engagementRate));
    setText('kpiNewUsers', number(summary.newUsers));
    setText('kpiAvgDuration', formatDuration(summary.averageSessionDuration));
    setText('kpiBounce', percent(summary.bounceRate));
    setText('kpiEvents', number(summary.eventCount));
  }
  function renderDaily(rows = []) {
    const chart = $('dailyChart');
    clear(chart);
    if (!rows.length) {
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'A kiválasztott időszakra még nincs napi adat.';
      chart.appendChild(empty);
      return;
    }
    const max = Math.max(1, ...rows.map(row => Number(row.screenPageViews || 0)));
    rows.forEach((row) => {
      const col = document.createElement('div');
      col.className = 'chart-col';
      const bar = document.createElement('div');
      bar.className = 'chart-bar';
      const value = Number(row.screenPageViews || 0);
      bar.style.height = `${Math.max(value ? 4 : 1, (value / max) * 155)}px`;
      bar.title = `${formatDate(row.date)} · ${number(value)} oldalmegtekintés · ${number(row.activeUsers)} aktív felhasználó`;
      bar.setAttribute('aria-label', bar.title);
      const label = document.createElement('span');
      label.className = 'chart-label';
      label.textContent = formatDate(row.date);
      col.append(bar, label);
      chart.appendChild(col);
    });
  }
  function renderBars(target, rows, labelKey, metricKey, secondaryKey) {
    clear(target);
    if (!rows?.length) {
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.textContent = 'A kiválasztott időszakra nincs megjeleníthető adat.';
      target.appendChild(empty);
      return;
    }
    const max = Math.max(1, ...rows.map(row => Number(row[metricKey] || 0)));
    rows.forEach((row) => {
      const wrap = document.createElement('div');
      wrap.className = 'bar-row';
      const label = document.createElement('div');
      label.className = 'bar-label';
      const name = document.createElement('span');
      name.textContent = row[labelKey] || '(nincs megadva)';
      const value = document.createElement('strong');
      value.textContent = number(row[metricKey]);
      if (secondaryKey && row[secondaryKey] !== undefined) value.title = `${number(row[secondaryKey])} aktív felhasználó`;
      label.append(name, value);
      const track = document.createElement('div');
      track.className = 'bar-track';
      const fill = document.createElement('div');
      fill.className = 'bar-fill';
      fill.style.width = `${Math.max(1, Number(row[metricKey] || 0) / max * 100)}%`;
      track.appendChild(fill);
      wrap.append(label, track);
      target.appendChild(wrap);
    });
  }
  function renderTopPages(rows = []) {
    const body = $('topPagesBody');
    clear(body);
    if (!rows.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.className = 'muted';
      td.textContent = 'A kiválasztott időszakra nincs oldaladat.';
      tr.appendChild(td);
      body.appendChild(tr);
      return;
    }
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      const titleTd = document.createElement('td');
      const title = document.createElement('strong');
      title.textContent = row.pageTitle || '(oldalcím nélkül)';
      titleTd.appendChild(title);
      const pathTd = document.createElement('td');
      const path = String(row.pagePath || '/');
      const link = document.createElement('a');
      link.textContent = path;
      try {
        const target = new URL(path, window.location.origin);
        if (target.origin === window.location.origin) {
          link.href = target.href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        } else {
          pathTd.textContent = path;
        }
      } catch {
        pathTd.textContent = path;
      }
      if (!pathTd.textContent) pathTd.appendChild(link);
      const viewsTd = document.createElement('td');
      viewsTd.textContent = number(row.screenPageViews);
      const usersTd = document.createElement('td');
      usersTd.textContent = number(row.activeUsers);
      tr.append(titleTd, pathTd, viewsTd, usersTd);
      body.appendChild(tr);
    });
  }
  function renderInternal(internal = {}) {
    setText('internalArticles', internal.publishedArticles == null ? '–' : number(internal.publishedArticles));
    setText('internalMessages', internal.messages == null ? '–' : number(internal.messages));
    setText('internalNewMessages', internal.newMessages == null ? '–' : number(internal.newMessages));
    setText('internalReplies', internal.sentReplies == null ? '–' : number(internal.sentReplies));
  }
  function renderEvents(rows = []) {
    const target = $('eventList');
    renderBars(target, rows, 'eventName', 'eventCount');
  }
  function render(data) {
    report = data;
    renderKpis(data.summary || {});
    renderDaily(data.daily || []);
    renderBars($('channelList'), data.channels || [], 'sessionDefaultChannelGroup', 'sessions', 'activeUsers');
    renderTopPages(data.topPages || []);
    renderEvents(data.events || []);
    renderInternal(data.internal || {});
    const days = Number(data.rangeDays || rangeSelect.value || 30);
    setText('chartPeriod', `Utolsó ${days} nap · tegnapig`);
    setText('updatedAt', `Frissítve: ${new Intl.DateTimeFormat('hu-HU', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(data.generatedAt || Date.now()))}`);
    $('dataNote').textContent = `Az analitikai adatok az utolsó ${days} napra, a tegnapi nappal bezárólag vonatkoznak. Az adatfeldolgozás késhet, és csak a hozzájárulást adó, mérhető látogatók szerepelnek benne.`;
    loadingState.classList.add('hidden');
    dashboard.classList.remove('hidden');
    exportButton.disabled = false;
  }
  async function loadStatistics() {
    if (!db || !currentProfile || loading) return;
    loading = true;
    refreshButton.disabled = true;
    refreshButton.textContent = 'Betöltés…';
    hideMessage(appMessage);
    loadingState.className = 'state';
    loadingState.textContent = 'A Google Analytics és a szerkesztőségi összesítések betöltése…';
    loadingState.classList.remove('hidden');
    dashboard.classList.add('hidden');
    exportButton.disabled = true;
    try {
      const days = Number(rangeSelect.value);
      const { data, error } = await db.functions.invoke('radio69-statistics', { body: { days } });
      if (error) {
        let detail = error.message || 'A statisztikai szolgáltatás hibát jelzett.';
        try {
          const response = error.context;
          if (response && typeof response.json === 'function') {
            const payload = await response.json();
            if (payload?.error) detail = payload.error;
          }
        } catch { /* Keep the SDK error message. */ }
        throw new Error(detail);
      }
      if (!data?.ok) throw new Error(data?.error || 'Nem érkezett érvényes statisztikai válasz.');
      render(data);
      showMessage(appMessage, 'A statisztikák sikeresen frissültek.');
    } catch (error) {
      loadingState.className = 'state error';
      loadingState.textContent = error.message || 'Nem sikerült betölteni a statisztikákat.';
      showMessage(appMessage, `Statisztikai betöltési hiba: ${error.message || 'Ismeretlen hiba'}`, true);
    } finally {
      loading = false;
      refreshButton.disabled = false;
      refreshButton.textContent = '↻ Statisztikák frissítése';
    }
  }
  function csvEscape(value) {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }
  function exportCsv() {
    if (!report) return;
    const rows = [['Típus', 'Név', 'Érték', 'Másodlagos érték']];
    (report.topPages || []).forEach(row => rows.push(['Oldal', row.pageTitle, row.screenPageViews, row.pagePath]));
    (report.channels || []).forEach(row => rows.push(['Forgalmi forrás', row.sessionDefaultChannelGroup, row.sessions, row.activeUsers]));
    (report.events || []).forEach(row => rows.push(['Esemény', row.eventName, row.eventCount, '']));
    const csv = '\ufeff' + rows.map(row => row.map(csvEscape).join(';')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `radio69-statisztika-${report.rangeDays || 30}-nap.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
  async function init() {
    if (!window.supabase?.createClient || !/^https:\/\/.+\.supabase\.co$/.test(cfg.url || '') || !cfg.publishableKey) {
      showMessage($('loginMessage'), 'A Supabase beállítás nem érhető el. Ellenőrizd a supabase-config.js fájlt és a Supabase JS könyvtár betöltését.', true);
      loginButton.disabled = true;
      return;
    }
    db = window.supabase.createClient(cfg.url, cfg.publishableKey);
    db.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') setLoggedOut();
      else if (session?.user) Promise.resolve().then(() => openAdmin(session.user));
    });
    const { data, error } = await db.auth.getSession();
    if (error) {
      showMessage($('loginMessage'), error.message || 'Nem sikerült ellenőrizni a bejelentkezést.', true);
      return;
    }
    if (data.session?.user) await openAdmin(data.session.user);
  }
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    hideMessage($('loginMessage'));
    loginButton.disabled = true;
    loginButton.textContent = 'Belépés…';
    try {
      const { error } = await db.auth.signInWithPassword({ email: $('loginEmail').value.trim(), password: $('loginPassword').value });
      if (error) throw error;
    } catch (error) {
      showMessage($('loginMessage'), error.message || 'Nem sikerült a belépés.', true);
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = 'Belépés a statisztikákhoz →';
    }
  });
  logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    const { error } = await db.auth.signOut();
    if (error) showMessage(appMessage, error.message || 'Nem sikerült kilépni.', true);
    setLoggedOut();
    logoutButton.disabled = false;
  });
  refreshButton.addEventListener('click', loadStatistics);
  rangeSelect.addEventListener('change', loadStatistics);
  exportButton.addEventListener('click', exportCsv);
  init().catch(error => showMessage($('loginMessage'), error.message || 'Ismeretlen inicializálási hiba.', true));
})();
