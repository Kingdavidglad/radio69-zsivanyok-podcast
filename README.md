# Rádió69 × Zsiványok Podcast — GitHub Pages kiadás

Statikus HTML/CSS/JavaScript weboldal a GitHub Pageshez.

**Repository:** https://github.com/kingdavidglad/radio69-zsivanyok-podcast  
**Publikus cím:** https://kingdavidglad.github.io/radio69-zsivanyok-podcast/

## Feltöltés

1. Csomagold ki a ZIP-et a számítógépeden.
2. A repositoryban válaszd az **Add file → Upload files** lehetőséget.
3. A kicsomagolt mappa TELJES TARTALMÁT töltsd fel, ne magát a ZIP-et és ne a szülőmappát. Az `index.html` a repository gyökerébe kerüljön; az `assets` és `cikkek` mappák is kellenek.
4. Az azonos nevű fájlokat írd felül. A feltöltött csomagban lévő fájlok: `.nojekyll`, `index.html`, `style.css`, `script.js`, `articles.js`, `article.html`, `article.js`, `chat.js`, `site.config.json`, `robots.txt`, `sitemap.xml`, `assets/` és `cikkek/`.
5. A lap alján kattints a **Commit changes** gombra.
6. A repository **Settings → Pages** menüjében állítsd be a **Deploy from a branch**, `main`, `/(root)` értékeket, majd mentsd el. Ha már így van, nem kell módosítani.
7. Várd meg a Pages-feladat sikeres lefutását az **Actions** oldalon, majd nyisd meg a publikus címet. Frissíts `Ctrl + F5`-tel, ha a régi verzió marad.

## Ne töltsd fel

- `.env` vagy bármely valódi API-kulcsot tartalmazó fájl
- `node_modules/`
- A helyi Node.js háttérszerver fájljai: `server.js`, `package.json`, `package-lock.json`
- A helyi, nem publikált adminfelület: `cikk-szerkeszto.html`

## Korlátozások

- A GitHub Pages statikus tárhely, nem futtatja a Node.js `server.js` szervert. Az AI-chat csak próba módban működik; a valódi OpenAI-válaszokhoz külön, biztonságosan konfigurált háttérszerver szükséges.
- Az API-kulcsot soha ne tedd nyilvános HTML/JavaScript fájlba vagy GitHub repositoryba.
- A helyi Cikkműhelyben létrehozott cikkeket a teljes helyi projektből kell buildelni, majd a generált `articles.js`, `index.html`, `cikkek/`, `robots.txt` és `sitemap.xml` fájlokat újra feltölteni.
- A képek egy része külső, illusztrációs képforrásból töltődik be.


## Mobilnézet-frissítés

A CSS kiegészítő mobilos szabályokat tartalmaz: a témakategória-sáv saját vízszintes görgetést használ, elrejti a belső görgetősávot, és korlátozza a vízszintes túlcsordulást, hogy telefonon ne lehessen véletlenül az egész oldalt oldalra húzni.


## Mobil CSS-frissítés

A `style.css` fájlban az ismétlődő kiegészítő mobilos szabályokat egy áttekinthető, három töréspontot használó blokk váltja fel. A kisebb képernyős elrendezés nem kényszerít `100vw` szélességet a `body` elemre; a témasáv és a kategóriaszűrő saját területen görgethető. A `.env` fájlt és API-kulcsot nem szabad feltölteni.


Mobilos javítás (2026-10-22): a stíluslap hivatkozása verziózott `?v=mobilefix-20261022` paramétert kapott, hogy a böngésző biztosan az új CSS-t töltse le. A `.env` fájlt ne tedd közzé.


