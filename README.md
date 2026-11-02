# Rádió69 × Zsiványok Podcast – weboldalprojekt

A projekt a [radio69zsivanyok.hu](https://radio69zsivanyok.hu/) statikus GitHub Pages weboldalának teljes forrását tartalmazza.

## Új fejlesztés: heti műsorrend és 15 perces push értesítések

- `musoraink.html` – heti műsorrend hétfőtől vasárnapig.
- `show-schedule.json` – a műsorok és időpontok központi listája.
- `musoraink.js` és `musoraink.css` – műsorválasztás, értesítési felület és megjelenés.
- `show-push-config.js` – kizárólag a VAPID nyilvános kulcsának helye.
- `service-worker.js` – háttérben fogadja a push üzeneteket és megjeleníti az értesítést.
- `supabase/functions/radio69-show-subscriptions/` – előfizetések mentése és törlése.
- `supabase/functions/radio69-show-reminders/` – a kezdések előtti értesítések kiküldése.
- `radio69-show-push.sql` – adatbázistáblák és biztonsági beállítások.
- `radio69-show-push-scheduler.sql` – percenkénti Supabase Cron ütemezés.

**Telepítési útmutató:** [README-PUSH-ERTESITESEK.md](README-PUSH-ERTESITESEK.md). A bezárt weboldal melletti értesítés a Supabase SQL-, Secret- és Edge Function-beállítások, valamint a GitHub Pages frissítése után működik.

## Egyéb projekt- és karbantartási útmutatók

- `README-FEJLESZTESEK-HU.md` – korábbi weboldal-fejlesztések, telepítési és ellenőrzési útmutató.
- `README-BIZTONSAGI-CSOMAG.md` és `BIZTONSAGI-UTMUTATO-HU.md` – biztonsági tudnivalók.
- `ANALITIKA-BEALLITASI-UTMUTATO.md` – analitikai konfiguráció.

## Biztonság

A `supabase-config.js` fájlban kizárólag a nyilvános `sb_publishable_...` klienskulcs szerepelhet. Supabase Secret API-kulcsot, `service_role` kulcsot, VAPID privát kulcsot vagy CRON titkot soha ne tegyél a nyilvános repozitóriumba vagy weboldali JavaScript-fájlba. A helyi `.env` fájlokat a `.gitignore` kizárja a Gitből.
