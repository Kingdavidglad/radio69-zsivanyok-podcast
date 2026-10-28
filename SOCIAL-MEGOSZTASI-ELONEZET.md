# Rádió69 – közösségi megosztási előnézetek

Ez a fejlesztés a cikkek megosztásakor megjelenő címet, leírást és képet kezeli. A weboldal GitHub Pages-en statikus HTML-ként fut, ezért a közösségi oldalak robotjai nem feltétlenül futtatják le a cikket betöltő JavaScriptet. A `scripts/generate-social-previews.mjs` és a hozzá tartozó GitHub Actions munkafolyamat ezért valódi, metaadatokat tartalmazó statikus oldalakat állít elő.

## Beállítás GitHubon

1. Töltsd fel a frissített fájlokat a `main` ágra.
2. A GitHub-repozitóriumban nyisd meg a **Settings → Actions → General → Workflow permissions** részt.
3. Válaszd az **Read and write permissions** lehetőséget, majd mentsd el. A munkafolyamatnak csak a saját, generált `social-previews/` fájljainak frissítéséhez kell írnia a repozitóriumba.
4. Nyisd meg az **Actions → Update article social previews** munkafolyamatot, és válaszd a **Run workflow** műveletet az első futtatáshoz.
5. Sikeres futás után a GitHub Actions létrehozza vagy frissíti a publikált cikkek statikus oldalait. A későbbi frissítések automatikusan, 15 percenként futnak le.

## Hogyan működik?

- A generator kizárólag a Supabase-ből publikált státuszúként visszakapott cikkeket használja.
- A cikk saját címe, ajánlója, képe és kép-alternatív szövege kerül az Open Graph és Twitter metaadatokba.
- A generált oldalak a `https://radio69zsivanyok.hu/social-previews/CIKKAZONOSITO/` útvonalon lesznek elérhetők.
- A megosztási ablak először ellenőrzi, hogy létezik-e ilyen statikus előnézeti oldal; ha még nem készült el, a jelenlegi cikkhivatkozást használja.
- A cikk szerkesztője és a meglévő weboldal dizájnja nem változik.

## Fontos

A GitHub Actions nem tud publikálni, ha a repozitórium beállításai tiltják a munkafolyamatoknak az írást. Ha a futás hibával áll le, először az Actions munkafolyamat naplóját, majd a fenti jogosultságot és a Supabase `articles` tábla nyilvános, `published` státuszú cikkekre korlátozott olvasási szabályát ellenőrizd. Titkos `service_role` vagy `sb_secret_` kulcsot ne adj ehhez a folyamathoz.
