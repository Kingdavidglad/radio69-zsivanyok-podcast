/* Rádió69 – belső közönségüzenet-kezelő. Főszerkesztői Supabase Auth szükséges. */
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
  const messageList = $('messageList');
  const detailPanel = $('detailPanel');
  const appMessage = $('appMessage');
  const statusFilter = $('statusFilter');
  const searchInput = $('searchInput');

  const TYPE_LABELS = {
    topic_suggestion: 'Témát javasol',
    question: 'Kérdés a műsorvezetőknek',
    guest_recommendation: 'Podcastvendég-ajánlás',
    editorial_message: 'Helyesbítés / egyéb üzenet'
  };
  const STATUS_LABELS = {
    new: 'ÚJ',
    in_progress: 'FOLYAMATBAN',
    closed: 'LEZÁRVA'
  };

  let db = null;
  let currentUser = null;
  let currentProfile = null;
  let messages = [];
  let selectedId = null;
  let loading = false;
  let replyLoadingFor = null;

  const REPLY_FUNCTION_NAME = 'reply-audience-message';

  function showMessage(element, text, isError = false) {
    element.textContent = text;
    element.classList.add('show');
    element.classList.toggle('ok', !isError);
  }

  function hideMessage(element) {
    element.textContent = '';
    element.classList.remove('show', 'ok');
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Ismeretlen dátum';
    return new Intl.DateTimeFormat('hu-HU', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(date);
  }

  function escapeText(value) {
    return String(value ?? '');
  }

  function clearElement(element) {
    while (element.firstChild) element.removeChild(element.firstChild);
  }

  function setLoggedOut() {
    currentUser = null;
    currentProfile = null;
    messages = [];
    selectedId = null;
    appView.classList.add('hidden');
    loginView.classList.remove('hidden');
    userPill.classList.add('hidden');
    logoutButton.classList.add('hidden');
    clearElement(messageList);
    clearElement(detailPanel);
  }

  async function verifyChiefEditor(authUser) {
    const { data, error } = await db
      .from('editor_profiles')
      .select('user_id,display_name,role')
      .eq('user_id', authUser.id)
      .single();

    if (error || !data) {
      throw new Error('A fiókhoz nem található szerkesztői profil. Kérd a főszerkesztőt, hogy ellenőrizze a Supabase editor_profiles tábláját.');
    }
    if (data.role !== 'chief_editor') {
      throw new Error('Ehhez az oldalhoz főszerkesztői jogosultság szükséges.');
    }
    return data;
  }

  async function openAdmin(authUser) {
    if (!authUser || currentUser?.id === authUser.id && currentProfile) return;
    currentUser = authUser;
    loginButton.disabled = true;
    try {
      currentProfile = await verifyChiefEditor(authUser);
      loginView.classList.add('hidden');
      appView.classList.remove('hidden');
      userPill.textContent = `${currentProfile.display_name || authUser.email || 'Főszerkesztő'} · FŐSZERKESZTŐ`;
      userPill.classList.remove('hidden');
      logoutButton.classList.remove('hidden');
      await loadMessages();
    } catch (error) {
      currentProfile = null;
      appView.classList.add('hidden');
      loginView.classList.remove('hidden');
      showMessage($('loginMessage'), error.message || 'Nem sikerült ellenőrizni a jogosultságot.', true);
    } finally {
      loginButton.disabled = false;
    }
  }

  function createStatusBadge(status) {
    const badge = document.createElement('span');
    const safeStatus = Object.hasOwn(STATUS_LABELS, status) ? status : 'new';
    badge.className = `status ${safeStatus}`;
    badge.textContent = STATUS_LABELS[safeStatus];
    return badge;
  }

  function filteredMessages() {
    const state = statusFilter.value;
    const query = searchInput.value.trim().toLocaleLowerCase('hu-HU');
    return messages.filter((item) => {
      if (state !== 'all' && item.status !== state) return false;
      if (!query) return true;
      return [item.name, item.email, item.subject, item.message, TYPE_LABELS[item.message_type]]
        .some(value => escapeText(value).toLocaleLowerCase('hu-HU').includes(query));
    });
  }

  function updateCounts() {
    $('countAll').textContent = String(messages.length);
    $('countNew').textContent = String(messages.filter(item => item.status === 'new').length);
    $('countProgress').textContent = String(messages.filter(item => item.status === 'in_progress').length);
    $('countClosed').textContent = String(messages.filter(item => item.status === 'closed').length);
  }

  function renderList() {
    clearElement(messageList);
    const visible = filteredMessages();
    if (!visible.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = messages.length ? 'Nincs a szűrésnek megfelelő üzenet.' : 'Még nem érkezett közönségüzenet.';
      messageList.appendChild(empty);
      return;
    }

    visible.forEach((item) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'message-item';
      if (item.id === selectedId) button.classList.add('active');
      button.addEventListener('click', () => selectMessage(item.id));

      const title = document.createElement('strong');
      title.textContent = item.subject || item.name || TYPE_LABELS[item.message_type] || 'Közönségüzenet';
      const preview = document.createElement('p');
      preview.textContent = item.message;
      const meta = document.createElement('div');
      meta.className = 'item-meta';
      const date = document.createElement('span');
      date.textContent = formatDate(item.created_at);
      meta.append(date, createStatusBadge(item.status));
      const kind = document.createElement('div');
      kind.className = 'hint';
      kind.style.marginTop = '5px';
      kind.textContent = TYPE_LABELS[item.message_type] || 'Egyéb üzenet';
      button.append(title, kind, preview, meta);
      messageList.appendChild(button);
    });
  }

  function addDetailBlock(parent, label, value) {
    const block = document.createElement('div');
    block.className = 'detail-block';
    const heading = document.createElement('label');
    heading.textContent = label;
    const content = document.createElement('p');
    content.textContent = value || 'Nincs megadva';
    block.append(heading, content);
    parent.appendChild(block);
  }

  function createReplyState(status) {
    const badge = document.createElement('span');
    const safe = ['sending', 'sent', 'failed'].includes(status) ? status : 'failed';
    badge.className = `reply-state ${safe}`;
    badge.textContent = safe === 'sent' ? 'ELKÜLDVE' : safe === 'sending' ? 'KÜLDÉS FOLYAMATBAN' : 'SIKERTELEN';
    return badge;
  }

  async function loadReplyHistory(messageId) {
    const container = $('replyHistory');
    if (!container || !db || !currentProfile) return;
    replyLoadingFor = messageId;
    clearElement(container);
    const loadingText = document.createElement('p');
    loadingText.className = 'reply-empty';
    loadingText.textContent = 'Válaszelőzmények betöltése…';
    container.appendChild(loadingText);

    try {
      const { data, error } = await db
        .from('audience_message_replies')
        .select('id,created_at,sent_at,recipient_email,subject,body,status,error_message')
        .eq('audience_message_id', messageId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      if (selectedId !== messageId || replyLoadingFor !== messageId) return;
      clearElement(container);
      if (!Array.isArray(data) || data.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'reply-empty';
        empty.textContent = 'Ehhez az üzenethez még nem küldtél választ.';
        container.appendChild(empty);
        return;
      }
      data.forEach((reply) => {
        const card = document.createElement('article');
        card.className = 'reply-card';
        const head = document.createElement('div');
        head.className = 'reply-card-head';
        const time = document.createElement('time');
        time.textContent = formatDate(reply.sent_at || reply.created_at);
        head.append(time, createReplyState(reply.status));
        const subject = document.createElement('p');
        subject.className = 'reply-subject';
        subject.textContent = reply.subject || 'Válasz';
        const recipient = document.createElement('p');
        recipient.className = 'reply-help';
        recipient.textContent = `Címzett: ${reply.recipient_email || 'Nincs megadva'}`;
        const body = document.createElement('p');
        body.textContent = reply.body || '';
        card.append(head, subject, recipient, body);
        if (reply.status === 'failed' && reply.error_message) {
          const error = document.createElement('p');
          error.className = 'reply-help';
          error.style.color = 'var(--red)';
          error.textContent = `Hiba: ${reply.error_message}`;
          card.appendChild(error);
        }
        container.appendChild(card);
      });
    } catch (error) {
      if (selectedId !== messageId) return;
      clearElement(container);
      const problem = document.createElement('p');
      problem.className = 'reply-empty';
      problem.style.color = 'var(--red)';
      problem.textContent = `Nem sikerült betölteni a válaszelőzményeket. Futtasd le a válaszfunkció SQL-beállítását. ${error.message || ''}`;
      container.appendChild(problem);
    }
  }

  async function sendReply(messageId, subjectInput, bodyInput, button) {
    const item = messages.find(entry => entry.id === messageId);
    if (!item || !item.email) {
      showMessage(appMessage, 'Ehhez az üzenethez nem adtak meg válaszcímet.', true);
      return;
    }
    const subject = subjectInput.value.trim();
    const body = bodyInput.value.trim();
    if (subject.length < 3 || subject.length > 180) {
      showMessage(appMessage, 'A tárgy legalább 3, legfeljebb 180 karakter legyen.', true);
      subjectInput.focus();
      return;
    }
    if (body.length < 5 || body.length > 5000) {
      showMessage(appMessage, 'A válasz legalább 5, legfeljebb 5000 karakter legyen.', true);
      bodyInput.focus();
      return;
    }
    if (!window.confirm(`Biztosan elküldöd a választ erre a címre?\n${item.email}`)) return;

    const previousText = button.textContent;
    button.disabled = true;
    button.textContent = 'Küldés…';
    hideMessage(appMessage);
    try {
      const { data, error } = await db.functions.invoke(REPLY_FUNCTION_NAME, {
        body: {
          audienceMessageId: messageId,
          subject,
          message: body
        }
      });
      if (error) {
        let detail = error.message || 'A válaszfunkció hibát jelzett.';
        try {
          const response = error.context;
          if (response && typeof response.json === 'function') {
            const payload = await response.json();
            if (payload?.error) detail = payload.error;
          }
        } catch { /* Keep the SDK error message. */ }
        throw new Error(detail);
      }
      if (!data?.ok) throw new Error(data?.error || 'A válasz elküldése nem sikerült.');
      subjectInput.value = '';
      bodyInput.value = '';
      button.disabled = false;
      button.textContent = 'Válasz elküldése →';
      if (data.status === 'in_progress') item.status = 'in_progress';
      updateCounts();
      renderList();
      await loadReplyHistory(messageId);
      showMessage(appMessage, data.historySaved === false
        ? 'A válasz e-mail elküldése sikerült, de az előzmény mentése nem fejeződött be. Frissítsd az oldalt, majd ellenőrizd a Supabase naplóit.'
        : 'A válasz e-mail sikeresen elküldve. A küldés bekerült az előzmények közé.');
      const newStatusSelect = $('statusEditor');
      if (newStatusSelect) newStatusSelect.value = item.status;
    } catch (error) {
      showMessage(appMessage, `Nem sikerült elküldeni a választ. ${error.message || ''}`, true);
      button.disabled = false;
      button.textContent = previousText;
    }
  }

  function renderDetail(item) {
    clearElement(detailPanel);
    if (!item) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'Válassz ki egy üzenetet a listából a részletek megtekintéséhez.';
      detailPanel.appendChild(empty);
      $('detailBadge').textContent = 'NINCS KIVÁLASZTVA';
      $('detailBadge').className = 'status new';
      return;
    }

    $('detailBadge').replaceWith(createStatusBadge(item.status));
    const newBadge = detailPanel.parentElement.querySelector('.panel-head .status');
    if (newBadge) newBadge.id = 'detailBadge';

    const title = document.createElement('h2');
    title.className = 'detail-title';
    title.textContent = item.subject || TYPE_LABELS[item.message_type] || 'Közönségüzenet';
    const meta = document.createElement('div');
    meta.className = 'detail-meta';
    const date = document.createElement('span');
    date.textContent = formatDate(item.created_at);
    const kind = document.createElement('span');
    kind.textContent = TYPE_LABELS[item.message_type] || 'Egyéb üzenet';
    meta.append(date, kind);
    detailPanel.append(title, meta);

    addDetailBlock(detailPanel, 'ÜZENET', item.message);
    addDetailBlock(detailPanel, 'NÉV', item.name);
    addDetailBlock(detailPanel, 'TÉMA / VENDÉG NEVE', item.subject);

    const emailBlock = document.createElement('div');
    emailBlock.className = 'detail-block';
    const emailLabel = document.createElement('label');
    emailLabel.textContent = 'E-MAIL-CÍM';
    emailBlock.appendChild(emailLabel);
    if (item.email) {
      const link = document.createElement('a');
      link.textContent = item.email;
      link.href = `mailto:${encodeURIComponent(item.email)}`;
      emailBlock.appendChild(link);
    } else {
      const noEmail = document.createElement('p');
      noEmail.textContent = 'A beküldő nem adott meg e-mail-címet.';
      emailBlock.appendChild(noEmail);
    }
    detailPanel.appendChild(emailBlock);

    const replySection = document.createElement('section');
    replySection.className = 'reply-section';
    const replyHeading = document.createElement('h3');
    replyHeading.textContent = 'Válaszelőzmények';
    const replyHistory = document.createElement('div');
    replyHistory.className = 'reply-history';
    replyHistory.id = 'replyHistory';
    replySection.append(replyHeading, replyHistory);

    if (item.email) {
      const form = document.createElement('form');
      form.className = 'reply-form';
      const formTitle = document.createElement('h3');
      formTitle.textContent = 'Válasz küldése';
      const recipient = document.createElement('p');
      recipient.className = 'reply-help';
      recipient.textContent = `Címzett: ${item.email}. A válasz a Rádió69 ellenőrzött feladói címéről érkezik.`;

      const subjectField = document.createElement('div');
      subjectField.className = 'field';
      const subjectLabel = document.createElement('label');
      subjectLabel.textContent = 'E-mail tárgya';
      const subjectInput = document.createElement('input');
      subjectInput.type = 'text';
      subjectInput.maxLength = 180;
      subjectInput.required = true;
      subjectInput.value = `Válasz – Rádió69 × Zsiványok Podcast`;
      subjectField.append(subjectLabel, subjectInput);

      const bodyField = document.createElement('div');
      bodyField.className = 'field';
      const bodyLabel = document.createElement('label');
      bodyLabel.textContent = 'Válasz szövege';
      const bodyInput = document.createElement('textarea');
      bodyInput.minLength = 5;
      bodyInput.maxLength = 5000;
      bodyInput.required = true;
      bodyInput.rows = 7;
      bodyInput.placeholder = 'Írd ide a látogatónak szánt válaszodat…';
      bodyField.append(bodyLabel, bodyInput);

      const send = document.createElement('button');
      send.type = 'submit';
      send.className = 'btn btn-primary';
      send.textContent = 'Válasz elküldése →';
      const help = document.createElement('p');
      help.className = 'reply-help';
      help.textContent = 'Az elküldés előtt megerősítést kérünk. A sikeres küldéseket és a sikertelen próbálkozásokat is rögzítjük az előzmények között.';
      form.append(formTitle, recipient, subjectField, bodyField, send, help);
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        sendReply(item.id, subjectInput, bodyInput, send);
      });
      replySection.appendChild(form);
    } else {
      const noEmail = document.createElement('p');
      noEmail.className = 'reply-empty';
      noEmail.textContent = 'A beküldő nem adott meg e-mail-címet, ezért innen nem küldhető válasz.';
      replySection.appendChild(noEmail);
    }
    detailPanel.appendChild(replySection);
    loadReplyHistory(item.id);

    const statusRow = document.createElement('div');
    statusRow.className = 'status-row';
    const field = document.createElement('div');
    field.className = 'field';
    const label = document.createElement('label');
    label.textContent = 'Üzenet állapota';
    label.htmlFor = 'statusEditor';
    const select = document.createElement('select');
    select.id = 'statusEditor';
    [
      ['new', 'Új'],
      ['in_progress', 'Folyamatban'],
      ['closed', 'Lezárva']
    ].forEach(([value, text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.appendChild(option);
    });
    select.value = item.status;
    field.append(label, select);
    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'btn btn-primary';
    save.textContent = 'Állapot mentése';
    save.addEventListener('click', () => updateStatus(item.id, select.value, save));
    statusRow.append(field, save);
    detailPanel.appendChild(statusRow);
  }

  function selectMessage(id) {
    selectedId = id;
    const item = messages.find(entry => entry.id === id);
    renderList();
    renderDetail(item);
  }

  async function loadMessages() {
    if (!db || !currentProfile || loading) return;
    loading = true;
    $('refreshBtn').disabled = true;
    $('refreshBtn').textContent = 'Betöltés…';
    hideMessage(appMessage);
    try {
      const { data, error } = await db
        .from('audience_messages')
        .select('id,created_at,message_type,name,email,subject,message,status,privacy_acknowledged')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      messages = Array.isArray(data) ? data : [];
      if (selectedId && !messages.some(item => item.id === selectedId)) selectedId = null;
      updateCounts();
      renderList();
      renderDetail(messages.find(item => item.id === selectedId) || null);
    } catch (error) {
      showMessage(appMessage, `Nem sikerült betölteni az üzeneteket. ${error.message || ''}`, true);
    } finally {
      loading = false;
      $('refreshBtn').disabled = false;
      $('refreshBtn').textContent = '↻ Frissítés';
    }
  }

  async function updateStatus(id, newStatus, button) {
    if (!['new', 'in_progress', 'closed'].includes(newStatus)) return;
    const previousText = button.textContent;
    button.disabled = true;
    button.textContent = 'Mentés…';
    hideMessage(appMessage);
    try {
      const { data, error } = await db
        .from('audience_messages')
        .update({ status: newStatus })
        .eq('id', id)
        .select('id,status')
        .single();
      if (error) throw error;
      if (!data) throw new Error('A módosítás nem érkezett vissza az adatbázisból.');
      const item = messages.find(entry => entry.id === id);
      if (item) item.status = data.status;
      updateCounts();
      renderList();
      renderDetail(item || null);
      showMessage(appMessage, 'Az üzenet állapotát sikeresen elmentettük.');
    } catch (error) {
      showMessage(appMessage, `Nem sikerült elmenteni az állapotot. ${error.message || ''}`, true);
      button.disabled = false;
      button.textContent = previousText;
    }
  }

  async function init() {
    if (!window.supabase?.createClient || !/^https:\/\/.+\.supabase\.co$/.test(cfg.url || '') || !cfg.publishableKey) {
      showMessage($('loginMessage'), 'A Supabase beállítás nem érhető el. Ellenőrizd a supabase-config.js fájlt és a Supabase JS könyvtár betöltését.', true);
      loginButton.disabled = true;
      return;
    }

    db = window.supabase.createClient(cfg.url, cfg.publishableKey);
    db.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setLoggedOut();
      } else if (session?.user) {
        Promise.resolve().then(() => openAdmin(session.user));
      }
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
      const { error } = await db.auth.signInWithPassword({
        email: $('loginEmail').value.trim(),
        password: $('loginPassword').value
      });
      if (error) throw error;
    } catch (error) {
      showMessage($('loginMessage'), error.message || 'Nem sikerült a belépés.', true);
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = 'Belépés az üzenetekhez →';
    }
  });

  logoutButton.addEventListener('click', async () => {
    logoutButton.disabled = true;
    const { error } = await db.auth.signOut();
    if (error) showMessage(appMessage, error.message || 'Nem sikerült kilépni.', true);
    setLoggedOut();
    logoutButton.disabled = false;
  });

  $('refreshBtn').addEventListener('click', loadMessages);
  statusFilter.addEventListener('change', renderList);
  searchInput.addEventListener('input', renderList);
  init().catch(error => showMessage($('loginMessage'), error.message || 'Ismeretlen inicializálási hiba.', true));
})();
