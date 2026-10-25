/* Dinamikus aktív menüpont-jelölés: az aktuális oldal/rovat alatt megjelenik a lila-cián vonal. */
(function () {
  const nav = document.querySelector('.main-nav');
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll('a[href]'));
  const pathFile = (pathname) => {
    const pieces = pathname.split('/').filter(Boolean);
    const last = pieces.length ? pieces[pieces.length - 1] : '';
    return last.toLowerCase().endsWith('.html') ? last.toLowerCase() : 'index.html';
  };
  const currentFile = pathFile(window.location.pathname);

  function destination(link) {
    try {
      const url = new URL(link.getAttribute('href'), window.location.href);
      return { file: pathFile(url.pathname), hash: url.hash || '' };
    } catch (_) {
      return { file: '', hash: '' };
    }
  }

  function setActive(selected, currentIsSection = false) {
    links.forEach((link) => {
      const isActive = link === selected;
      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', currentIsSection ? 'location' : 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function findLinkForHash(hash) {
    if (!hash) hash = '#home';
    return links.find((link) => {
      const dest = destination(link);
      return dest.file === 'index.html' && dest.hash === hash;
    }) || null;
  }

  function updateForLocation() {
    if (currentFile !== 'index.html') {
      const pageLink = links.find((link) => destination(link).file === currentFile);
      if (pageLink) setActive(pageLink, false);
      return;
    }
    const selected = findLinkForHash(window.location.hash || '#home');
    if (selected) setActive(selected, Boolean(window.location.hash));
  }

  // Azonnali kiemelés kattintáskor, majd frissítés a hash változásakor.
  links.forEach((link) => {
    link.addEventListener('click', () => {
      const dest = destination(link);
      if (currentFile === 'index.html' && dest.file === 'index.html' && dest.hash) {
        setActive(link, true);
      }
    });
  });
  window.addEventListener('hashchange', updateForLocation);
  updateForLocation();

  // A főoldalon görgetés közben is kövesse, melyik szekció van éppen képernyőn.
  if (currentFile === 'index.html' && 'IntersectionObserver' in window) {
    const watched = links
      .map((link) => ({ link, dest: destination(link) }))
      .filter(({ dest }) => dest.file === 'index.html' && dest.hash)
      .map(({ link, dest }) => ({ link, section: document.getElementById(dest.hash.slice(1)) }))
      .filter((item) => item.section);

    if (watched.length) {
      const observer = new IntersectionObserver((entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const item = watched.find(({ section }) => section === visible.target);
        if (item) setActive(item.link, true);
      }, { rootMargin: '-18% 0px -62% 0px', threshold: [0, 0.15, 0.35] });
      watched.forEach(({ section }) => observer.observe(section));
    }
  }
})();

/* Olvasnivalók – a cikkadatokat az articles.js szolgáltatja. */
(() => {
  const articleData = window.RADIO69_ARTICLES;
  if (!Array.isArray(articleData)) {
    console.warn('Az articles.js cikklistája nem érhető el; a beépített HTML-listát megtartom.');
    return;
  }

  const articles = articleData.filter(article => article && article.draft !== true);
  const grid = document.getElementById('articleGrid');
  if (!grid) return; // Ne fusson a cikklista-kód a többi HTML-oldalon.

  const searchInput = document.getElementById('articleSearch');
  const sortSelect = document.getElementById('articleSort');
  const countLabel = document.getElementById('articleCount');
  const emptyState = document.getElementById('emptyState');
  const picksGrid = document.getElementById('editorPicks');
  const filterButtons = Array.from(document.querySelectorAll('.filter-chip'));
  const quickFilterLinks = Array.from(document.querySelectorAll('[data-quick-filter]'));
  let currentFilter = 'Összes';

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  const minutesFrom = value => {
    const match = String(value || '').match(/\d+/);
    return match ? Number(match[0]) : 3;
  };

  const formatDate = value => {
    if (!value) return '';
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('hu-HU', {
      year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC'
    });
  };

  const articleHref = article => `cikkek/${encodeURIComponent(article.id)}.html`;

  function renderHero() {
    const hero = document.querySelector('.hero-feature');
    const article = articles.find(item => item.featured) || articles[0];
    if (!hero || !article) return;

    hero.href = articleHref(article);
    hero.setAttribute('aria-label', `Kiemelt cikk: ${article.title || ''}`);
    const image = hero.querySelector('img');
    if (image && article.image) {
      image.src = article.image;
      image.alt = article.imageAlt || article.title || '';
    }
    const kicker = hero.querySelector('.mini-kicker');
    if (kicker) kicker.textContent = `${article.category || ''} · ${article.tag || ''}`;
    const title = hero.querySelector('strong');
    if (title) title.textContent = article.title || '';
    const read = hero.querySelector('.hero-read');
    if (read) read.innerHTML = `${escapeHtml(article.readTime || '3 perc')} olvasás <span>↗</span>`;
  }

  function renderEditorPicks() {
    if (!picksGrid) return;
    const picks = articles.filter(item => item.editorPick || item.featured).slice(0, 3);
    picksGrid.innerHTML = picks.map((article, index) => `
      <a class="editor-pick" href="${escapeHtml(articleHref(article))}">
        <span class="editor-pick-number">0${index + 1}</span>
        <span class="editor-pick-copy">
          <small>${escapeHtml(article.tag || article.category || 'AJÁNLÓ')}</small>
          <strong>${escapeHtml(article.title || '')}</strong>
          <span>${escapeHtml(article.readTime || '3 perc')} olvasás</span>
        </span>
        <span class="editor-pick-arrow" aria-hidden="true">↗</span>
      </a>
    `).join('');
  }

  function updateFilterButtons() {
    filterButtons.forEach(button => {
      const selected = button.dataset.filter === currentFilter;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function renderArticles() {
    const query = (searchInput?.value || '').trim().toLocaleLowerCase('hu-HU');
    let visible = articles.filter(article => {
      const matchesFilter = currentFilter === 'Összes' || article.category === currentFilter;
      const searchable = [
        article.title, article.excerpt, article.category, article.tag, article.intro,
        ...(Array.isArray(article.body) ? article.body : [])
      ].join(' ').toLocaleLowerCase('hu-HU');
      return matchesFilter && searchable.includes(query);
    });

    const sortMode = sortSelect?.value || 'recommended';
    if (sortMode === 'title') {
      visible = [...visible].sort((a, b) => String(a.title || '').localeCompare(String(b.title || ''), 'hu'));
    } else if (sortMode === 'short') {
      visible = [...visible].sort((a, b) => minutesFrom(a.readTime) - minutesFrom(b.readTime));
    }

    grid.innerHTML = visible.map(article => `
      <a class="article-card" href="${escapeHtml(articleHref(article))}">
        <div class="card-image">
          <img src="${escapeHtml(article.image || '')}"
               alt="${escapeHtml(article.imageAlt || article.title || '')}"
               loading="lazy" decoding="async"
               onerror="this.style.display='none';this.parentElement.classList.add('image-fallback')">
          <span class="image-category">${escapeHtml(article.tag || article.category || '')}</span>
          <span class="image-arrow" aria-hidden="true">↗</span>
        </div>
        <div class="article-card-body">
          <div class="article-meta">${escapeHtml(article.category || '')}<span>·</span>${escapeHtml(formatDate(article.publishedAt || article.updatedAt))}<span>·</span>${escapeHtml(article.readTime || '3 perc')}</div>
          <h3>${escapeHtml(article.title || '')}</h3>
          <p>${escapeHtml(article.excerpt || '')}</p>
          <span class="card-link">Tovább olvasom <span>↗</span></span>
        </div>
      </a>
    `).join('');

    if (countLabel) countLabel.textContent = `${visible.length} olvasnivaló`;
    if (emptyState) emptyState.hidden = visible.length > 0;
  }

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      currentFilter = button.dataset.filter || 'Összes';
      updateFilterButtons();
      renderArticles();
    });
  });

  quickFilterLinks.forEach(link => {
    link.addEventListener('click', () => {
      currentFilter = link.dataset.quickFilter || 'Összes';
      updateFilterButtons();
      renderArticles();
    });
  });

  if (searchInput) searchInput.addEventListener('input', renderArticles);
  if (sortSelect) sortSelect.addEventListener('change', renderArticles);

  renderHero();
  renderEditorPicks();
  updateFilterButtons();
  renderArticles();
})();

/* Egyéb, minden oldalon biztonságosan használható felületi funkciók. */
(() => {
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.getElementById('mainNav');
  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = mainNav.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      menuToggle.setAttribute('aria-label', isOpen ? 'Navigáció bezárása' : 'Navigáció megnyitása');
    });
    mainNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mainNav.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
})();
