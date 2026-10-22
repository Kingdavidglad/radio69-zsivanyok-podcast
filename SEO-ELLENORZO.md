# SEO-ellenőrző lista — Rádió69 × Zsiványok Podcast

Ez a csomag technikai SEO-frissítést tartalmaz a GitHub Pages kiadáshoz.

## Mi változott?
- Rövidebb, egyedibb `<title>` címek a hat cikkhez; a látható cikkcímek változatlanok.
- Teljesebb közösségi megosztási metaadatok a Rólunk/Kapcsolat oldalon.
- A főoldal HTML-forrásában is vannak belső cikkhivatkozások, így a cikkek a JavaScript betöltése előtt is felfedezhetők.
- A sitemap érvényes XML, csak kanonikus, indexelhető URL-eket sorol fel; a `noindex` adatvédelmi sablon és a 404 oldal nincs benne.
- A `robots.txt` az új GitHub Pages sitemapre mutat.
- A cikkek morzsanavigációjának strukturált adata a kanonikus főoldalra mutat.

## Feltöltés
A `radio69-zsivanyok-podcast` repository `main` ágának gyökerébe töltsd fel a frissített fájlokat. A `.env`, API-kulcs és `node_modules` nem része ennek a csomagnak, és nem is szabad publikálni őket.

## Közzététel utáni teszt
1. Ellenőrizd a főoldalt és a hat cikk-URL-t böngészőben.
2. Nyisd meg a `.../sitemap.xml` címet; az XML-ben nem kell stíluslap, a böngésző „no style information” üzenete normális.
3. A Google Search Console-ban futtass URL-ellenőrzést a főoldalon és egy cikkoldalon; csak ezután kérj indexelést.
4. Ha a sitemap beolvasása továbbra is hibás, a Search Console pontos hibastátuszát ellenőrizd; a fájl helyes XML-szintaxisa önmagában nem garantálja az indexelést.
5. Az Adatvédelem oldal továbbra is `noindex`, amíg az üzemeltetői helykitöltők nincsenek kitöltve.

## Tartalmi megjegyzés
A cikkoldalakon még van szerkesztési/mintatartalomra figyelmeztető szöveg. Mielőtt ezekre jelentős keresőforgalmat vagy AdSense-jóváhagyást alapoznál, cseréld le a minta részeket végleges, saját, ellenőrzött és forrásolt szövegre. A metaadatok nem garantálnak Google-indexelést vagy helyezést.
