(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const cfg = window.RADIO69_SUPABASE_CONFIG || {};
  const loginView = $('loginView');
  const appView = $('appView');
  let db = null;
  let user = null;
  let role = null;
  let loading = false;
  const localTitles = new Map((window.RADIO69_ARTICLES || []).map(item => [item.id, item.title]));

  function message(id, text, isError = false) {
    const element = $(id);
    element.textContent = text;
    element.classList.add('show');
    element.classList.toggle('error', isError);
  }
  function clearMessage(id) {
    const element = $(id);
    element.textContent = '';
    element.classList.remove('show', 'error');
  }
  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('hu-HU');
  }
  function statusLabel(status) {
    return status === 'approved' ? 'JÓVÁHAGYOTT' : status === 'rejected' ? 'ELUTASÍTOTT' : 'JÓVÁHAGYÁSRA VÁR';
  }
  function renderCard(item, articleTitles) {
    const card = document.createElement('article');
    card.className = 'comment-card';
    const top = document.createElement('div');
    top.className = 'comment-top';
    const heading = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'comment-title';
    title.textContent = item.author_name || 'Olvasó';
    const meta = document.createElement('div');
    meta.className = 'comment-meta';
    meta.textContent = `${articleTitles.get(item.article_id) || item.article_id} · ${formatDate(item.created_at)}${item.parent_id ? ' · Válasz' : ''}`;
    heading.append(title, meta);
    const status = document.createElement('span');
    status.className = `status ${item.status}`;
    status.textContent = statusLabel(item.status);
    top.append(heading, status);
    const body = document.createElement('p');
    body.className = 'comment-body';
    body.textContent = item.body || '';
    const actions = document.createElement('div');
    actions.className = 'comment-actions';
    const view = document.createElement('a');
    view.className = 'btn comment-link';
    view.href = `cikk.html?id=${encodeURIComponent(item.article_id)}`;
    view.target = '_blank';
    view.rel = 'noopener noreferrer';
    view.textContent = 'Cikk megnyitása';
    actions.appendChild(view);
    if (item.status !== 'approved') actions.appendChild(actionButton('Jóváhagyás', 'btn btn-success', () => changeStatus(item.id, 'approved')));
    if (item.status !== 'rejected') actions.appendChild(actionButton('Elutasítás', 'btn btn-danger', () => changeStatus(item.id, 'rejected')));
    actions.appendChild(actionButton('Törlés', 'btn', () => removeComment(item.id)));
    card.append(top, body, actions);
    return card;
  }
  function actionButton(label, className, callback) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', callback);
    return button;
  }
  async function loadComments() {
    if (loading || !db || role !== 'chief_editor') return;
    loading = true;
    const list = $('commentList');
    list.replaceChildren();
    const status = $('statusFilter').value;
    try {
      let query = db.from('article_comments').select('id,article_id,parent_id,author_name,body,status,created_at').order('created_at', { ascending: false }).limit(250);
      if (status !== 'all') query = query.eq('status', status);
      const [{ data, error }, { data: cloudArticles }] = await Promise.all([
        query,
        db.from('articles').select('id,title').eq('status', 'published').limit(500)
      ]);
      if (error) throw error;
      const titles = new Map(localTitles);
      (cloudArticles || []).forEach(article => titles.set(article.id, article.title));
      const comments = Array.isArray(data) ? data : [];
      if (!comments.length) {
        const empty = document.createElement('p');
        empty.className = 'empty';
        empty.textContent = status === 'pending' ? 'Nincs jóváhagyásra váró hozzászólás.' : 'Ebben a kategóriában még nincs hozzászólás.';
        list.appendChild(empty);
      } else {
        const fragment = document.createDocumentFragment();
        comments.forEach(item => fragment.appendChild(renderCard(item, titles)));
        list.appendChild(fragment);
      }
    } catch (error) {
      message('appMessage', error?.message || 'Nem sikerült betölteni a hozzászólásokat.', true);
    } finally {
      loading = false;
    }
  }
  async function changeStatus(id, status) {
    clearMessage('appMessage');
    const { error } = await db.from('article_comments').update({ status }).eq('id', id);
    if (error) {
      message('appMessage', error.message || 'Nem sikerült módosítani az állapotot.', true);
      return;
    }
    message('appMessage', status === 'approved' ? 'A hozzászólás megjelent a cikk alatt.' : 'A hozzászólás elutasítva.');
    await loadComments();
  }
  async function removeComment(id) {
    if (!confirm('Biztosan végleg törlöd ezt a hozzászólást? A művelet nem vonható vissza.')) return;
    const { error } = await db.from('article_comments').delete().eq('id', id);
    if (error) {
      message('appMessage', error.message || 'Nem sikerült törölni a hozzászólást.', true);
      return;
    }
    message('appMessage', 'A hozzászólás törölve.');
    await loadComments();
  }
  function loggedOut() {
    user = null;
    role = null;
    appView.classList.add('hidden');
    loginView.classList.remove('hidden');
    $('logoutBtn').classList.add('hidden');
    $('userPill').classList.add('hidden');
  }
  async function openApp(authUser) {
    user = authUser;
    const { data, error } = await db.from('editor_profiles').select('display_name,role').eq('user_id', authUser.id).single();
    if (error || !data || data.role !== 'chief_editor') {
      await db.auth.signOut();
      loggedOut();
      message('loginMessage', 'Ehhez az oldalhoz főszerkesztői jogosultság szükséges.', true);
      return;
    }
    role = data.role;
    loginView.classList.add('hidden');
    appView.classList.remove('hidden');
    $('userPill').textContent = `${data.display_name || authUser.email} · FŐSZERKESZTŐ`;
    $('userPill').classList.remove('hidden');
    $('logoutBtn').classList.remove('hidden');
    await loadComments();
  }

  const ready = window.supabase?.createClient && /^https:\/\/.+\.supabase\.co$/.test(cfg.url || '') && cfg.publishableKey;
  if (!ready) {
    message('loginMessage', 'A Supabase nyilvános kliensbeállítása hiányzik.', true);
  } else {
    db = window.supabase.createClient(cfg.url, cfg.publishableKey);
    db.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') loggedOut();
      else if (session?.user) queueMicrotask(() => openApp(session.user));
    });
    db.auth.getSession().then(({ data }) => {
      if (data.session?.user) openApp(data.session.user);
    });
  }
  $('loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!db) return;
    clearMessage('loginMessage');
    const { error } = await db.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value });
    if (error) message('loginMessage', error.message || 'Nem sikerült a belépés.', true);
  });
  $('logoutBtn').addEventListener('click', async () => {
    if (db) await db.auth.signOut();
    loggedOut();
  });
  $('refreshBtn').addEventListener('click', loadComments);
  $('statusFilter').addEventListener('change', loadComments);
})();
