# Rádió69 × Zsiványok Podcast — GitHub Pages kiadás

Ez a mappa a statikus weboldal GitHub Pages-re feltölthető változata.

## Célcím

https://kingdavidglad.github.io/radio69/

## Feltöltés

1. Csomagold ki a ZIP-et.
2. Nyisd meg a https://github.com/kingdavidglad/radio69 oldalt.
3. Válaszd az **Add file → Upload files** lehetőséget.
4. A kicsomagolt mappa **tartalmát** húzd be (ne magát a mappát). Az `index.html` közvetlenül a repository gyökerébe kerüljön; az `assets` és a `cikkek` könyvtárakat is töltsd fel.
5. A lap alján add meg a commit leírását, például: `Frissítés: Rádió69 × Zsiványok magazin`, majd kattints a **Commit changes** gombra.
6. A repositoryban nyisd meg a **Settings → Pages** részt. A **Build and deployment** alatt a forrás legyen **Deploy from a branch**, a branch `main`, a mappa `/(root)`, majd **Save**. Ha már így van beállítva, ezt a lépést kihagyhatod.
7. Várd meg, amíg a GitHub Pages deployment sikeres lesz, majd nyisd meg a fenti célcímet. Ha a régi oldal maradna, frissíts keményen `Ctrl + F5`-tel.

## Fontos korlátozások

- Ez a kiadás statikus HTML/CSS/JavaScript. GitHub Pages nem futtatja a `server.js` Node.js szervert, ezért a chat **próba módban** működik; a valódi OpenAI-válaszokhoz külön Node.js-tárhely vagy háttérszolgáltatás szükséges.
- API-kulcs, `.env` fájl és szerverkód nincs ebben a csomagban. API-kulcsot soha ne tölts fel nyilvános repositoryba.
- A helyi Cikkműhely (`cikk-szerkeszto.html`) szándékosan kimaradt a nyilvános kiadásból. Új cikket a teljes helyi projektben készíts, futtasd a `npm.cmd run build:articles` parancsot, majd töltsd fel a friss `articles.js`, `index.html`, `cikkek/`, `robots.txt` és `sitemap.xml` fájlokat.
- A `site.config.json` és a `sitemap.xml` már a fenti GitHub Pages-címhez készült.
- A képek egy része külső, illusztrációként használt kép URL-ről töltődik be.
