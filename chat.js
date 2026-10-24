(() => {
  const panel = document.getElementById('aiChatPanel');
  const toggle = document.getElementById('aiChatToggle');
  const close = document.getElementById('aiChatClose');
  const newChat = document.getElementById('aiChatNew');
  const form = document.getElementById('aiChatForm');
  const input = document.getElementById('aiChatInput');
  const send = document.getElementById('aiChatSend');
  const messagesEl = document.getElementById('aiChatMessages');
  const suggestions = document.getElementById('aiChatSuggestions');
  const statusText = document.getElementById('aiChatStatusText');
  const statusDot = document.getElementById('aiChatStatusDot');
  const statusWrap = statusText?.parentElement;
  if (!panel || !toggle || !form || !input || !messagesEl) return;

  const history = [];
  let aiAvailable = false;
  let sending = false;
  const MAX_HISTORY = 12;

  function setStatus(kind, text) {
    statusText.textContent = text;
    statusWrap.classList.remove('is-online', 'is-demo', 'is-configured');
    statusWrap.classList.add(kind === 'online' ? 'is-online' : (kind === 'configured' ? 'is-configured' : 'is-demo'));
    statusDot.setAttribute('aria-label', text);
  }

  async function checkHealth() {
    // GitHub Pages only serves static files; it cannot host server.js or the /api endpoints.
    // Keep the chat in safe demo mode there, without issuing needless 404 requests.
    const host = location.hostname.toLowerCase();

if (
  host.endsWith('.github.io') ||
  host === 'radio69zsivanyok.hu' ||
  host === 'www.radio69zsivanyok.hu'
) {
  aiAvailable = false;
  setStatus('demo', 'Próba mód – AI nincs összekötve');
  return;
}
    try {
      const response = await fetch('/api/health', { headers: { 'Accept': 'application/json' }, cache: 'no-store' });
      if (!response.ok || !(response.headers.get('content-type') || '').includes('application/json')) throw new Error('No chat API');
      const data = await response.json();
      aiAvailable = Boolean(data.configured);
      if (aiAvailable) setStatus('configured', 'API-kulcs beállítva');
      else setStatus('demo', 'AI-kulcs beállításra vár');
    } catch (_) {
      aiAvailable = false;
      setStatus('demo', 'Próba mód – AI nincs összekötve');
    }
  }

  function scrollToBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }

  function appendMessage(role, content, options = {}) {
    const wrap = document.createElement('div');
    wrap.className = `ai-chat-message ${role === 'user' ? 'user-message' : 'bot-message'}${options.typing ? ' ai-chat-typing' : ''}`;
    if (options.typing) {
      const bubble = document.createElement('div');
      bubble.className = 'ai-chat-bubble';
      for (let i = 0; i < 3; i++) bubble.appendChild(document.createElement('span'));
      wrap.appendChild(bubble);
    } else {
      const bubble = document.createElement('div');
      bubble.className = 'ai-chat-bubble';
      appendLinkedText(bubble, content);
      wrap.appendChild(bubble);
      const time = document.createElement('span');
      time.className = 'ai-chat-time';
      time.textContent = role === 'user' ? 'Te' : 'Rádió69 asszisztens';
      wrap.appendChild(time);
    }
    messagesEl.appendChild(wrap);
    scrollToBottom();
    return wrap;
  }

  function appendLinkedText(container, text) {
    // Render plain text and make only explicit HTTP(S) URLs clickable.
    const source = String(text ?? '');
    const urlPattern = /https?:\/\/[^\s<>]+/g;
    let lastIndex = 0;
    let match;
    while ((match = urlPattern.exec(source)) !== null) {
      container.appendChild(document.createTextNode(source.slice(lastIndex, match.index)));
      let rawUrl = match[0];
      let trailing = '';
      while (/[),.!?;:]$/.test(rawUrl)) { trailing = rawUrl.slice(-1) + trailing; rawUrl = rawUrl.slice(0, -1); }
      try {
        const parsed = new URL(rawUrl);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
          const link = document.createElement('a');
          link.href = parsed.href;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = rawUrl;
          container.appendChild(link);
        } else container.appendChild(document.createTextNode(rawUrl));
      } catch (_) { container.appendChild(document.createTextNode(rawUrl)); }
      if (trailing) container.appendChild(document.createTextNode(trailing));
      lastIndex = urlPattern.lastIndex;
    }
    container.appendChild(document.createTextNode(source.slice(lastIndex)));
  }

  function clearMessages() {
    history.length = 0;
    messagesEl.innerHTML = '';
    appendMessage('assistant', 'Szia! 👋 Kérdezz bátran a Rádió69-ről, a Zsiványok Podcast-ról vagy az oldalon található tartalmakról.');
    suggestions.hidden = false;
    input.focus();
  }

  function openChat() {
    panel.hidden = false;
    toggle.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'AI chat bezárása');
    toggle.querySelector('.ai-chat-launcher-icon').textContent = '×';
    input.focus();
  }
  function closeChat() {
    panel.hidden = true;
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'AI chat megnyitása');
    toggle.querySelector('.ai-chat-launcher-icon').textContent = '✦';
  }

  function localReply(question) {
    const q = question.toLocaleLowerCase('hu-HU');
    if (/\b(sz(i|í)a|helló|hello|üdv|jó napot)\b/.test(q)) {
      return 'Szia! 😊 A Rádió69 és a Zsiványok Podcast online magazinjának asszisztense vagyok. Miben segíthetek?';
    }
    if (/zsivány|podcast|youtube|epizód|epizod|videó|video/.test(q)) {
      return 'A Zsiványok Podcast felületeit itt találod:\nYouTube: https://www.youtube.com/channel/UCzw38T0c9qtx95ikFBXhTig\nWeboldal: https://dave-cast.webnode.hu/\nApple Podcasts: https://podcasts.apple.com/us/podcast/zsiv%C3%A1nyok/id1674206184\n\nA legfrissebb epizódokról a csatornán érdemes tájékozódni.';
    }
    if (/rádió.?69|radio.?69|rádió|radio|stream|hallgat/.test(q)) {
      return 'A Rádió69 hivatalos weboldala: https://radio69.hu/\nA közösségi felületeket a weboldal „Közösség” részében találod. Ez az online magazin nem tartalmaz beépített rádiólejátszót.';
    }
    if (/facebook|instagram|tiktok|közösség|közösségi|youtube csatorna|twitter|\bx\b/.test(q)) {
      return 'Görgess le a főoldalon a „Kövess minket mindenhol” részhez. Ott találod a Rádió69 közösségi hivatkozásait, a Zsiványok Podcast YouTube-csatornáját és további azonosított felületeit.';
    }
    if (/cikk|hír|hírek|érdekesség|téma|olvasnivaló|magazin/.test(q)) {
      return 'Az „Olvasnivalók” részben találod a cikkeket. A „Témák” kategóriái között podcastvilág, zene és előadók, kulisszatitkok, valamint digitális kultúra témákra szűrhetsz. Fontos: a jelenlegi cikkek mintaanyagok, közzététel előtt frissíteni kell őket.';
    }
    if (/ai|mesterséges intelligencia|bekapcsol|működ|miért nem/.test(q)) {
      return 'Most próba módban futok: néhány, a weboldallal kapcsolatos gyakori kérdésre tudok válaszolni. A valódi, szabadon beszélgető AI-hoz a projekt Node.js szerverét kell elindítani egy saját OpenAI API-kulccsal. A kulcsot soha nem szabad a böngészős kódba írni.';
    }
    if (/kapcsolat|elérhetőség|elerhetoseg|email|e-mail/.test(q)) {
      return 'A Rádió69 weboldalát a https://radio69.hu/ címen találod. A Zsiványok Podcast kapcsolódó weboldala: https://dave-cast.webnode.hu/. A kapcsolati adatokhoz ezeken az oldalakon érdemes fordulni.';
    }
    return 'Ez a chat jelenleg próba módban van, ezért csak néhány gyakori, az oldallal kapcsolatos kérdésre tudok biztos választ adni. A teljes AI-beszélgetés bekapcsolásához indítsd el a projektben található Node.js szervert, és állítsd be az OPENAI_API_KEY kulcsot a .env fájlban. A beállítás lépései a README.md fájlban vannak.';
  }

  async function requestAI() {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ messages: history.slice(-MAX_HISTORY) })
    });
    const type = response.headers.get('content-type') || '';
    if (response.status === 404 || !type.includes('application/json')) throw new Error('CHAT_API_UNAVAILABLE');
    let data = {};
    try { data = await response.json(); } catch (_) { /* handled below */ }
    if (!response.ok) throw new Error(data.error || 'Az AI jelenleg nem tud válaszolni. Próbáld újra később.');
    if (!data.reply) throw new Error('Üres válasz érkezett az AI-tól. Próbáld újra.');
    return data.reply;
  }

  async function sendMessage(value) {
    const text = value.trim();
    if (!text || sending) return;
    sending = true;
    suggestions.hidden = true;
    appendMessage('user', text);
    history.push({ role: 'user', content: text });
    input.value = '';
    input.style.height = 'auto';
    input.disabled = true;
    send.disabled = true;
    const typing = appendMessage('assistant', '', { typing: true });
    try {
      let reply;
      if (aiAvailable) {
        reply = await requestAI();
      } else {
        await new Promise(resolve => setTimeout(resolve, 320));
        reply = localReply(text);
      }
      typing.remove();
      appendMessage('assistant', reply);
      if (aiAvailable) setStatus('online', 'AI asszisztens online');
      history.push({ role: 'assistant', content: reply });
      if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
    } catch (error) {
      typing.remove();
      const message = error.message === 'CHAT_API_UNAVAILABLE'
        ? 'Az oldal statikus tárhelyen fut, ezért az AI-szerver nem érhető el. Most próba módban válaszolok. A valódi AI-hoz a README.md útmutatójában leírt Node.js szervert is telepíteni kell.'
        : (error.message || 'Hiba történt. Próbáld újra később.');
      if (/kredit|számlázás|használati korlát|nincs elérhető/i.test(message)) setStatus('demo', 'API-számlázás ellenőrzése');
      else if (aiAvailable) setStatus('configured', 'API-kulcs beállítva');
      appendMessage('assistant', message);
    } finally {
      sending = false;
      input.disabled = false;
      send.disabled = false;
      input.focus();
    }
  }

  toggle.addEventListener('click', () => panel.hidden ? openChat() : closeChat());
  close.addEventListener('click', closeChat);
  newChat.addEventListener('click', clearMessages);
  form.addEventListener('submit', event => {
    event.preventDefault();
    sendMessage(input.value);
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 105)}px`;
  });
  suggestions.querySelectorAll('button').forEach(button => button.addEventListener('click', () => sendMessage(button.textContent)));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !panel.hidden) closeChat(); });

  checkHealth();
})();
