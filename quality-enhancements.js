/* Rádió69 – egységes billentyűzetes navigációs kiegészítések. */
(() => {
  'use strict';

  const skipLink = document.querySelector('.r69-skip-link');
  if (skipLink) {
    skipLink.addEventListener('click', () => {
      const href = skipLink.getAttribute('href') || '';
      if (!href.startsWith('#')) return;
      const target = document.getElementById(decodeURIComponent(href.slice(1)));
      if (!target) return;
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      window.requestAnimationFrame(() => target.focus({ preventScroll: true }));
    });
  }

  const toggle = document.getElementById('menuToggle');
  const nav = document.getElementById('mainNav');
  if (!toggle || !nav) return;

  toggle.type = 'button';
  toggle.setAttribute('aria-controls', nav.id || 'mainNav');
  if (!toggle.hasAttribute('aria-expanded')) toggle.setAttribute('aria-expanded', String(nav.classList.contains('open')));

  if (toggle.dataset.r69NavBound !== 'true') {
    toggle.dataset.r69NavBound = 'true';
    toggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Navigáció bezárása' : 'Navigáció megnyitása');
    });
  }

  const closeMenu = (restoreFocus = false) => {
    const wasOpen = nav.classList.contains('open');
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Navigáció megnyitása');
    if (restoreFocus && wasOpen) toggle.focus();
  };

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('open')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeMenu(true);
    }
  }, true);

  document.addEventListener('pointerdown', (event) => {
    if (!nav.classList.contains('open')) return;
    if (toggle.contains(event.target) || nav.contains(event.target)) return;
    closeMenu(false);
  });

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu(false);
  });

  const desktopBreakpoint = document.querySelector('.article-navigation-header') ? 1200 : 760;
  window.addEventListener('resize', () => {
    if (window.innerWidth > desktopBreakpoint) closeMenu(false);
  }, { passive: true });
})();
