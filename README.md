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
