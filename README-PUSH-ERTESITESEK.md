# Rádió69 – heti műsorrend és 15 perces push értesítések

A csomag tartalmazza a Rádió69 hivatalos heti műsorrendjéből elkészített `musoraink.html` oldalt, a műsoronként választható böngészős push értesítéseket, a Supabase Edge Functionöket, az adatbázis-sémát és a percenkénti ütemezőt.

**Fontos:** a weboldal fájljai és a backend kódja elkészült, de a bezárt weboldal melletti tényleges értesítés csak a Supabase lépések és a GitHub Pages frissítés után fog működni. A Supabase-projektbe és a GitHub-fiókba innen nem történt belépés, ezért a funkciók még nincsenek élesítve.


**Meglévő push rendszer megőrzése:** a műsorértesítések külön `/radio69-show-push/` Service Worker-scope-ot használnak, így nem cserélik le a főoldal jelenlegi push-regisztrációját és VAPID-kulcsát.

## 1. Mit fog látni a látogató?

- A `https://radio69zsivanyok.hu/musoraink.html` oldalon a teljes heti műsorrend hétfőtől vasárnapig.
- Minden egyedi műsorhoz „Értesítést kérek” gomb.
- A visszatérő műsorok egy kiválasztással minden heti előfordulásukra bekapcsolódnak.
- A műsor kezdése előtt 15 perccel érkezik az értesítés.
- Az „Összes értesítés kikapcsolása” gomb törli az adott böngésző push-előfizetését.
- A Rádió69 Hits és Remix folyamatos zenei csatornaként jelenik meg, mivel nincs fix műsorkezdési időpontjuk.

A heti kínálat a `show-schedule.json` fájlban található. Az Edge Function ugyanennek a fájlnak a másolatát használja a `supabase/functions/_shared/show-schedule.json` útvonalon. A két fájlt módosításkor együtt kell frissíteni.

## 2. Push kulcsok létrehozása

A projekt gyökerében futtasd:

```bash
node scripts/generate-radio69-push-secrets.mjs
```

A script három értéket ír ki:

1. **VAPID nyilvános kulcs:** másold a `show-push-config.js` fájl `vapidPublicKey` mezőjébe.
2. **VAPID privát kulcs:** kizárólag Supabase Secret legyen.
3. **CRON titok:** ugyanazt az értéket add meg a Supabase Secretben és a scheduler SQL-ben található Vault-helyőrző helyén.

Például a `show-push-config.js` fájlban csak a nyilvános kulcs szerepelhet:

```js
window.RADIO69_SHOW_PUSH_CONFIG = {
  vapidPublicKey: 'IDE_A_GENERATOR_NYILVANOS_KULCSA'
};
```

**A privát VAPID kulcsot, a CRON titkot és a Supabase Secret API-kulcsot soha ne töltsd fel GitHubra, és ne tedd a weboldal JavaScript-fájljába.** Ha valamelyik titok véletlenül nyilvánosságra kerül, új kulcsot kell generálni és a régit vissza kell vonni.

## 3. Supabase Edge Function titkok beállítása

A Supabase projektben a projektazonosító a meglévő `supabase-config.js` alapján: `zmejdydtgxotkscluqlo`.

A projekt gyökerében, Supabase CLI használatával:

```bash
supabase login
supabase link --project-ref zmejdydtgxotkscluqlo
```

Készíts egy `supabase/functions/.env` nevű helyi fájlt (ezt a `.gitignore` kizárja a GitHub-feltöltésből), és másold bele a generátorral kapott értékeket:

```dotenv
RADIO69_VAPID_PUBLIC_KEY=IDE_A_VAPID_NYILVANOS_KULCS
RADIO69_VAPID_PRIVATE_KEY=IDE_A_VAPID_PRIVAT_KULCS
RADIO69_CRON_SECRET=IDE_A_GENERALT_CRON_TITOK
RADIO69_VAPID_SUBJECT=mailto:zsivanyokpodcast@gmail.com
```

Majd a projekt gyökeréből töltsd fel a titkokat a Supabase-be:

```bash
supabase secrets set --env-file supabase/functions/.env
```

A `supabase/functions/.env` fájlt ne commitold és ne küldd el senkinek. A feltöltés után a helyi fájlt biztonságosan törölheted, vagy őrizd kizárólag a saját gépeden, a repozitóriumon kívül.

A Supabase Edge Functions automatikusan megkapja a projekt `SUPABASE_URL` és `SUPABASE_SECRET_KEYS` környezeti változóit. A backend a Supabase Secret API-kulcsot használja; azt nem szabad a böngészőbe másolni. A meglévő `sb_publishable_...` kulcs marad a nyilvános weboldali konfigurációban.

## 4. Adatbázis létrehozása

Nyisd meg a Supabase Dashboardot, majd a **SQL Editor** felületet. Futtasd le a projekt gyökerében található:

`radio69-show-push.sql`

Ez létrehozza a böngésző-előfizetések és a kézbesítési duplikációk kezeléséhez szükséges táblákat. A táblákon engedélyezett a Row Level Security, a publikus böngészőszerepkörök nem kapnak közvetlen hozzáférést.

## 5. A szükséges Supabase-bővítmények

A Supabase Dashboard **Database → Extensions** részén ellenőrizd, hogy elérhető és engedélyezett legyen:

