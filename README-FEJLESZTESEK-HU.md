# Rádió69 – 1., 3., 4. és 5. fejlesztés

Ez a csomag négy fejlesztést tartalmaz: közvetlenül beküldhető bartermegkeresés, hozzájárulás után működő GA4 tartalom-/megosztási események, képek és betöltés optimalizálása, valamint automatikus SEO/oldaltérkép-alapellenőrzés.

## Mi van a csomagban?
- `mediaajanlat.html`: barterűrlap adatvédelmi nyugtázással, közvetlen adatbázis-beküldéssel és e-mailes tartalék lehetőséggel.
- `barter-inquiry.js`: a form a már meglévő `supabase-config.js` publikus kliensbeállítását használja.
- `supabase-barter-inquiries.sql`: Supabase-adatbázis migráció. A publikus szerepkörök csak új megkeresést küldhetnek be; nincs nyilvános listázási, olvasási, módosítási vagy törlési jogosultság.
- `analytics.js`: GA4 események a látogató analitikai hozzájárulása után: cikkmegtekintés, 75%-os cikkolvasás, 50%-os görgetés, megosztási ablak és megosztási mód, kimenő linkek és barterűrlap eseményei. A név, e-mail-cím, felajánlás és más űrlapérték nem kerül a Google Analyticsbe.
- `assets/djs/*.webp` és `djs.js`: kilenc optimalizált DJ-portré WebP formátumban.
- `service-worker.js`: frissített PWA-gyorsítótár, hogy az új statikus fájlok betölthetők legyenek.
- `scripts/site-quality-check.mjs` és `.github/workflows/site-quality-check.yml`: automatikus SEO-metaadat-, canonical-domain-, helyi hivatkozás- és sitemap-ellenőrzés.
- Módosított nyilvános HTML-oldalak: képbetöltési finomhangolás, async dekódolás és néhány SEO-hivatkozás javítása.

## Telepítés – ajánlott mód (GitHub Desktop)
A csomag 45 fájlt érint, ezért biztonságosabb a mappaszerkezet megtartásával frissíteni, nem egyesével kézzel létrehozni a fájlokat.

1. Tölts le egy biztonsági másolatot a jelenlegi GitHub-projektről.
2. Klónozd a `Kingdavidglad/radio69-zsivanyok-podcast` repozitóriumot a GitHub Desktop alkalmazásban, vagy nyisd meg a már meglévő helyi klónodat.
3. Csomagold ki ezt a ZIP-et egy külön mappába. Másold át a ZIP tartalmát a helyi repozitórium mappájába úgy, hogy a mappastruktúra megmaradjon, és a rendszer kérésére írd felül a módosított fájlokat. A `.github` mappa része a csomagnak; a fájlútvonala `.github/workflows/site-quality-check.yml`.
4. **Ne írd felül és ne módosítsd az `analytics-config.json` fájlt.** Ez a csomag szándékosan nem tartalmazza, így a korábban beállított `G-...` azonosítód megmaradhat.
5. GitHub Desktopban ellenőrizd a változtatáslistát, írj commit üzenetet, például `Barter form, analytics, performance and SEO checks`, majd nyomd meg a **Commit** és a **Push origin** gombot.

## A barterűrlap egyszeri adatbázis-beállítása
1. Lépj be a weboldal `supabase-config.js` fájljában szereplő projekt Supabase Dashboardjába.
2. Nyisd meg az **SQL Editor** részt, hozz létre egy **New query** lekérdezést.
3. Másold be a ZIP-ben lévő `supabase-barter-inquiries.sql` teljes tartalmát, majd futtasd le egyszer.
4. A beküldések a Supabase **Table Editor → `barter_inquiries`** táblájában jelennek meg.

Az űrlap jelenlegi változata **nem küld automatikus e-mail-értesítést**. A beküldéseket a Supabase Dashboardban kell ellenőrizni. Automatikus e-mailhez később külön szerveroldali funkció és e-mail-szolgáltató beállítása szükséges.

## Ellenőrzés feltöltés után
1. Várd meg a GitHub Pages telepítését, és a GitHub **Actions** alatt a **Site quality check** munkafolyamatot. A script helyben 28 HTML-oldalt és a sitemap 18 URL-jét ellenőrizte sikeresen.
2. Nyisd meg a `mediaajanlat.html` oldalt, küldj be próba-megkeresést, és ellenőrizd a Supabase `barter_inquiries` táblát. A tesztsort később törölheted a Dashboardból.
3. A Google Analytics **Realtime** vagy **DebugView** felületén analitikai hozzájárulás elfogadása után ellenőrizd a `share_click`, `article_read` és `barter_inquiry_success` eseményeket.
4. Ha a `share_method`, `content_title`, `content_path` vagy `link_domain` paraméter szerinti bontás kell a GA4 jelentésekben, a **Configure/Admin → Custom definitions** részben hozz létre ezeknek eseményszintű egyéni dimenziókat. Az eseményszintű paraméterek DebugView-ban a dimenzió létrehozása előtt is vizsgálhatók.

## Fontos biztonsági/adatvédelmi tudnivalók
- A `sb_publishable_...` kulcs publikus klienskulcs, a táblát az SQL-ben engedélyezett RLS-szabály védi. **Secret/service_role kulcsot soha ne tegyél a weboldalba.**
- A publikus űrlap csak új megkeresést írhat be. A beküldések olvasása a weboldalról nem lehetséges; az adatkezelő a Supabase Dashboardon tekintheti meg őket.
- Az analitikai események csak a látogató hozzájárulása után mennek a GA4 felé, és nem tartalmazzák a barterűrlapmezők tartalmát.
- A honeypot alap spamcsökkentés, nem teljes CAPTCHA vagy rate-limit. Ha spam jelentkezik, szükség lehet további védelemre.
- A megőrzési időt és az adatkezelés jogalapját a tényleges működésed alapján kell meghatározni és a tájékoztatóban feltüntetni. A technikai fájlok nem helyettesítenek jogi tanácsot.
