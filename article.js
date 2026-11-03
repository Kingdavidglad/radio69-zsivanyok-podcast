(() => {
  const articles = window.RADIO69_ARTICLES || [];
  const params = new URLSearchParams(window.location.search);
  const article = articles.find(item => item.id === params.get('id'));
  const main = document.getElementById('articleMain');
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  document.title = article ? `${article.title} – Rádió69 × Zsiványok` : 'Cikk nem található – Rádió69 × Zsiványok';
  if (article) {
    const description = article.excerpt || 'Zenei érdekességek, podcastos történetek és kulisszatitkok a Rádió69 × Zsiványok Podcast magazinjában.';
    const setMeta = (selector, value, attribute = 'content') => {
      let node = document.head.querySelector(selector);
      if (!node) {
        node = document.createElement('meta');
        if (selector.startsWith('meta[property=')) node.setAttribute('property', selector.match(/meta\[property="([^"]+)"/)?.[1] || '');
        else node.setAttribute('name', selector.match(/meta\[name="([^"]+)"/)?.[1] || '');
        document.head.appendChild(node);
      }
      node.setAttribute(attribute, value);
    };
    setMeta('meta[name="description"]', description);
    setMeta('meta[property="og:type"]', 'article');
    setMeta('meta[property="og:title"]', document.title);
    setMeta('meta[property="og:description"]', description);
    setMeta('meta[property="og:image"]', new URL(article.image, window.location.href).href);
    setMeta('meta[name="twitter:card"]', 'summary_large_image');
  }
  document.getElementById('year').textContent = new Date().getFullYear();
  if (!article) {
    main.innerHTML = '<section class="not-found"><span class="section-kicker">404 · CIKK NEM TALÁLHATÓ</span><h1>Ezt a történetet<br><span class="gradient-text">nem találtuk.</span></h1><p>Lehet, hogy a hivatkozás hibás, vagy a cikket áthelyezték.</p><a class="button button-primary" href="index.html#friss">Vissza a főoldalra <span>↗</span></a></section>';
    return;
  }
  const normalizeText = value => String(value || '').toLocaleLowerCase('hu-HU').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, ' ');
  const stopWords = new Set(['a','az','és','vagy','hogy','egy','is','ez','ezt','ami','milyen','hogyan','van','volt','lesz','mint','meg','már','nem','csak','the','and']);
  const words = value => normalizeText(value).split(/\s+/).filter(word => word.length >= 4 && !stopWords.has(word));
  const relevance = candidate => {
    let score = 0;
    if (article.category && candidate.category && normalizeText(article.category) === normalizeText(candidate.category)) score += 10;
    if (article.tag && candidate.tag && normalizeText(article.tag) === normalizeText(candidate.tag)) score += 7;
    const currentWords = new Set(words(`${article.title} ${article.excerpt} ${article.intro || ''}`));
    const candidateWords = new Set(words(`${candidate.title} ${candidate.excerpt} ${candidate.intro || ''}`));
    for (const word of currentWords) if (candidateWords.has(word)) score += 1;
    return score;
  };
  const otherArticles = articles
    .filter(item => item.id !== article.id && !item.draft)
    .map(item => ({ ...item, _relatedScore: relevance(item) }))
    .sort((a, b) => b._relatedScore - a._relatedScore || String(b.publishedAt || '').localeCompare(String(a.publishedAt || '')))
    .slice(0, 3);
  main.innerHTML = `
    <nav class="breadcrumbs" aria-label="Morzsanavigáció"><a href="index.html">Főoldal</a><span>／</span><a href="index.html#friss">Olvasnivalók</a><span>／</span><span>${escapeHtml(article.category)}</span></nav>
    <article class="longform-article">
      <header class="article-header"><span class="article-category-pill"><span class="eyebrow-dot"></span>${escapeHtml(article.category.toLocaleUpperCase('hu-HU'))}</span><h1>${escapeHtml(article.title)}</h1><p class="article-deck">${escapeHtml(article.excerpt)}</p><div class="article-byline"><span class="byline-logo"><img src="assets/radio69-icon.png" alt=""></span><span><b>Rádió69 × Zsiványok Podcast</b><small>${escapeHtml(article.publishedAt || '')} · ${escapeHtml(article.readTime || '3 perc')} olvasás</small></span><div class="article-actions"><button type="button" id="shareArticle" class="small-action">↗ <span>Megosztás</span></button><button type="button" id="printArticle" class="small-action">⎙ <span>Nyomtatás</span></button></div></div></header>
      <figure class="article-hero-image"><img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.imageAlt || article.title)}" onerror="this.style.display='none';this.parentElement.classList.add('image-fallback')"><figcaption>${escapeHtml(article.imageCaption || 'Képillusztráció.')}</figcaption></figure>
      <div class="article-content"><p class="article-intro">${escapeHtml(article.intro)}</p>${article.body.map(p => `<p>${escapeHtml(p)}</p>`).join('')}${article.sources?.length ? `<aside class="article-sources" aria-label="Források"><div class="article-sources-title"><span>ELLENŐRIZHETŐ FORRÁSOK</span><strong>Kapcsolódó források</strong></div><ul>${article.sources.map(s => `<li><a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.label)} <span aria-hidden="true">↗</span></a><small>${escapeHtml(s.note || '')}</small></li>`).join('')}</ul><p class="article-source-note">${escapeHtml(article.sourceNote || '')}</p></aside>` : ''}<a class="back-link" href="index.html#friss">← Vissza az összes olvasnivalóhoz</a></div>
    </article>
    <section class="related-section"><div class="section-heading"><div><span class="section-kicker">MÉG TÖBB TÉMA</span><h2>Olvass tovább <span class="gradient-text">.</span></h2></div><a class="text-link" href="index.html#friss">Összes cikk <span>↗</span></a></div><div class="article-grid related-grid">${otherArticles.map(item => `<a class="article-card" href="cikkek/${encodeURIComponent(item.id)}.html"><div class="card-image"><img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.imageAlt || item.title)}" loading="lazy" onerror="this.style.display='none'"><span class="image-category">${escapeHtml(item.tag)}</span></div><div class="article-card-body"><div class="article-meta">${escapeHtml(item.category.toLocaleUpperCase('hu-HU'))}</div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.excerpt)}</p><span class="card-link">Tovább olvasom <span>↗</span></span></div></a>`).join('')}</div></section>`;

  document.getElementById('shareArticle').addEventListener('click', async () => {
    const shareData = { title: article.title, text: article.excerpt, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(window.location.href);
        document.querySelector('#shareArticle span').textContent = 'Link másolva';
      } else {
        window.prompt('Másold ki a cikk hivatkozását:', window.location.href);
      }
    } catch (error) { if (error.name !== 'AbortError') window.prompt('Másold ki a cikk hivatkozását:', window.location.href); }
  });
  document.getElementById('printArticle').addEventListener('click', () => window.print());
})();