- `pg_cron` – percenkénti ütemezéshez;
- `pg_net` – a háttérben futó Edge Function meghívásához;
- Supabase Vault (`vault` séma) – a CRON titok és a Supabase Secret API-kulcs biztonságos tárolásához.

A bővítmények neve és elérhetősége a projekt Dashboard-felületén ellenőrizhető.

## 6. A percenkénti ütemező beállítása

A `radio69-show-push-scheduler.sql` fájlban két helyőrzőt kell lecserélni:

- `PASTE_A_GENERATOR_ALTAL_KIIRT_CRON_SECRET` → a 2. lépésben generált CRON titok;
- `PASTE_A_SUPABASE_SECRET_API_KEY` → a Supabase Dashboard **Project Settings → API Keys → Secret keys** részében található Secret API-kulcs. Ha a projektben még csak a régi kulcsok vannak használatban, a régi `service_role` kulcsot használd.

A fájlban szereplő URL és publikus weboldali projektazonosító már a jelenlegi projekthez van igazítva. A helyőrzők cseréje után futtasd le ezt az SQL-t a Supabase SQL Editorban. A lekérdezés frissíti a Vaultban lévő két értéket, és a régi ütemezési feladatot is lecseréli, ezért a későbbi módosításkor újra lefuttatható. A CRON titkot a Vault tárolja, és a hívás a saját `x-radio69-cron-secret` fejlécével is hitelesíti magát.

Az ütemezés percenként meghívja a `radio69-show-reminders` Edge Functiont. A függvény a `Europe/Budapest` időzónában ellenőrzi a műsorkezdéseket, az adatbázisban megakadályozza a duplikált küldést, sikertelen kézbesítésnél egyszer újrapróbálkozik, a 30 napnál régebbi kézbesítési naplókat pedig törli.

## 7. Edge Functionök telepítése

A projekt gyökerében futtasd:

```bash
supabase functions deploy radio69-show-subscriptions
supabase functions deploy radio69-show-reminders
```

A `supabase/config.toml` fájl már tartalmazza a két funkció `verify_jwt = false` beállítását. A `radio69-show-reminders` ettől függetlenül csak a Supabase Secretben beállított, egyedi CRON titkot elfogadó fejléc mellett végez küldést.

## 8. GitHub Pages frissítése és ellenőrzés

Töltsd fel a projekt módosított fájljait a meglévő GitHub Pages repozitóriumba. A weboldal megnyitása után ellenőrizd:

1. A `https://radio69zsivanyok.hu/musoraink.html` oldalon megjelenik-e mind a hét nap műsorrendje.
2. HTTPS-en, támogatott böngészőben a műsor melletti gomb megnyomásakor megjelenik-e az értesítési engedélykérés.
3. Engedélyezés után az adott műsor „Értesítés aktív” állapotba kerül-e.
4. A Supabase `radio69_show_push_subscriptions` táblában létrejön-e az előfizetés.
5. A Supabase Dashboard **Edge Functions → Logs** és **Cron** felületein láthatók-e sikeres futások.

A próba értesítéshez olyan műsort válassz, amelynek kezdése legalább 20 perccel később esedékes. A tényleges küldést minden esetben a következő, ütemezett ellenőrzés indítja.

## 9. Eszköz- és böngészőtámogatás

- Androidon aktuális Chrome vagy más Push API-t támogató böngésző ajánlott.
- Asztali gépen aktuális Chrome, Edge vagy Firefox használata ajánlott.
- iPhone-on és iPaden az iOS/iPadOS 16.4 vagy újabb rendszeren előbb a weboldalt a **Főképernyőhöz kell adni**, majd a telepített ikonról megnyitva lehet bekapcsolni az értesítést.
- A készüléknek internetkapcsolatra van szüksége, és az operációs rendszer értesítéseit sem szabad letiltani.

A push értesítés szolgáltatói háttérrendszeren keresztül érkezik, ezért a weboldal böngészőfülének bezárása önmagában nem akadály. A teljesen kikapcsolt készülék, hálózati kapcsolat hiánya, böngésző-/operációsrendszer-korlátozás vagy visszavont értesítési engedély késleltetheti vagy megakadályozhatja a megjelenést. iOS-en a Home Screen webapp követelményére különösen figyelni kell.

## 10. Heti műsorrend karbantartása

A hivatalos műsorlista változhat. Módosítás esetén frissítsd a gyökérben lévő `show-schedule.json` és a `supabase/functions/_shared/show-schedule.json` fájlt ugyanazzal a tartalommal, majd telepítsd újra a `radio69-show-reminders` és `radio69-show-subscriptions` függvényeket. A statikus GitHub Pages frissítés önmagában nem frissíti a már telepített Edge Functionök fájljait.

A `Zsiványok Podcast` szezonális beosztása a forrásoldalon jelzett október 1. – május 31. időszakot követi. A műsorrend változhat, ezért az aktuális időpontokat a [Rádió69 hivatalos műsorlistáján](https://radio69.hu/) is ellenőrizd.

## 11. Adatvédelmi ellenőrzés

Az `adatvedelem.html` oldal kiegészült a push-előfizetésekhez kapcsolódó adatokkal, célokkal, megőrzési idővel és kikapcsolási lehetőséggel. Közzététel előtt az adatkezelő ellenőrizze, hogy a tájékoztató megfelel-e a tényleges adatkezelésnek és a saját jogi kötelezettségeinek; szükség esetén kérjen adatvédelmi/jogi szakvéleményt.
