(() => {
  const allArticles = window.RADIO69_ARTICLES || [];
  // Vázlatok ne jelenjenek meg a nyilvános főoldalon.
  const articles = allArticles.filter(article => article.draft === false);
  const grid = document.getElementById('articleGrid');
  const searchInput = document.getElementById('articleSearch');
  const sortSelect = document.getElementById('articleSort');
  const countLabel = document.getElementById('articleCount');
  const picksGrid = document.getElementById('editorPicks');
  const filterButtons = [...document.querySelectorAll('.filter-chip')];
  const emptyState = document.getElementById('emptyState');
  let currentFilter = 'Összes';
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const readingMinutes = value => Number.parseInt(String(value || '3').match(/\d+/)?.[0] || '3', 10);
  const formatArticleDate = value => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
    return new Date(`${value}T00:00:00Z`).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  };

  function renderHeroFeature() {
    const feature = document.querySelector('.hero-feature');
    const selected = articles.find(article => article.featured) || articles[0];
    if (!feature || !selected) return;
    feature.href = `cikkek/${encodeURIComponent(selected.id)}.html`;
    feature.setAttribute('aria-label', `Kiemelt cikk: ${selected.title}`);
    const image = feature.querySelector('img');
    if (image) { image.src = selected.image; image.alt = selected.imageAlt || selected.title; }
    const kicker = feature.querySelector('.mini-kicker');
    if (kicker) kicker.textContent = `${selected.category || 'ÉRDEKESSÉGEK'} · ${selected.tag || 'KIEMELT'}`;
    const title = feature.querySelector('.hero-feature-content strong');
    if (title) title.textContent = selected.title;
    const read = feature.querySelector('.hero-read');
    if (read) read.innerHTML = `${escapeHtml(selected.readTime || '3 perc')} olvasás <span>↗</span>`;
  }

  function renderEditorPicks() {
    if (!picksGrid) return;
    const picks = [...articles].sort((a, b) => Number(Boolean(b.featured || b.editorPick)) - Number(Boolean(a.featured || a.editorPick))).slice(0, 3);
    picksGrid.innerHTML = picks.map((article, index) => `
      <a class="editor-pick" href="cikkek/${encodeURIComponent(article.id)}.html">
        <span class="editor-pick-number">0${index + 1}</span>
        <span class="editor-pick-copy"><small>${escapeHtml(article.tag || article.category)}</small><strong>${escapeHtml(article.title)}</strong><span>${escapeHtml(article.readTime || '3 perc')} olvasás</span></span>
        <span class="editor-pick-arrow" aria-hidden="true">↗</span>
      </a>`).join('');
  }

  function renderArticles() {
    if (!grid || !searchInput) return;
    const query = searchInput.value.trim().toLocaleLowerCase('hu-HU');
    const visible = articles.filter(article => {
      const matchesFilter = currentFilter === 'Összes' || article.category === currentFilter;
      const haystack = `${article.title} ${article.excerpt} ${article.category} ${article.tag} ${article.intro || ''}`.toLocaleLowerCase('hu-HU');
      return matchesFilter && haystack.includes(query);
    });
    const sortMode = sortSelect?.value || 'recommended';
    if (sortMode === 'title') visible.sort((a,b) => a.title.localeCompare(b.title, 'hu'));
    if (sortMode === 'short') visible.sort((a,b) => readingMinutes(a.readTime) - readingMinutes(b.readTime) || a.title.localeCompare(b.title, 'hu'));
    grid.innerHTML = visible.map(article => `
      <a class="article-card" href="cikkek/${encodeURIComponent(article.id)}.html">
        <div class="card-image"><img src="${escapeHtml(article.image)}" alt="${escapeHtml(article.imageAlt || article.title)}" loading="lazy" decoding="async" onerror="this.style.display='none';this.parentElement.classList.add('image-fallback')"><span class="image-category">${escapeHtml(article.tag)}</span><span class="image-arrow" aria-hidden="true">↗</span></div>
        <div class="article-card-body"><div class="article-meta">${escapeHtml(article.category.toLocaleUpperCase('hu-HU'))}<span>·</span>${escapeHtml(formatArticleDate(article.publishedAt))}<span>·</span>${escapeHtml(article.readTime || '3 perc')}</div><h3>${escapeHtml(article.title)}</h3><p>${escapeHtml(article.excerpt)}</p><span class="card-link">Tovább olvasom <span>↗</span></span></div>
      </a>`).join('');
    if (countLabel) countLabel.textContent = `${visible.length} ${visible.length === 1 ? 'olvasnivaló' : 'olvasnivaló'}${query || currentFilter !== 'Összes' ? ' a szűrés alapján' : ''}`;
    if (emptyState) emptyState.hidden = visible.length > 0;
  }

  function applyFilter(filter) {
    currentFilter = filter;
    filterButtons.forEach(button => {
      const selected = button.dataset.filter === currentFilter;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    renderArticles();
  }

  filterButtons.forEach(button => button.addEventListener('click', () => applyFilter(button.dataset.filter)));
  searchInput?.addEventListener('input', renderArticles);
  sortSelect?.addEventListener('change', renderArticles);
  document.querySelectorAll('[data-quick-filter]').forEach(link => link.addEventListener('click', () => applyFilter(link.dataset.quickFilter)));
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // A cikkkártyák normál hivatkozások: kattintáskor a saját cikkoldaluk nyílik meg.
  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.getElementById('mainNav');
  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      menuToggle.setAttribute('aria-label', isOpen ? 'Navigáció bezárása' : 'Navigáció megnyitása');
    });
    mainNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
      mainNav.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Navigáció megnyitása');
    }));
  }
  renderHeroFeature();
  renderEditorPicks();
  renderArticles();
})();
