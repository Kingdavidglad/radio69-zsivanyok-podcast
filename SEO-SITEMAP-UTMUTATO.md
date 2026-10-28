# Rádió69 – Sitemap és SEO javítás telepítési útmutató

Ez a csomag az előző lépésben előkészített adatvédelmi oldal javítását is tartalmazza, mert a nyilvános GitHub-változat még mindig a régi, kitöltetlen mintaszöveget mutatta. Emellett az oldaltérképet, a cikkenkénti előnézet-generálást és néhány régi canonical/OG hivatkozást javít. A weboldal megjelenését nem változtatja.

## Feltöltendő fájlok

A ZIP mappaszerkezetét megtartva másold a fájlokat a GitHub-repozitórium gyökerébe:

- `sitemap.xml`
- `adatvedelem.html`
- `site.config.json`
- `scripts/generate-social-previews.mjs`
- `.github/workflows/update-social-previews.yml`
- `dj-k.html`
- `rendezvenyek.html`
- `rolunk-kapcsolat.html`

Ezután Commit changes, majd az Actions oldalon futtasd le az **Update article social previews** munkafolyamatot a `main` ágon. A workflow frissített változata a `social-previews` mappát és a `sitemap.xml` fájlt együtt commitolja.

## Mit változtat?

- A sitemap tartalmazza a főoldalt, az adatvédelmi oldalt, a fontos nyilvános aloldalakat és a statikus cikkeket. A `noindex` jelölésű oldalak kimaradnak.
- A generátor a Supabase-ben publikált, de még statikus cikkoldallal nem rendelkező cikkeket is felveszi a sitemapbe.
- Az újonnan publikált cikkek frissítik a sitemapet a meglévő 15 percenkénti workflow-futás során.
- A statikus cikkekhez a megosztási előnézeti oldalak a megfelelő cikk URL-jére mutató canonical linket kapják. Az előnézeti segédoldalak `noindex` jelölést kapnak, hogy ne versenyezzenek a tényleges tartalommal a Google találatai között.
- Javul a DJ-k, Rendezvények és Rólunk oldalak canonical/Open Graph domainje: `radio69zsivanyok.hu`.

## Ellenőrzés

1. Nyisd meg: `https://radio69zsivanyok.hu/sitemap.xml`.
2. Ellenőrizd, hogy csak a saját `radio69zsivanyok.hu` domainre mutató, indexelhető URL-ek szerepelnek-e.
3. A Google Search Console-ban nyisd meg a **Webhelytérképek** menüt és küldd be újra a `sitemap.xml` útvonalat, ha szükséges.
4. A **URL-ellenőrzés** eszközzel ellenőrizd a főoldalt és legalább egy cikket; az indexelés nem azonnali és a beküldés nem garantálja az indexelést.

Megjegyzés: az adatvédelmi oldal ebben a csomagban indexelhetővé válik, és bekerül az oldaltérképbe. Ha a tényleges adatkezelési gyakorlat később változik, a tájékoztatót frissíteni kell.
