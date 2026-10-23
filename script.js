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

const articles = [
  {
    id: 'podcast-works', category: 'Zsiványok Podcast', tag: 'PODCAST', tone: 'art-purple', icon: '🎙',
    title: 'Mitől lesz egy beszélgetésből igazán jó podcastélmény?',
    excerpt: 'A jó podcast több, mint mikrofon és néhány kérdés. A hangulat és a váratlan történetek teszik emlékezetessé.',
    intro: 'A legjobb beszélgetésekben van valami megismételhetetlen: természetesek, néha meglepőek, és a hallgató úgy érzi, mintha ő is ott ülne az asztalnál.',
    body: [
      'A technika fontos, de önmagában nem elég. Egy jó epizód alapja a kíváncsiság: olyan kérdések, amelyekre nem előre betanult válaszok érkeznek, hanem valódi történetek.',
      'A humor, a figyelem és a spontán reakciók segítenek abban, hogy egy beszélgetés ne egyszerű kérdés-felelet legyen. A hallgatók gyakran éppen az apró, váratlan pillanatokra emlékeznek a legtovább.',
      'A Zsiványok Podcast világában ez adja a jó sztorik egyik legizgalmasabb alapanyagát: őszinte megszólalások, könnyed hangulat és témák, amelyekről az adás után is lehet beszélgetni.'
    ]
  },
  {
    id: 'radio-show', category: 'Kulisszák mögött', tag: 'RÁDIÓS ÉLET', tone: 'art-blue', icon: '🎚️',
    title: 'Mi minden történik a mikrofon mögött egy rádióműsor alatt?',
    excerpt: 'A hallgatók a kész műsort hallják, de a háttérben időzítés, előkészület és egy kis improvizáció is dolgozik.',
    intro: 'Egy gördülékeny rádióműsor mögött több apró feladat dolgozik együtt, mint elsőre gondolnánk.',
    body: [
      'A felkészülés a témák, az információk és a műsor ívének összeállításával kezdődik. Fontos, hogy a műsorvezető tudja, mi következik, ugyanakkor maradjon hely a spontán reakcióknak is.',
      'A pontos időzítés, a megfelelő hangulat és az átvezetések mind hozzájárulnak ahhoz, hogy a műsor természetesnek hasson. A hallgató ebből legtöbbször csak annyit érzékel: jó együtt lenni az adással.',
      'A rádiózás egyszerre tervezés és pillanatnyi jelenlét — ettől tud egy műsor személyes és élő lenni.'
    ]
  },
  {
    id: 'music-trends', category: 'Zene', tag: 'ZENE', tone: 'art-pink', icon: '🎵',
    title: 'Miért ragad meg bennünk egy refrén már első hallásra?',
    excerpt: 'A dallam, a ritmus és az ismétlés együtt könnyen emlékezetessé tehet egy zenei pillanatot.',
    intro: 'Van az a dal, amelynek a refrénjét akkor is dúdoljuk, amikor már rég kikapcsoltuk a zenét. Ennek több oka is lehet.',
    body: [
      'Az egyszerűen követhető dallamfordulatok és az ismétlődő motívumok segítenek az agynak felismerni, majd megjegyezni a zenét. A ritmus pedig testi élménnyé is teszi a hallgatást.',
      'A hangzás, a szöveg és az érzelmi kapcsolódás szintén szerepet játszik. Egy refrén sokszor azért marad velünk, mert egy adott időszakhoz, helyzethez vagy emlékhez kötődik.',
      'A sláger születése persze nem pontos recept — éppen az teszi különlegessé a zenét, hogy a váratlan ötletek is működhetnek.'
    ]
  },
  {
    id: 'short-video', category: 'Digitális kultúra', tag: 'ONLINE VILÁG', tone: 'art-orange', icon: '📱',
    title: 'Rövid videók, nagy ötletek: mitől állunk meg görgetés közben?',
    excerpt: 'Egy erős nyitás felkelti a figyelmet, de a tartalomnak utána is meg kell tartania a nézőt.',
    intro: 'A rövid videók versenyében az első másodpercek sokat számítanak — de az erős kezdés önmagában még nem minden.',
    body: [
      'A néző gyorsan szeretné megérteni, miről szól a videó, ezért sokat segít egy világos helyzet, egy érdekes kérdés vagy egy meglepő képi pillanat.',
      'A legjobb rövid tartalmaknak van ívük: ígéretet tesznek, majd valóban adnak is valamit a nézőnek — egy nevetést, egy információt vagy egy felismerést.',
      'Az alkotóknak érdemes figyelniük a visszajelzésekre, de közben megtalálniuk azt a saját hangot is, amely miatt a közönség később is visszatér.'
    ]
  },
  {
    id: 'behind-scenes', category: 'Kulisszák mögött', tag: 'KULISSZATITOK', tone: 'art-green', icon: '✨',
    title: 'A bakik és spontán pillanatok néha a legjobb történetek',
    excerpt: 'Nem minden emlékezetes pillanat szerepel a forgatókönyvben. Néha épp az improvizáció teszi emberivé a műsort.',
    intro: 'A tervezés biztonságot ad, de egy élő beszélgetés vagy forgatás pont attól lehet izgalmas, hogy nem lehet minden pillanatát előre kiszámítani.',
    body: [
      'Egy elrontott szó, egy váratlan nevetés vagy egy különös közjáték elsőre hibának tűnhet, de megfelelő helyzetben oldhatja a feszültséget és közelebb hozhatja egymáshoz a szereplőket.',
      'Persze nem minden baki való a végleges anyagba. A lényeg az, hogy a spontán pillanatok ne legyenek erőltetettek, és illeszkedjenek a tartalom hangulatához.',
      'A kulisszák mögötti történetek azért is népszerűek, mert megmutatják az elkészült műsor emberi oldalát.'
    ]
  },
  {
    id: 'artist-story', category: 'Zene', tag: 'ELŐADÓK', tone: 'art-indigo', icon: '🌟',
    title: 'Egy előadó története sokszor legalább olyan izgalmas, mint a dalai',
    excerpt: 'A zene mellett az inspiráció, a pályakezdés és a meghatározó pillanatok is közelebb hozhatják az előadókat.',
    intro: 'Egy dal önmagában is hatásos lehet, de a mögötte álló történet új rétegeket adhat a hallgatói élményhez.',
    body: [
      'Mi inspirálta a dalt? Milyen út vezetett az első fellépéstől a nagyobb színpadokig? Az ilyen kérdések segíthetnek jobban megérteni az előadó hangzását és döntéseit.',
      'A háttértörténet nem helyettesíti a zenét, inkább kiegészíti azt. Egy új információ után gyakran más füllel hallgatjuk meg ugyanazt a számot.',
      'Ezért is izgalmasak a zenei portrék és a személyes beszélgetések: a slágerek mögött emberek, élmények és kreatív döntések vannak.'
    ]
  }
];

