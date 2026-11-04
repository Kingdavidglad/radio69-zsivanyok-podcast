# Rádió69 – Cikkreakciók és moderált hozzászólások

Ez a csomag a jelenlegi Rádió69 weboldalhoz illeszkedő közösségi modult ad a cikkek alá.

## Mit tartalmaz?

- három reakció cikkenként: Tetszik, Hasznos, Érdekes;
- névvel beküldhető, 3–1000 karakteres hozzászólás;
- válasz az első szintű, már jóváhagyott hozzászólásokra;
- minden új hozzászólás alapértelmezetten moderálásra vár;
- csak a főszerkesztő hagyhat jóvá, utasíthat el vagy törölhet hozzászólást;
- a látogatók csak jóváhagyott hozzászólást olvashatnak;
- egyszerű böngésző-tokenes beküldési korlát: legfeljebb 3 hozzászólás / 10 perc és 10 / 24 óra / token.

## Telepítés – javasolt sorrend

1. A `article-community.sql` teljes tartalmát futtasd le egyszer a Supabase SQL Editorban.
2. A csomagban lévő fájlokat másold a GitHub-projekt gyökerébe azonos mappaszerkezettel. A már meglévő fájlok közül csak az itt található azonos nevűeket cseréld le.
3. Ellenőrizd különösen, hogy ezek a fájlok a projekt gyökerében legyenek: `article-community.js`, `article-community.css`, `admin-hozzaszolasok.html`, `admin-hozzaszolasok.js`.
4. A GitHub Actions sikeres futása után nyiss meg egy cikket, frissíts `Ctrl + F5`-tel, és ellenőrizd, hogy a közösségi rész megjelent-e.
5. Nyisd meg a `cikk-szerkeszto.html` oldalt, és a „Hozzászólások moderálása” linkkel lépj be a külön moderációs oldalra.

## Fontos

- A `supabase-config.js` fájlt és a Supabase kulcsokat ez a csomag nem módosítja.
- A működés a korábbi `editor_profiles` és `current_radio69_role()` beállításra épül. A főszerkesztőnek `chief_editor` szerepkörrel kell rendelkeznie.
- A hozzászólások nyilvánosan csak jóváhagyás után jelennek meg.
- A reakciók és a hozzászólási korlátok egy véletlenszerű, böngészőben tárolt UUID-t használnak. A látogató a böngésző tárhelyének törlésével új tokent kaphat; ez nem teljes értékű botvédelem.
- A csomag nem ad hozzá e-mailes értesítést az új hozzászólásokról.
- Az adatvédelmi tájékoztató frissített változata is része a csomagnak; élesítés előtt ellenőrizd az adatkezelési jogalapot és a megőrzési gyakorlatot.

## Ellenőrzés

A JavaScript-fájlok szintaxisellenőrzése és a projekt SEO-alapellenőrzése lefutott. A Supabase SQL futtatását és az éles weboldali működést a saját Supabase/GitHub projektben kell ellenőrizni.
