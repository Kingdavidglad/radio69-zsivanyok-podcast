# SEO és tartalom ellenőrzőlista

A projekt aktuális GitHub Pages címe: `https://kingdavidglad.github.io/radio69-zsivanyok-podcast/`.

## Cikkek
- 8 közzétett cikk van az `articles.js` fájlban.
- Minden cikknek külön `.html` oldala van a `cikkek/` mappában.
- Minden oldal kapott egyedi címet, leírást, canonical URL-t, Open Graph / Twitter metaadatokat és BlogPosting strukturált adatot.
- A források az egyes cikkek alján kattinthatók.
- A műsoridőkről szóló cikkek megjegyzik, hogy a hivatalos műsorrend változhat.

## Google Search Console
1. Nyisd meg az URL-ellenőrzést a főoldalra és a fontos cikkekre.
2. Kérj indexelést az indexelhető URL-ekre.
3. A Webhelytérképek résznél küldd be a `sitemap.xml` útvonalat.
4. Ha a sitemap hibát mutat, ellenőrizd a közvetlen URL-t: `https://kingdavidglad.github.io/radio69-zsivanyok-podcast/sitemap.xml`.

## Publikálás előtti ellenőrzések
- Az `adatvedelem.html` helykitöltőit valódi adatkezelői adatokra kell cserélni; addig `noindex` marad és nincs a sitemapben.
- Ellenőrizd a közösségi linkeket és a külső forrásokat.
- A `.env` és minden API-kulcs titok: GitHubra feltölteni tilos.
- A GitHub Pages statikus tárhely; a valós AI-válaszhoz külön, biztonságos háttérszerver kell.