const grid = document.getElementById('articleGrid');
const searchInput = document.getElementById('articleSearch');
const filterButtons = [...document.querySelectorAll('.filter-chip')];
const emptyState = document.getElementById('emptyState');
const dialog = document.getElementById('articleDialog');
let currentFilter = 'Összes';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

function renderArticles() {
  const query = searchInput.value.trim().toLocaleLowerCase('hu-HU');
  const visibleArticles = articles.filter(article => {
    const matchesFilter = currentFilter === 'Összes' || article.category === currentFilter;
    const searchable = `${article.title} ${article.excerpt} ${article.category} ${article.tag}`.toLocaleLowerCase('hu-HU');
    return matchesFilter && searchable.includes(query);
  });
  grid.innerHTML = visibleArticles.map(article => `
    <article class="article-card">
      <div class="article-art ${article.tone}"><span class="art-tag">${escapeHtml(article.tag)}</span><span class="art-symbol" aria-hidden="true">${article.icon}</span></div>
      <div class="article-card-body">
        <div class="article-meta">${escapeHtml(article.category.toLocaleUpperCase('hu-HU'))}</div>
        <h3>${escapeHtml(article.title)}</h3>
        <p>${escapeHtml(article.excerpt)}</p>
        <div class="card-bottom"><span>ÉRDEKESSÉG • SZERKESZTŐSÉGI TÉMA</span><button type="button" data-open-article="${escapeHtml(article.id)}">Tovább <span>↗</span></button></div>
      </div>
    </article>`).join('');
  emptyState.hidden = visibleArticles.length > 0;
}

function openArticle(articleId) {
  const article = articles.find(item => item.id === articleId);
  if (!article) return;
  document.getElementById('dialogCategory').textContent = `${article.category.toLocaleUpperCase('hu-HU')}  /  ${article.tag}`;
  document.getElementById('dialogTitle').textContent = article.title;
  document.getElementById('dialogIntro').textContent = article.intro;
  document.getElementById('dialogBody').innerHTML = article.body.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('');
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach(item => {
      const selected = item === button;
      item.classList.toggle('selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    });
    renderArticles();
  });
  button.setAttribute('aria-pressed', String(button.classList.contains('selected')));
});
searchInput.addEventListener('input', renderArticles);
document.addEventListener('click', event => {
  const trigger = event.target.closest('[data-open-article]');
  if (trigger) openArticle(trigger.dataset.openArticle);
  const quickFilter = event.target.closest('[data-quick-filter]');
  if (quickFilter) {
    currentFilter = quickFilter.dataset.quickFilter;
    filterButtons.forEach(button => {
      const selected = button.dataset.filter === currentFilter;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    renderArticles();
  }
});

document.getElementById('dialogClose').addEventListener('click', () => dialog.close());
document.getElementById('dialogDone').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
});
document.getElementById('year').textContent = new Date().getFullYear();

const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');
menuToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.setAttribute('aria-label', isOpen ? 'Navigáció bezárása' : 'Navigáció megnyitása');
});
mainNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  mainNav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}));

renderArticles();
