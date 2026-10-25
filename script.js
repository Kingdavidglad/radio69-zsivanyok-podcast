/* Dinamikus aktív menüpont-jelölés: a lap tetején mindig a Főoldal aktív. */
(function () {
  const nav = document.querySelector('.main-nav');
  if (!nav) return;

  const links = Array.from(nav.querySelectorAll('a[href]'));
  const pathFile = pathname => {
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
    if (!selected) return;
    links.forEach(link => {
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
    return links.find(link => {
      const dest = destination(link);
      return dest.file === 'index.html' && dest.hash === (hash || '#home');
    }) || null;
  }

  // A menü célpontjai közül csak az önálló, valóban látható szekciókat figyeljük.
  const watched = currentFile === 'index.html'
    ? links
        .map(link => ({ link, dest: destination(link) }))
        .filter(({ dest }) => dest.file === 'index.html' && dest.hash && dest.hash !== '#home')
        .map(({ link, dest }) => ({ link, section: document.getElementById(dest.hash.slice(1)) }))
        .filter(item => item.section)
    : [];

  function updateActiveFromScroll() {
    if (currentFile !== 'index.html') return;

    // Ha a látogató visszagörgetett a lap tetejére, a Főoldal legyen aktív,
    // akkor is, ha a címsorban korábban például #temak maradt.
    if (window.scrollY <= 120) {
      setActive(findLinkForHash('#home'), true);
      return;
    }

    // A legközelebbi, aktiválási vonalat már elért szekció menüpontja legyen aláhúzva.
    const activationLine = Math.min(window.innerHeight * 0.35, 240);
    const passed = watched
      .map(item => ({ ...item, top: item.section.getBoundingClientRect().top }))
      .filter(item => item.top <= activationLine)
      .sort((a, b) => b.top - a.top);

    if (passed.length) {
      setActive(passed[0].link, true);
    } else {
      setActive(findLinkForHash('#home'), true);
    }
  }

  if (currentFile !== 'index.html') {
    const pageLink = links.find(link => destination(link).file === currentFile);
    if (pageLink) setActive(pageLink, false);
  } else {
    links.forEach(link => {
      link.addEventListener('click', () => {
        const dest = destination(link);
        if (dest.file === 'index.html' && dest.hash) {
          setActive(link, true);
        }
      });
    });

    window.addEventListener('scroll', updateActiveFromScroll, { passive: true });
    window.addEventListener('resize', updateActiveFromScroll);
    window.addEventListener('hashchange', updateActiveFromScroll);
    window.addEventListener('load', updateActiveFromScroll);
    updateActiveFromScroll();
  }
})();

/* Olvasnivalók – Supabase központi cikkadatbázissal, helyi articles.js tartalékmegoldással. */
(() => {
  const fallbackData = Array.isArray(window.RADIO69_ARTICLES) ? window.RADIO69_ARTICLES : [];
  const grid = document.getElementById('articleGrid');
  if (!grid) return;

  const searchInput = document.getElementById('articleSearch');
  const sortSelect = document.getElementById('articleSort');
  const countLabel = document.getElementById('articleCount');
  const emptyState = document.getElementById('emptyState');
  const picksGrid = document.getElementById('editorPicks');
  const filterButtons = Array.from(document.querySelectorAll('.filter-chip'));
  const quickFilterLinks = Array.from(document.querySelectorAll('[data-quick-filter]'));
  let currentFilter = 'Összes';
  let articles = fallbackData.filter(a => a && a.draft !== true);
  let cloudEnabled = false;

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const minutesFrom = value => { const match=String(value||'').match(/\d+/); return match?Number(match[0]):3; };
  const formatDate = value => { if(!value)return '';const date=new Date(`${value}T00:00:00Z`);if(Number.isNaN(date.getTime()))return '';return date.toLocaleDateString('hu-HU',{year:'numeric',month:'2-digit',day:'2-digit',timeZone:'UTC'}); };
  const safeImage = value => { const v=String(value||'').trim(); if(/^https:\/\//i.test(v))return v;if(/^assets\/[a-z0-9_./-]+$/i.test(v)&&!v.includes('..'))return v;return ''; };
  const articleHref = article => cloudEnabled ? `cikk.html?id=${encodeURIComponent(article.id)}` : `cikkek/${encodeURIComponent(article.id)}.html`;
  function mapRow(row){return {id:row.id,category:row.category,tag:row.tag,draft:row.status!=='published',featured:!!row.featured,editorPick:!!row.editor_pick,title:row.title,excerpt:row.excerpt,image:row.image_url,imageAlt:row.image_alt,imageCaption:row.image_caption,imagePosition:row.image_position,readTime:row.read_time,publishedAt:row.published_at,updatedAt:row.content_updated_at||row.published_at,intro:row.intro,body:Array.isArray(row.body)?row.body:[],sources:Array.isArray(row.sources)?row.sources:[],sourceNote:row.source_note,seoTitle:row.seo_title,_fromCloud:true};}
  function loadScript(src){return new Promise((resolve,reject)=>{const existing=Array.from(document.scripts).find(s=>s.src&&s.src.includes(src));if(existing&&window.RADIO69_SUPABASE_CONFIG){resolve();return;}const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(new Error('Nem sikerült betölteni: '+src));document.head.appendChild(script);});}
  async function getPublicClient(){
    if(!window.RADIO69_SUPABASE_CONFIG) await loadScript('supabase-config.js');
    const cfg=window.RADIO69_SUPABASE_CONFIG||{};
    if(!/^https:\/\/.+\.supabase\.co$/.test(cfg.url||'')||!cfg.publishableKey||String(cfg.publishableKey).startsWith('IDE_')||String(cfg.url).includes('IDE-SUPABASE'))return null;
    if(!window.supabase?.createClient)await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    return window.supabase.createClient(cfg.url,cfg.publishableKey);
  }
  function renderHero(){const hero=document.querySelector('.hero-feature');const article=articles.find(item=>item.featured)||articles[0];if(!hero||!article)return;hero.href=articleHref(article);hero.setAttribute('aria-label',`Kiemelt cikk: ${article.title||''}`);const image=hero.querySelector('img');const imageUrl=safeImage(article.image);if(image&&imageUrl){image.src=imageUrl;image.alt=article.imageAlt||article.title||'';}const kicker=hero.querySelector('.mini-kicker');if(kicker)kicker.textContent=`${article.category||''} · ${article.tag||''}`;const title=hero.querySelector('strong');if(title)title.textContent=article.title||'';const read=hero.querySelector('.hero-read');if(read)read.innerHTML=`${escapeHtml(article.readTime||'3 perc')} olvasás <span>↗</span>`;}
  function renderEditorPicks(){if(!picksGrid)return;const picks=articles.filter(item=>item.editorPick||item.featured).slice(0,3);picksGrid.innerHTML=picks.map((article,index)=>`<a class="editor-pick" href="${escapeHtml(articleHref(article))}"><span class="editor-pick-number">0${index+1}</span><span class="editor-pick-copy"><small>${escapeHtml(article.tag||article.category||'AJÁNLÓ')}</small><strong>${escapeHtml(article.title||'')}</strong><span>${escapeHtml(article.readTime||'3 perc')} olvasás</span></span><span class="editor-pick-arrow" aria-hidden="true">↗</span></a>`).join('');}
  function updateFilterButtons(){filterButtons.forEach(button=>{const selected=button.dataset.filter===currentFilter;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));});}
  function renderArticles(){const query=(searchInput?.value||'').trim().toLocaleLowerCase('hu-HU');let visible=articles.filter(article=>{const matchesFilter=currentFilter==='Összes'||article.category===currentFilter;const searchable=[article.title,article.excerpt,article.category,article.tag,article.intro,...(Array.isArray(article.body)?article.body:[])].join(' ').toLocaleLowerCase('hu-HU');return matchesFilter&&searchable.includes(query);});const sortMode=sortSelect?.value||'recommended';if(sortMode==='title')visible=[...visible].sort((a,b)=>String(a.title||'').localeCompare(String(b.title||''),'hu'));else if(sortMode==='short')visible=[...visible].sort((a,b)=>minutesFrom(a.readTime)-minutesFrom(b.readTime));grid.innerHTML=visible.map(article=>`<a class="article-card" href="${escapeHtml(articleHref(article))}"><div class="card-image">${safeImage(article.image)?`<img src="${escapeHtml(safeImage(article.image))}" alt="${escapeHtml(article.imageAlt||article.title||'')}" loading="lazy" decoding="async" onerror="this.style.display='none';this.parentElement.classList.add('image-fallback')">`:''}<span class="image-category">${escapeHtml(article.tag||article.category||'')}</span><span class="image-arrow" aria-hidden="true">↗</span></div><div class="article-card-body"><div class="article-meta">${escapeHtml(article.category||'')}<span>·</span>${escapeHtml(formatDate(article.publishedAt||article.updatedAt))}<span>·</span>${escapeHtml(article.readTime||'3 perc')}</div><h3>${escapeHtml(article.title||'')}</h3><p>${escapeHtml(article.excerpt||'')}</p><span class="card-link">Tovább olvasom <span>↗</span></span></div></a>`).join('');if(countLabel)countLabel.textContent=`${visible.length} olvasnivaló`;if(emptyState)emptyState.hidden=visible.length>0;}
  filterButtons.forEach(button=>button.addEventListener('click',()=>{currentFilter=button.dataset.filter||'Összes';updateFilterButtons();renderArticles();}));
  quickFilterLinks.forEach(link=>link.addEventListener('click',()=>{currentFilter=link.dataset.quickFilter||'Összes';updateFilterButtons();renderArticles();}));
  if(searchInput)searchInput.addEventListener('input',renderArticles);if(sortSelect)sortSelect.addEventListener('change',renderArticles);
  async function init(){
    try{const client=await getPublicClient();if(client){const {data,error}=await client.from('articles').select('*').eq('status','published').order('published_at',{ascending:false}).order('updated_at',{ascending:false});if(error)throw error;if(Array.isArray(data)&&data.length){articles=data.map(mapRow);cloudEnabled=true;}else{console.info('A központi cikkadatbázis még üres; a helyi articles.js cikklista marad aktív.');}}}
    catch(error){console.warn('A központi cikklista nem érhető el; a helyi articles.js tartalmat használom.',error);}
    renderHero();renderEditorPicks();updateFilterButtons();renderArticles();
  }
  init();
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
