/* Rádió69 – cikkreakciók és moderált hozzászólások, magyar/angol felülettel */
(() => {
  'use strict';

  const CFG = window.RADIO69_SUPABASE_CONFIG || {};
  const STRINGS = {
    hu: {
      kicker: 'RÁDIÓ69 · KÖZÖSSÉG', heading: 'Te mit gondolsz?',
      intro: 'Reagálj a cikkre, vagy oszd meg a véleményedet. A hozzászólások moderálás után jelennek meg.',
      reactions: 'Reakciók', like: 'Tetszik', helpful: 'Hasznos', interesting: 'Érdekes',
      comments: 'Hozzászólások', approvedCount: n => `${n} jóváhagyott hozzászólás`,
      loading: 'A hozzászólások betöltése…', replyTo: 'Válasz erre', cancelReply: 'Válasz törlése ×',
      writeOpinion: 'Írd meg a véleményed!', approval: 'A hozzászólásod csak szerkesztőségi jóváhagyás után jelenik meg nyilvánosan.',
      displayName: 'Megjelenő név', namePlaceholder: 'Hogyan szólíthatunk?', comment: 'Hozzászólás',
      commentPlaceholder: 'Mondd el, mit gondolsz a cikkről…', honeypot: 'Weboldal',
      submit: 'Hozzászólás beküldése', privacy: 'Kérjük, maradj kulturált, és ne adj meg érzékeny személyes adatot.',
      reply: 'Válasz', reader: 'Olvasó', empty: 'Még nincs jóváhagyott hozzászólás. Légy te az első, aki megosztja a véleményét!',
      loadError: 'A közösségi funkciók most nem érhetők el. Kérjük, próbáld újra később.',
      connectionError: 'A közösségi funkciók adatbázis-kapcsolata jelenleg nem érhető el. Kérjük, próbáld újra később.',
      loadMessage: 'A hozzászólások betöltése nem sikerült. Az oldal többi része továbbra is használható.',
      reactionError: 'A reakciót most nem sikerült menteni. Kérjük, próbáld újra.',
      invalidForm: 'Ellenőrizd a nevet és a hozzászólás hosszát.',
      submitSuccess: 'Köszönjük! A hozzászólásod megérkezett, és szerkesztőségi jóváhagyás után jelenik meg.',
      submitError: 'A hozzászólást most nem sikerült elküldeni. Kérjük, próbáld újra.'
    },
    en: {
      kicker: 'RADIO69 · COMMUNITY', heading: 'What do you think?',
      intro: 'React to the article or share your thoughts. Comments appear after moderation.',
      reactions: 'Reactions', like: 'Like', helpful: 'Helpful', interesting: 'Interesting',
      comments: 'Comments', approvedCount: n => `${n} approved comments`,
      loading: 'Loading comments…', replyTo: 'Replying to', cancelReply: 'Cancel reply ×',
      writeOpinion: 'Share your thoughts!', approval: 'Your comment will be visible after editorial approval.',
      displayName: 'Display name', namePlaceholder: 'What should we call you?', comment: 'Comment',
      commentPlaceholder: 'Tell us what you think about this article…', honeypot: 'Website',
      submit: 'Submit comment', privacy: 'Please be respectful and do not share sensitive personal information.',
      reply: 'Reply', reader: 'Reader', empty: 'There are no approved comments yet. Be the first to share your thoughts!',
      loadError: 'Community features are currently unavailable. Please try again later.',
      connectionError: 'The community database connection is currently unavailable. Please try again later.',
      loadMessage: 'Comments could not be loaded. The rest of the page is still available.',
      reactionError: 'Your reaction could not be saved. Please try again.',
      invalidForm: 'Please check your name and comment length.',
      submitSuccess: 'Thank you! Your comment has been received and will appear after editorial approval.',
      submitError: 'Your comment could not be submitted. Please try again.'
    }
  };

  const language = () => {
    const value = document.documentElement.dataset.siteLanguage || document.documentElement.lang || 'hu';
    return String(value).toLowerCase().startsWith('en') ? 'en' : 'hu';
  };
  const t = key => STRINGS[language()][key];
  const REACTIONS = [
    { id: 'like', icon: '❤️' },
    { id: 'helpful', icon: '👍' },
    { id: 'interesting', icon: '😮' }
  ];
  let sharedClient = null;

  function getClient() {
    if (sharedClient) return sharedClient;
    if (!window.supabase?.createClient || !/^https:\/\/.+\.supabase\.co$/.test(CFG.url || '') || !CFG.publishableKey) {
      throw new Error('Supabase client not configured');
    }
    sharedClient = window.supabase.createClient(CFG.url, CFG.publishableKey);
    return sharedClient;
  }

  function createVisitorUuid() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    if (!window.crypto?.getRandomValues) throw new Error('Secure random generator unavailable');
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function getVisitorToken() {
    const key = 'radio69_article_visitor_v1';
    try {
      let value = localStorage.getItem(key);
      if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
        value = createVisitorUuid();
        localStorage.setItem(key, value);
      }
      return value;
    } catch (_) {
      return createVisitorUuid();
    }
  }

  function showMessage(element, text, isError = false) {
    element.textContent = text;
    element.classList.add('is-visible');
    element.classList.toggle('is-error', isError);
  }

  function buildMarkup() {
    return `
      <div class="r69-community-head">
        <span class="r69-community-kicker">${t('kicker')}</span>
        <h2>${t('heading')}</h2>
        <p>${t('intro')}</p>
      </div>
      <div class="r69-reactions" aria-label="${t('reactions')}">
        ${REACTIONS.map(item => `<button class="r69-reaction" type="button" data-reaction="${item.id}" aria-pressed="false"><span aria-hidden="true">${item.icon}</span><span>${t(item.id)}</span><b class="r69-reaction-count">0</b></button>`).join('')}
      </div>
      <div class="r69-comments-head"><h3>${t('comments')}</h3><span class="r69-comment-count" data-comment-count>${t('approvedCount')(0)}</span></div>
      <div class="r69-community-message" data-community-message role="status" aria-live="polite"></div>
      <div class="r69-comment-list" data-comment-list><p class="r69-comment-empty">${t('loading')}</p></div>
      <div class="r69-comment-form-wrap">
        <div data-reply-target hidden><p class="r69-comment-privacy"></p><button class="r69-cancel-reply" type="button">${t('cancelReply')}</button></div>
        <h4>${t('writeOpinion')}</h4>
        <p>${t('approval')}</p>
        <form class="r69-comment-form" data-comment-form>
          <label>${t('displayName')}<input name="author_name" type="text" maxlength="40" minlength="2" autocomplete="nickname" required placeholder="${t('namePlaceholder')}"></label>
          <label>${t('comment')}<textarea name="body" maxlength="1000" minlength="3" required placeholder="${t('commentPlaceholder')}"></textarea></label>
          <label class="r69-honeypot" aria-hidden="true">${t('honeypot')}<input name="website" type="text" tabindex="-1" autocomplete="off"></label>
          <button class="r69-comment-submit" type="submit">${t('submit')}</button>
          <p class="r69-comment-privacy">${t('privacy')}</p>
        </form>
      </div>`;
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(language() === 'en' ? 'en-GB' : 'hu-HU', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  }

  function createCommentCard(comment, isReply, onReply) {
    const card = document.createElement('article');
    card.className = `r69-comment${isReply ? ' is-reply' : ''}`;
    const top = document.createElement('div');
    top.className = 'r69-comment-top';
    const author = document.createElement('strong');
    author.className = 'r69-comment-author';
    author.textContent = comment.author_name || t('reader');
    const date = document.createElement('time');
    date.className = 'r69-comment-date';
    date.dateTime = comment.created_at || '';
    date.textContent = formatDate(comment.created_at);
    top.append(author, date);
    const body = document.createElement('p');
    body.className = 'r69-comment-body';
    body.textContent = comment.body || '';
    card.append(top, body);
    if (!isReply) {
      const actions = document.createElement('div');
      actions.className = 'r69-comment-actions';
      const reply = document.createElement('button');
      reply.className = 'r69-reply-btn';
      reply.type = 'button';
      reply.textContent = t('reply');
      reply.addEventListener('click', () => onReply(comment));
      actions.appendChild(reply);
      card.appendChild(actions);
    }
    return card;
  }

  async function mount(container, articleId, dbOverride) {
    if (!container || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(articleId || ''))) return;
    if (container.dataset.communityMounted === 'true') return;
    container.dataset.communityMounted = 'true';
    container.classList.add('radio69-community');
    container.innerHTML = buildMarkup();

    const message = container.querySelector('[data-community-message]');
    const list = container.querySelector('[data-comment-list]');
    const count = container.querySelector('[data-comment-count]');
    const form = container.querySelector('[data-comment-form]');
    const replyTarget = container.querySelector('[data-reply-target]');
    let parentId = null;
    let db;
    let visitorToken;

    try {
      db = dbOverride || getClient();
      visitorToken = getVisitorToken();
    } catch (error) {
      console.warn('[Rádió69 közösség] adatbázis-kapcsolat nem érhető el:', error);
      list.innerHTML = `<p class="r69-comment-empty">${t('connectionError')}</p>`;
      showMessage(message, t('connectionError'), true);
      container.querySelectorAll('[data-reaction], [data-comment-form] button').forEach(control => { control.disabled = true; });
      form.querySelectorAll('input, textarea').forEach(control => { control.disabled = true; });
      return;
    }

    const setReply = comment => {
      parentId = comment?.id || null;
      replyTarget.hidden = !parentId;
      if (parentId) {
        replyTarget.querySelector('p').textContent = `${t('replyTo')}: ${comment.author_name}`;
        form.querySelector('textarea[name="body"]').focus();
      }
    };
    replyTarget.querySelector('button').addEventListener('click', () => setReply(null));

    async function refreshSummary() {
      const { data, error } = await db.rpc('get_article_reaction_summary', {
        p_article_id: articleId,
        p_visitor_token: visitorToken
      });
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      for (const item of REACTIONS) {
        const row = rows.find(entry => entry.reaction_type === item.id);
        const button = container.querySelector(`[data-reaction="${item.id}"]`);
        if (!button) continue;
        button.querySelector('.r69-reaction-count').textContent = String(row?.reaction_count ?? 0);
        button.setAttribute('aria-pressed', row?.mine ? 'true' : 'false');
      }
      const approved = Number(rows[0]?.approved_comments ?? 0);
      count.textContent = t('approvedCount')(approved);
    }

    async function refreshComments() {
      const { data, error } = await db
        .from('article_comments')
        .select('id,article_id,parent_id,author_name,body,created_at')
        .eq('article_id', articleId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      const comments = Array.isArray(data) ? data : [];
      const roots = comments.filter(item => !item.parent_id);
      list.replaceChildren();
      if (!roots.length) {
        const empty = document.createElement('p');
        empty.className = 'r69-comment-empty';
        empty.textContent = t('empty');
        list.appendChild(empty);
        count.textContent = t('approvedCount')(0);
        return;
      }
      const fragment = document.createDocumentFragment();
      for (const comment of roots) {
        const thread = document.createElement('div');
        thread.appendChild(createCommentCard(comment, false, setReply));
        const replies = comments.filter(item => item.parent_id === comment.id)
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        for (const reply of replies) thread.appendChild(createCommentCard(reply, true, setReply));
        fragment.appendChild(thread);
      }
      list.appendChild(fragment);
      count.textContent = t('approvedCount')(comments.length);
    }

    container.querySelectorAll('[data-reaction]').forEach(button => {
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          const { error } = await db.rpc('toggle_article_reaction', {
            p_article_id: articleId,
            p_visitor_token: visitorToken,
            p_reaction_type: button.dataset.reaction
          });
          if (error) throw error;
          await refreshSummary();
        } catch (error) {
          console.error('[Rádió69 közösség] reakciómentési hiba:', error);
          showMessage(message, t('reactionError'), true);
        } finally {
          button.disabled = false;
        }
      });
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      const formData = new FormData(form);
      const authorName = String(formData.get('author_name') || '').trim();
      const body = String(formData.get('body') || '').trim();
      const website = String(formData.get('website') || '').trim();
      if (authorName.length < 2 || authorName.length > 40 || body.length < 3 || body.length > 1000) {
        showMessage(message, t('invalidForm'), true);
        return;
      }
      submit.disabled = true;
      try {
        const { error } = await db.rpc('submit_article_comment', {
          p_article_id: articleId,
          p_author_name: authorName,
          p_body: body,
          p_visitor_token: visitorToken,
          p_parent_id: parentId,
          p_website: website
        });
        if (error) throw error;
        form.reset();
        setReply(null);
        showMessage(message, t('submitSuccess'));
      } catch (error) {
        console.error('[Rádió69 közösség] hozzászólás-beküldési hiba:', error);
        showMessage(message, t('submitError'), true);
      } finally {
        submit.disabled = false;
      }
    });

    try {
      await Promise.all([refreshSummary(), refreshComments()]);
    } catch (error) {
      console.error('[Rádió69 közösség] betöltési hiba:', error);
      list.innerHTML = `<p class="r69-comment-empty">${t('loadError')}</p>`;
      showMessage(message, t('loadMessage'), true);
    }
  }

  function autoMount() {
    document.querySelectorAll('[data-radio69-community]').forEach(node => {
      mount(node, node.dataset.articleId).catch(error => {
        console.error('[Rádió69 közösség] inicializálási hiba:', error);
      });
    });
  }

  window.Radio69ArticleCommunity = { mount, autoMount };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', autoMount, { once: true });
  else autoMount();
})();