## Adatvédelmi tájékoztató – közzététel előtt kötelező ellenőrzés
- Az `adatvedelem.html` fájl a láblécből érhető el. Jelenleg `noindex,follow` beállítású, mert kitöltendő adatkezelői mezőket tartalmaz.
- Mielőtt véglegesnek tekinted, cseréld ki benne az adatkezelő teljes nevére/szervezetére, postai címére vagy székhelyére, valamint a kapcsolattartási e-mail-címére utaló `[IDE ÍRD ...]` helykitöltőket.
- A tájékoztató a jelenlegi statikus GitHub Pages-változatot írja le: nincs bekapcsolva AdSense/Analytics, és az AI-chat próba módban helyben előre meghatározott válaszokat ad. Ha bármelyik funkciót megváltoztatod, előbb frissítsd a tájékoztatót és az esetleg szükséges hozzájáruláskezelést.
- Ez minta, nem személyre szabott jogi tanács. A közzététel előtt ellenőrizd a valós adatkezelési gyakorlatot, és szükség esetén kérj jogi segítséget.

## Rólunk és Kapcsolat oldal

- Új oldal: `rolunk-kapcsolat.html`
- A főoldal menüjéből, a főoldali bemutatkozó részből és a láblécből is elérhető.
- A kapcsolatfelvételi lehetőségek a Rádió69 és a Zsiványok Podcast meglévő nyilvános felületeire mutatnak; nem tartalmaz kitalált e-mail-címet vagy működés nélküli űrlapot.
- Feltöltés előtt ellenőrizd az `adatvedelem.html` fájlban az adatkezelő adatait, és töltsd ki a helykitöltőket.

## Egyéni 404 oldal

- A `404.html` egyéni, mobilbarát hibaoldal a nem létező URL-ekhez.
- GitHub Pages automatikusan ezt a fájlt használja, ha a projekt gyökerében van.
- A hibaoldal nem szerepel a sitemapben, és `noindex,follow` metaadatot használ.

## SEO-frissítés

- A nyolc cikk rövid, egyedi keresési és közösségi címet használ; a látható cikkcímek változatlanok.
- A főoldal HTML-forrásában is megtalálhatók a cikkek közvetlen hivatkozásai, a JavaScriptes kártyarenderelés tartalékaként.
- A `sitemap.xml` csak kanonikus, indexelhető URL-eket tartalmaz; az adatvédelmi mintaoldal `noindex`, ezért nem szerepel benne.
- Közzététel utáni ellenőrzési lépések: `SEO-ELLENORZO.md`.


## Tartalmi frissítés (2026-10-22)
- A magazin 8 forráslinkkel ellátott cikket tartalmaz.
- Két új, időtálló podcastos háttércikk: podcast indításához szükséges alapok; egy epizód becsült munkaráfordítása.
- A főoldali cikklista és a külön HTML-cikkoldalak ugyanabból a cikktárból készültek.
- A cikkek saját megfogalmazású összefoglalók, a források a cikkek végén kattinthatók.
- A műsoridők a Rádió69 hivatalos oldalán 2026-10-22-én ellenőrzött adatokra épülnek, és később változhatnak.
- A képek illusztrációk, nem a podcast hivatalos fotói, ahol ez a képaláírásban szerepel.


## DJ-k oldal
- Új oldal: `dj-k.html` – a jelenlegi állapot „Feltöltés alatt”.
- A DJ-k listáját a `djs.js` fájlban lehet szerkeszteni.
- Töltsd fel a portréfotókat az `assets/djs/` mappába, majd a `djs.js` listájához adj hozzá például egy ilyen elemet: `{ name: "DJ Dave", image: "assets/djs/dj-dave.jpg" }`.
- A nyilvános oldalon csak a DJ portréja és alatta a neve látszik.
- GitHub Pages statikus tárhely, ezért nincs közvetlen, weboldalon belüli fájlfeltöltő adminfelület: a képeket és a `djs.js` fájlt GitHubon kell feltölteni/módosítani.
- Amíg az oldal a „Feltöltés alatt” állapotban van, `noindex` beállítású és nincs benne a sitemapben. Miután hozzáadtad a DJ-ket, frissíteni kell a `dj-k.html` robots meta tagjét és a `sitemap.xml` fájlt.
