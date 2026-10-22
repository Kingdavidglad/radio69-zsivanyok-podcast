# Rádió69 biztonsági csomag – telepítési útmutató

Ez a csomag kiegészítő fájlokat tartalmaz. **Nem írja felül a weboldal meglévő HTML-, CSS- vagy JavaScript-fájljait**, így kisebb az esélye, hogy egy korábbi weboldal-frissítést felülírjon.

## A csomag tartalma

- `.gitignore` – segít megakadályozni, hogy a helyi `.env` fájlok, kulcsok és fejlesztői fájlok véletlenül bekerüljenek a Git követésébe.
- `SECURITY.md` – leírja, hogyan lehet a biztonsági hibákat felelősen jelezni.
- `.github/dependabot.yml` – heti ellenőrzést kér a GitHub Actions függőségeire, és szükség esetén frissítési javaslatot nyithat.
- `.github/workflows/codeql-security.yml` – automatikus JavaScript-biztonsági elemzést futtat feltöltéskor, pull requestnél és hetente.

## Feltöltés a GitHubra

1. Csomagold ki a ZIP-fájlt a számítógépeden.
2. Nyisd meg a projektet: https://github.com/kingdavidglad/radio69-zsivanyok-podcast
3. A **Add file → Upload files** lehetőséggel töltsd fel a csomagban levő fájlokat úgy, hogy a rejtett `.github` mappa és annak almappái is megmaradjanak.
4. A célútvonalak legyenek pontosan:
   - `.gitignore`
   - `SECURITY.md`
   - `.github/dependabot.yml`
   - `.github/workflows/codeql-security.yml`
5. Kattints a **Commit changes** gombra.
6. A feltöltés után nyisd meg az **Actions** fület, és ellenőrizd a **CodeQL security scan** futását. A vizsgálat eredményét a **Security** fülön is meg lehet nézni, ha a kódvizsgálati funkció engedélyezett.

Ha a repóban már be van kapcsolva a CodeQL **Default setup**, a mellékelt workflow feltöltése előtt ellenőrizd a **Security → Code scanning** beállítást. Ugyanarra a nyelvre ne használd egyszerre az alapértelmezett és az egyéni workflow-s beállítást; válassz egyet.

## GitHub-fiók védelme – ezt külön kell beállítani

Ezeket a fiókbeállításokat a fájlok nem tudják automatikusan bekapcsolni:

1. GitHub-profilkép → **Settings → Password and authentication → Two-factor authentication**. Kapcsold be a kétlépcsős hitelesítést; előnyös a passkey vagy hitelesítő alkalmazás használata. Adj meg helyreállítási lehetőséget, és a helyreállító kódokat mentsd biztonságos, offline helyre.
2. A repó **Settings → Collaborators** részében nézd át, kinek van írási hozzáférése. Távolítsd el az ismeretlen vagy már nem szükséges hozzáféréseket.
3. A repó **Security** lapján nézd meg a titokészlelési riasztásokat és a Dependabot-értesítéseket. Nyilvános repóknál a GitHub a titokészlelést automatikusan futtatja, de ellenőrizd a riasztások beállításait is.
4. Ha valaha valódi API-kulcs került a repóba, ne elégedj meg a fájl törlésével: vond vissza a kulcsot a szolgáltatónál, és csak ezután hozz létre szükség esetén újat. A Git-előzmények a régi értéket továbbra is tartalmazhatják.
5. Minden módosítás előtt tarts meg egy ismert, működő mentést. A repozitórium nyilvános fájljait bárki elolvashatja; a weboldal JavaScript-kódjába ne kerüljön titkos kulcs.

Részletes hivatalos útmutatók:
- GitHub kétlépcsős hitelesítés: https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa
- GitHub biztonsági és elemzési beállítások: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-security-and-analysis-settings-for-your-repository

## Amit ez a csomag nem tesz meg

- Nem teszi feltörhetetlenné az oldalt, és nem akadályozza meg, ha valaki megszerzi a GitHub-fiókod hozzáférését.
- A CodeQL elemzés figyelmeztethet bizonyos kódbiztonsági problémákra, de nem talál meg minden hibát.
- A `.gitignore` a jövőbeni véletlen hozzáadást segíti; nem távolít el már követett fájlt és nem törli a Git-előzményeket.
- A GitHub Pages nem alkalmazza a Cloudflare Pages saját `_headers` fájlját, ezért ilyen fájl nincs ebben a csomagban.

A GitHub Pages esetében a legnagyobb gyakorlati nyereséget a fiók kétlépcsős védelme, az írási hozzáférések ellenőrzése, a titkok távol tartása és a rendszeres kódellenőrzés adja.
