/* Rádió69 – cikkreakciók és moderált hozzászólások */
(() => {
  'use strict';

  const CFG = window.RADIO69_SUPABASE_CONFIG || {};
  const REACTIONS = [
    { id: 'like', icon: '❤️', label: 'Tetszik' },
    { id: 'helpful', icon: '👍', label: 'Hasznos' },
    { id: 'interesting', icon: '😮', label: 'Érdekes' }
  ];
  let sharedClient = null;

  function getClient() {
    if (sharedClient) return sharedClient;
    if (!window.supabase?.createClient || !/^https:\/\/.+\.supabase\.co$/.test(CFG.url || '') || !CFG.publishableKey) {
      throw new Error('A közösségi funkciók adatbázis-kapcsolata még nincs beállítva.');
    }
    sharedClient = window.supabase.createClient(CFG.url, CFG.publishableKey);
    return sharedClient;
  }

  function getVisitorToken() {
    const key = 'radio69_article_visitor_v1';
    try {
      let value = localStorage.getItem(key);
      if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
        value = crypto.randomUUID();
        localStorage.setItem(key, value);
      }
      return value;
    } catch (_) {
      return crypto.randomUUID();
    }
  }

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  const formatDate = value => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  function showMessage(el, text, isError = false) {
    el.textContent = text;
    el.classList.add('is-visible');
    el.classList.toggle('is-error', isError);
  }

  function buildMarkup() {
    return `
      <div class="r69-community-head">
        <span class="r69-community-kicker">RÁDIÓ69 · KÖZÖSSÉG</span>
        <h2>Te mit gondolsz?</h2>
        <p>Reagálj a cikkre, vagy oszd meg a véleményedet. A hozzászólások moderálás után jelennek meg.</p>
      </div>
      <div class="r69-reactions" aria-label="Reakciók">
        ${REACTIONS.map(item => `<button class="r69-reaction" type="button" data-reaction="${item.id}" aria-pressed="false"><span aria-hidden="true">${item.icon}</span><span>${item.label}</span><b class="r69-reaction-count">0</b></button>`).join('')}
      </div>
      <div class="r69-comments-head"><h3>Hozzászólások</h3><span class="r69-comment-count" data-comment-count>0 jóváhagyott hozzászólás</span></div>
      <div class="r69-community-message" data-community-message role="status" aria-live="polite"></div>
      <div class="r69-comment-list" data-comment-list><p class="r69-comment-empty">A hozzászólások betöltése…</p></div>
      <div class="r69-comment-form-wrap">
        <div data-reply-target hidden><p class="r69-comment-privacy">Válasz erre a hozzászólásra.</p><button class="r69-cancel-reply" type="button">Válasz törlése ×</button></div>
        <h4>Írd meg a véleményed!</h4>
        <p>A hozzászólásod csak szerkesztőségi jóváhagyás után jelenik meg nyilvánosan.</p>
        <form class="r69-comment-form" data-comment-form>
          <label>Megjelenő név<input name="author_name" type="text" maxlength="40" minlength="2" autocomplete="nickname" required placeholder="Hogyan szólíthatunk?"></label>
          <label>Hozzászólás<textarea name="body" maxlength="1000" minlength="3" required placeholder="Mondd el, mit gondolsz a cikkről…"></textarea></label>
          <label class="r69-honeypot" aria-hidden="true">Weboldal<input name="website" type="text" tabindex="-1" autocomplete="off"></label>
          <button class="r69-comment-submit" type="submit">Hozzászólás beküldése</button>
          <p class="r69-comment-privacy">Kérjük, maradj kulturált, és ne adj meg érzékeny személyes adatot.</p>
        </form>
      </div>`;
  }

  function createCommentCard(comment, isReply, onReply) {
    const card = document.createElement('article');
    card.className = `r69-comment${isReply ? ' is-reply' : ''}`;
    const top = document.createElement('div');
    top.className = 'r69-comment-top';
    const author = document.createElement('strong');
    author.className = 'r69-comment-author';
    author.textContent = comment.author_name || 'Olvasó';
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
      reply.textContent = 'Válasz';
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

    const db = dbOverride || getClient();
    const visitorToken = getVisitorToken();
    const message = container.querySelector('[data-community-message]');
    const list = container.querySelector('[data-comment-list]');
    const count = container.querySelector('[data-comment-count]');
    const form = container.querySelector('[data-comment-form]');
    const replyTarget = container.querySelector('[data-reply-target]');
    let parentId = null;

    const setReply = comment => {
      parentId = comment?.id || null;
      replyTarget.hidden = !parentId;
      if (parentId) {
        replyTarget.querySelector('p').textContent = `Válasz erre: ${comment.author_name}`;
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
      count.textContent = `${approved} jóváhagyott hozzászólás`;
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
        empty.textContent = 'Még nincs jóváhagyott hozzászólás. Légy te az első, aki megosztja a véleményét!';
        list.appendChild(empty);
        count.textContent = '0 jóváhagyott hozzászólás';
        return;
      }
      const fragment = document.createDocumentFragment();
      for (const comment of roots) {
        const thread = document.createElement('div');
        thread.appendChild(createCommentCard(comment, false, setReply));
        const replies = comments.filter(item => item.parent_id === comment.id).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        for (const reply of replies) thread.appendChild(createCommentCard(reply, true, setReply));
        fragment.appendChild(thread);
      }
      list.appendChild(fragment);
      count.textContent = `${comments.length} jóváhagyott hozzászólás`;
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
          showMessage(message, error?.message || 'A reakciót most nem sikerült menteni.', true);
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
        showMessage(message, 'Ellenőrizd a nevet és a hozzászólás hosszát.', true);
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
        showMessage(message, 'Köszönjük! A hozzászólásod megérkezett, és szerkesztőségi jóváhagyás után jelenik meg.');
      } catch (error) {
        showMessage(message, error?.message || 'A hozzászólást most nem sikerült elküldeni.', true);
      } finally {
        submit.disabled = false;
      }
    });

    try {
      await Promise.all([refreshSummary(), refreshComments()]);
    } catch (error) {
      console.error('[Rádió69 közösség] betöltési hiba:', error);
      list.innerHTML = '<p class="r69-comment-empty">A közösségi funkciók most nem érhetők el. Kérjük, próbáld újra később.</p>';
      showMessage(message, 'A hozzászólások betöltése nem sikerült. Az oldal többi része továbbra is használható.', true);
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
