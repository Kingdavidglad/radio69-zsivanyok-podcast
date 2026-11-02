# Rádió69 – műsorértesítések frissítőcsomag

## Mit tartalmaz ez a csomag?
- `musoraink.html`, `musoraink.css`, `musoraink.js`: a heti műsorrend oldal.
- `show-schedule.json`: a heti műsorrend adatai.
- `show-push-config.js`: a feltöltött NYILVÁNOS VAPID kulcs beállítása.
- `radio69-show-push/service-worker.js`: külön háttérszolgáltatás a műsorértesítésekhez.
- `supabase/functions/...`: javított Edge Function források.
- SQL, CLI-beállítás és telepítési útmutató.

## Fontos kompatibilitási javítás
A weboldal korábbi értesítési rendszere másik VAPID-kulcsot és a gyökér (`/`) Service Worker-regisztrációt használja. A műsorértesítések ezért külön `/radio69-show-push/` scope-ot és külön PushManager-előfizetést használnak. A meglévő `push-config.js`, `push-notifications.js` és a fő `service-worker.js` értesítési viselkedését ez a csomag nem cseréli le.

A Supabase REST-hívásoknál a modern `sb_secret_...` kulcs csak `apikey` fejlécben szerepelhet; nem szabad `Authorization: Bearer` fejlécként elküldeni. A két Edge Function forrás ezt is javítja.

## 1. Fájlok bemásolása
A ZIP-et csomagold ki. A mappák relatív útvonalát megtartva másold a fájlokat a meglévő `radio69-zsivanyok` projekt gyökerébe, és engedélyezd az azonos nevű fájlok felülírását.

**Ne töröld és ne írd felül** a projekt meglévő `push-config.js`, `push-notifications.js` vagy fő `service-worker.js` fájljait.

## 2. Edge Functionök újratelepítése
A projekt gyökerében nyiss PowerShellt, majd futtasd:

```powershell
npx.cmd --yes supabase@latest functions deploy radio69-show-subscriptions --use-api
npx.cmd --yes supabase@latest functions deploy radio69-show-reminders --use-api
```

A titkokat ne írd be a parancsba, és ne küldd el senkinek. A VAPID privát kulcs és a CRON titok csak a Supabase Secrets felületén maradjon.

## 3. Weboldal közzététele
Töltsd fel a ZIP-ben lévő statikus webfájlokat és a `radio69-show-push/` mappát a GitHub Pages repozitórium megfelelő útvonalaira. A `supabase/` mappa forráskódját is érdemes a repóban tartani, hogy a következő telepítéskor a verziók egyezzenek.

A főoldal főmenüjébe a „Főoldal” link után kerüljön be:
```html
<a href="musoraink.html">Műsoraink</a>
```

A `sitemap.xml` fájlba kerüljön be:
```xml
<url><loc>https://radio69zsivanyok.hu/musoraink.html</loc></url>
```

## 4. Próba
A GitHub Pages frissítése után nyisd meg:
`https://radio69zsivanyok.hu/musoraink.html`

Válassz ki egy legalább 20 perc múlva kezdődő műsort, engedélyezd a böngésző értesítéseit, és ellenőrizd, hogy az előfizetés megjelenik-e a Supabase `radio69_show_push_subscriptions` táblájában.

A tényleges 15 perces próbát a következő megfelelő műsorkezdésnél, illetve a Supabase Edge Function Logs és Cron futások ellenőrzésével lehet igazolni.
