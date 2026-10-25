/* A főmenü aktív vonalának javítása */
(function () {
  const nav = document.getElementById('mainNav') ||
              document.querySelector('.main-nav');
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll('a[href]'));

  function pageFile(path) {
    const parts = path.split('/').filter(Boolean);
    const last = parts.length ? parts[parts.length - 1] : '';
    return last.toLowerCase().endsWith('.html')
      ? last.toLowerCase()
      : 'index.html';
  }

  function getDestination(link) {
    try {
      const url = new URL(link.getAttribute('href'), location.href);
      return {
        file: pageFile(url.pathname),
        hash: url.hash || ''
      };
    } catch (error) {
      return { file: '', hash: '' };
    }
  }

  function activate(selected) {
    if (!selected) return;

    links.forEach(link => {
      const active = link === selected;
      link.classList.toggle('active', active);

      if (active) {
        link.setAttribute('aria-current', 'location');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function homeLink() {
    return links.find(link => {
      const dest = getDestination(link);
      return dest.file === 'index.html' &&
             (dest.hash === '#home' || dest.hash === '');
    });
  }

  const sections = links.map(link => {
    const dest = getDestination(link);
    return {
      link,
      section: dest.file === 'index.html' && dest.hash &&
               dest.hash !== '#home'
        ? document.getElementById(dest.hash.slice(1))
        : null
    };
  }).filter(item => item.section);

  function updateMenu() {
    if (pageFile(location.pathname) !== 'index.html') {
      const current = links.find(link =>
        getDestination(link).file === pageFile(location.pathname)
      );
      if (current) activate(current);
      return;
    }

    if (window.scrollY <= 120) {
      activate(homeLink());
      return;
    }

    const line = Math.min(window.innerHeight * 0.35, 240);
    const visible = sections
      .map(item => ({
        ...item,
        top: item.section.getBoundingClientRect().top
      }))
      .filter(item => item.top <= line)
      .sort((a, b) => b.top - a.top);

    activate(visible.length ? visible[0].link : homeLink());
  }

  links.forEach(link => {
    link.addEventListener('click', () => {
      const dest = getDestination(link);
      if (dest.file === 'index.html' && dest.hash) {
        activate(link);
      }
    });
  });

  window.addEventListener('scroll', updateMenu, { passive: true });
  window.addEventListener('resize', updateMenu);
  window.addEventListener('hashchange', updateMenu);
  window.addEventListener('load', updateMenu);

  updateMenu();
})();
