# Rádió69 – Böngészős értesítések (Web Push)

Ez a csomag az első fejlesztést tartalmazza: a látogató önként feliratkozhat a böngészős értesítésekre, és a Cikkműhelyből első alkalommal közzétett cikk push értesítést küld a feliratkozott eszközökre.

## A csomag fájljai

- `index.html` – teljes, frissített főoldal; az értesítési gomb a nyitó szekcióban jelenik meg.
- `service-worker.js` – teljes, frissített Service Worker push- és értesítéskattintás-kezeléssel.
- `push-config.js` – a böngészőben használható nyilvános VAPID-kulcs (nem titok).
- `push-notifications.js` – feliratkozás és leiratkozás, csak gombnyomásra kér böngészőengedélyt.
- `cikk-szerkeszto.html` – teljes Cikkműhely-fájl; új cikk első publikálásakor meghívja az értesítésküldő Edge Functiont.
- `push-subscriptions.sql` – a push-eszközfeliratkozások táblája.
- `supabase/functions/manage-push-subscription/index.ts` – feliratkozás mentése/törlése szerveroldalon.
- `supabase/functions/send-article-push/index.ts` – csak bejelentkezett főszerkesztő indíthat cikkértesítést.

A szolgáltatásfiók/privát VAPID-kulcs nincs a ZIP-ben.

## Telepítési sorrend

### 1. Biztonsági mentés és GitHub-fájlok

1. Készíts biztonsági másolatot a GitHub-projektről.
2. Másold át a csomag fájljait a repozitórium megfelelő útvonalaira, a teljes mappaszerkezet megtartásával. A csomagban szereplő teljes fájlokkal írd felül a meglévőket.
3. A `supabase/functions/...` mappákat is hozd létre, és másold be az Edge Function fájlokat.
4. A többi meglévő fájlhoz nem kell nyúlni. A `supabase-config.js`, `analytics-config.json`, korábbi GA4 kulcsok és más Secret értékek maradjanak változatlanok.
5. Commit és Push a GitHubra.

### 2. Adatbázistábla

1. Supabase Dashboard → SQL Editor → New query.
2. Másold be a `push-subscriptions.sql` teljes tartalmát.
3. Futtasd le egyszer. A tábla privát: az anon/authenticated szerepkörök nem olvashatják és nem írhatják közvetlenül; az Edge Function a szerveroldali service role jogosultságot használja.

### 3. VAPID-titkok

A ZIP-en kívül külön kapott `RADIO69-PUSH-SECRETS-PRIVATE.txt` fájlból másold be a `PUSH_VAPID_PRIVATE_KEY` értékét. A Supabase Dashboard → Edge Functions → Secrets részen hozz létre három Secretet:

- `PUSH_VAPID_PUBLIC_KEY` = a `push-config.js` fájlban található nyilvános kulcs.
- `PUSH_VAPID_PRIVATE_KEY` = a külön titkos fájlban található érték.
- `PUSH_VAPID_SUBJECT` = `mailto:zsivanyokpodcast@gmail.com`

Ne töltsd fel a privát kulcsot GitHubra, ne tedd HTML/JS fájlba, és ne küldd el üzenetben. A privát fájlt a beállítás után tartsd biztonságos helyen vagy töröld.

### 4. Edge Function – feliratkozás mentése

1. Supabase Dashboard → Edge Functions → Deploy a new function → Via Editor.
2. Név: `manage-push-subscription`.
3. Az `index.ts` tartalmát cseréld le a csomag `supabase/functions/manage-push-subscription/index.ts` fájljának teljes tartalmára.
4. A funkció beállításainál kapcsold KI a **Verify JWT** ellenőrzést ennél az egy funkciónál. Ez azért kell, mert a látogatók bejelentkezés nélkül iratkozhatnak fel. A függvény CORS-origin ellenőrzést, push-szolgáltató host-engedélylistát és szerveroldali validálást használ.
5. Deploy.

### 5. Edge Function – cikkértesítések küldése

1. Hozz létre új Edge Functiont `send-article-push` néven.
2. Másold be a csomag `supabase/functions/send-article-push/index.ts` fájljának teljes tartalmát.
3. A **Verify JWT** maradjon BEKAPCSOLVA. Csak bejelentkezett felhasználó kérheti; a szerver ellenőrzi az `editor_profiles` táblában, hogy `chief_editor` szerepköre van-e.
4. Deploy.

A funkció a Supabase Edge Runtime NPM-kompatibilitásával a `web-push` csomagot használja. A Supabase futtatókörnyezete biztosítja a `SUPABASE_URL`, `SUPABASE_ANON_KEY` és `SUPABASE_SERVICE_ROLE_KEY` változókat.

### 6. Ellenőrzés

1. Várd meg a GitHub Pages frissítését.
2. Nyisd meg a `https://radio69zsivanyok.hu/` oldalt friss böngészőfülön.
3. Kattints a „Értesítések bekapcsolása” gombra, és engedélyezd az értesítést a böngészőben.
4. A sikeres feliratkozás után ellenőrizd a Supabase Table Editorban, hogy a `push_subscriptions` táblában létrejött-e egy rekord. Az endpoint és a kulcsmezők érzékeny technikai adatok; ne oszd meg nyilvánosan.
5. A Cikkműhelyben jelentkezz be főszerkesztőként, hozz létre egy tesztcikket, majd publikáld. Az első publikálás után kell megérkeznie az értesítésnek.
6. Nyisd meg az értesítést: a cikk `cikk.html?id=...` útvonalára kell vezetnie.

## Fontos megjegyzések

- A feliratkozás önkéntes; a böngésző csak a gomb megnyomása után kér engedélyt.
- Leiratkozni ugyanazzal a gombbal lehet; a feliratkozás külön eszközön/böngészőben külön rekord.
- A cikk későbbi szerkesztése nem küld új értesítést, csak a draft/pending állapotból published állapotba történő első átmenet.
- A push csak akkor érkezik meg, ha a böngésző/eszköz támogatja a Web Push rendszert, az engedély megadott, és az internetkapcsolat működik. iPhone/iPad esetén a Web Push az iOS/iPadOS megfelelő verzióján, a kezdőképernyőhöz adott webalkalmazásban működik.
- A régi statikus cikkek és a friss főoldal nem változtatják meg a meglévő cikkadatokat; az új értesítések az adatbázisban publikált cikkekre vonatkoznak.
- A push-értesítések kézbesítése külső böngészőpush-szolgáltatón keresztül történik; azonnali kézbesítés nem garantálható.
