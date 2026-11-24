/* Rádió69 × Zsiványok Podcast – cikkmegosztás */
(() => {
  'use strict';

  if (window.__radio69ShareInstalled) return;
  window.__radio69ShareInstalled = true;

  let activeTrigger = null;
  let activeArticle = null;
  let overlay;
  let statusLine;

  const articleDetails = () => {
    const heading = document.querySelector('.article-header h1, .longform-article h1, article h1, main h1, h1');
    const description = document.querySelector('.article-deck, .article-intro');
    const metaDescription = document.querySelector('meta[name="description"]')?.content || '';
    return {
      title: (heading?.textContent || document.querySelector('meta[property="og:title"]')?.content || document.title || 'Rádió69 × Zsiványok Podcast').trim(),
      text: (description?.textContent || metaDescription).trim(),
      url: window.location.href
    };
  };

  const makeElement = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };

  const showStatus = message => {
    if (statusLine) statusLine.textContent = message;
  };

  const copyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(activeArticle.url);
        showStatus('A cikk linkjét a vágólapra másoltuk.');
      } else {
        window.prompt('Másold ki a cikk hivatkozását:', activeArticle.url);
        showStatus('A hivatkozást kimásolhatod a megjelenő mezőből.');
      }
    } catch (error) {
      window.prompt('Másold ki a cikk hivatkozását:', activeArticle.url);
      showStatus('A hivatkozást kimásolhatod a megjelenő mezőből.');
    }
  };

  const shareWithDevice = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: activeArticle.title, text: activeArticle.text, url: activeArticle.url });
        showStatus('');
      } catch (error) {
        if (error?.name !== 'AbortError') {
          await copyLink();
          showStatus('A megosztás most nem indult el; a cikk linkjét kimásoltuk.');
        }
      }
    } else {
      await copyLink();
      showStatus('A linket Messengerben vagy más alkalmazásban is elküldheted.');
    }
  };

  const closeDialog = () => {
    if (!overlay) return;
    overlay.hidden = true;
    document.body.classList.remove('radio69-share-open');
    if (activeTrigger && typeof activeTrigger.focus === 'function') activeTrigger.focus();
  };

  const addOption = ({ icon, label, description, href, action, className = '' }) => {
    const option = href
      ? makeElement('a', `radio69-share-option ${className}`.trim())
      : makeElement('button', `radio69-share-option ${className}`.trim());
    if (href) {
      option.href = href;
      option.target = '_blank';
      option.rel = 'noopener noreferrer';
    } else {
      option.type = 'button';
      option.addEventListener('click', action);
    }
    const glyph = makeElement('span', 'radio69-share-glyph', icon);
    glyph.setAttribute('aria-hidden', 'true');
    const labels = makeElement('span', 'radio69-share-option-copy');
    labels.append(makeElement('strong', '', label), makeElement('small', '', description));
    option.append(glyph, labels);
    return option;
  };

  const ensureDialog = () => {
    if (overlay) return;
    overlay = makeElement('div', 'radio69-share-overlay');
    overlay.id = 'radio69ShareDialog';
    overlay.hidden = true;
    overlay.setAttribute('role', 'presentation');

    const dialog = makeElement('section', 'radio69-share-dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'radio69ShareTitle');
    dialog.setAttribute('aria-describedby', 'radio69ShareHint');

    const header = makeElement('div', 'radio69-share-header');
    const headingWrap = makeElement('div', 'radio69-share-heading');
    headingWrap.append(
      makeElement('span', 'radio69-share-kicker', 'RÁDIÓ69 × ZSIVÁNYOK'),
      makeElement('h2', '', 'Cikk megosztása')
    );
    headingWrap.querySelector('h2').id = 'radio69ShareTitle';
    const close = makeElement('button', 'radio69-share-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Megosztási ablak bezárása');
    close.addEventListener('click', closeDialog);
    header.append(headingWrap, close);

    const articleTitle = makeElement('p', 'radio69-share-article-title');
    articleTitle.id = 'radio69ShareArticleTitle';
    const hint = makeElement('p', 'radio69-share-hint', 'Válaszd ki, hol szeretnéd megosztani ezt a cikket.');
    hint.id = 'radio69ShareHint';
    const options = makeElement('div', 'radio69-share-options');
    options.append(
      addOption({
        icon: 'f', label: 'Facebook', description: 'Megosztás Facebookon', className: 'facebook',
        href: '#',
      }),
      addOption({
        icon: '◉', label: 'WhatsApp', description: 'Küldés WhatsAppon', className: 'whatsapp',
        href: '#',
      }),
      addOption({
        icon: '➤', label: 'Telegram', description: 'Küldés Telegramon', className: 'telegram',
        href: '#',
      }),
      addOption({
        icon: '𝕏', label: 'X', description: 'Bejegyzés közzététele', className: 'xshare',
        href: '#',
      }),
      addOption({
        icon: '✉', label: 'E-mail', description: 'Cikk elküldése levélben', className: 'email',
        href: '#',
      }),
      addOption({
        icon: '↗', label: 'Messenger és más appok', description: 'Megnyitás a telefon megosztási paneljén', className: 'native',
        action: shareWithDevice
      }),
      addOption({
        icon: '▣', label: 'Link másolása', description: 'A hivatkozás vágólapra másolása', className: 'copy',
        action: copyLink
      })
    );
    statusLine = makeElement('p', 'radio69-share-status', '');
    statusLine.setAttribute('role', 'status');
    statusLine.setAttribute('aria-live', 'polite');
    dialog.append(header, articleTitle, hint, options, statusLine);
    overlay.appendChild(dialog);
    overlay.addEventListener('click', event => {
      if (event.target === overlay) closeDialog();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && overlay && !overlay.hidden) closeDialog();
    });
    document.body.appendChild(overlay);
  };

  const updateLinks = () => {
    const encodedUrl = encodeURIComponent(activeArticle.url);
    const encodedTitle = encodeURIComponent(activeArticle.title);
    const encodedText = encodeURIComponent(`${activeArticle.title}${activeArticle.text ? ` — ${activeArticle.text}` : ''}`);
    const links = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      whatsapp: `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      xshare: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      email: `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`
    };
    Object.entries(links).forEach(([name, url]) => {
      const anchor = overlay.querySelector(`.radio69-share-option.${name}`);
      if (anchor) anchor.href = url;
    });
  };

  const resolveSocialPreviewUrl = async article => {
    const pageUrl = new URL(window.location.href);
    let articleId = '';

    if (/(^|\/)cikk\.html$/i.test(pageUrl.pathname)) {
      articleId = pageUrl.searchParams.get('id') || '';
    } else {
      const staticArticleMatch = pageUrl.pathname.match(
        /\/cikkek\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\.html|\/(?:index\.html)?)?$/i
      );
      if (staticArticleMatch) articleId = staticArticleMatch[1].toLowerCase();
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(articleId)) return article.url;

    const previewUrl = new URL(
      '/social-previews/' + encodeURIComponent(articleId) + '/',
      pageUrl.origin
    ).href;

    try {
      // Prefer the revision-specific static page: Facebook cannot execute the
      // JavaScript on cikk.html, whose fallback OG image is only the radio logo.
      const response = await fetch(previewUrl, { cache: 'no-store' });
      if (response.ok) {
        const html = await response.text();
        const previewDocument = new DOMParser().parseFromString(html, 'text/html');
        const ogUrl = previewDocument.querySelector('meta[property="og:url"]')?.getAttribute('content');
        if (ogUrl) {
          const resolved = new URL(ogUrl, pageUrl.origin);
          const expectedPath = new URL(previewUrl).pathname;
          if (resolved.origin === pageUrl.origin && resolved.pathname === expectedPath) {
            return resolved.href;
          }
        }
      }
    } catch (error) {
      // Still use the static article preview below. Never fall back to cikk.html
      // for a known article ID, because social crawlers see its generic logo.
    }

    // This static page contains the article-specific Open Graph image and title.
    return previewUrl;
  };

  const setShareActionsReady = ready => {
    if (!overlay) return;
    overlay.querySelectorAll('.radio69-share-option').forEach(option => {
      if (option.tagName === 'A') {
        if (ready) {
          option.removeAttribute('aria-disabled');
          option.removeAttribute('tabindex');
        } else {
          option.removeAttribute('href');
          option.setAttribute('aria-disabled', 'true');
          option.setAttribute('tabindex', '-1');
        }
      } else {
        option.disabled = !ready;
      }
    });
  };

  const openDialog = async trigger => {
    activeTrigger = trigger;
    activeArticle = articleDetails();
    const requestedArticle = activeArticle;
    ensureDialog();
    overlay.querySelector('#radio69ShareArticleTitle').textContent = activeArticle.title;
    showStatus('A cikk saját Facebook-előnézetének előkészítése…');
    // Do not let the user open Facebook while the original cikk.html URL is
    // still attached to the share controls; that page has only the generic logo.
    setShareActionsReady(false);
    overlay.hidden = false;
    document.body.classList.add('radio69-share-open');
    overlay.querySelector('.radio69-share-close').focus();

    const resolvedUrl = await resolveSocialPreviewUrl(requestedArticle);
    if (activeArticle !== requestedArticle || overlay.hidden) return;
    activeArticle = { ...requestedArticle, url: resolvedUrl };
    updateLinks();
    setShareActionsReady(true);
    showStatus(resolvedUrl.includes('/social-previews/')
      ? 'Előkészült: a Facebook a cikk saját képét és címét tartalmazó oldalt kapja.'
      : 'Nem sikerült külön cikkelőnézetet azonosítani; a közvetlen hivatkozás használható.');
  };

  document.addEventListener('click', event => {
    const trigger = event.target instanceof Element ? event.target.closest('#shareArticle, #shareArticleBottom') : null;
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openDialog(trigger);
  }, true);
})();
