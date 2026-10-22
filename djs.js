/*
 * DJ-K LISTÁJA – Rádió69
 * Új DJ hozzáadásához töltsd fel a portréját az assets/djs/ mappába,
 * majd adj hozzá egy elemet a listához. A kártyán csak a fotó és a név jelenik meg.
 */
window.RADIO69_DJS = [
  { name: "DJ Effect", image: "assets/djs/dj-effect.jpg" },
  { name: "DJ Veronic", image: "assets/djs/dj-veronic.jpg" },
  { name: "DJ Hlásznyik", image: "assets/djs/dj-hlasznyik.jpg" },
  { name: "DJ Daniel", image: "assets/djs/dj-daniel.jpg" }
];

(() => {
  const grid = document.getElementById('djGrid');
  const emptyState = document.getElementById('djEmptyState');
  if (!grid || !emptyState) return;

  const djs = Array.isArray(window.RADIO69_DJS) ? window.RADIO69_DJS.filter(dj => dj && dj.name && dj.image) : [];
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  if (!djs.length) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  grid.innerHTML = djs.map(dj => `
    <article class="dj-card">
      <div class="dj-photo-wrap">
        <img src="${escapeHtml(dj.image)}" alt="${escapeHtml(dj.name)}" loading="lazy" decoding="async" onerror="this.remove();this.parentElement.classList.add('image-fallback')">
      </div>
      <h2>${escapeHtml(dj.name)}</h2>
    </article>
  `).join('');
})();
