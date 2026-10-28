# Rádió69 — látogatottsági statisztikák (GA4)

Ez a csomag előkészíti a Google Analytics 4 (GA4) integrációt, de **szándékosan nem kezd adatot gyűjteni**, amíg nincs beállítva a saját mérési azonosítód.

## Mit tartalmaz?

- A publikus oldalak betöltik az analitika-hozzájárulás kezelőjét.
- Google Analytics csak akkor töltődik be, ha a látogató kifejezetten elfogadja az analitikát.
- Elutasításkor nem töltődik be a Google Analytics tag.
- Az adatvédelmi oldal leírja az analitikát, és lehetővé teszi a választás módosítását.
- Nem kerül GA mérési azonosító vagy titok a nyilvános kódba.
- A cikk-szerkesztő és a 404 oldal nincs analitikával ellátva.

## Beállítás

1. Nyisd meg a Google Analytics szolgáltatást: https://analytics.google.com/ .
2. Hozz létre egy GA4-tulajdont a `Rádió69 × Zsiványok Podcast` weboldalhoz, ha még nincs ilyen.
3. Az Admin részben válaszd a **Data collection and modification → Data streams → Web** útvonalat, majd nyisd meg az adatfolyamot. A webhely címe legyen `https://radio69zsivanyok.hu/`.
4. Másold ki a Measurement ID értékét. Ennek formátuma `G-` betűkkel kezdődik, például `G-XXXXXXXXXX`.
5. A GitHubon nyisd meg a gyökérben lévő `analytics-config.json` fájlt. Cseréld le az üres értéket a saját azonosítódra, például:

   ```json
   {
     "measurementId": "G-XXXXXXXXXX"
   }
   ```

   **A fenti példaazonosítót ne használd**; a saját GA4 Measurement ID-det illeszd be.
6. Mentsd el a módosítást (**Commit changes**), és várd meg a GitHub Pages frissítését.
7. Nyisd meg a weboldalt. Az analitikai választósávon fogadd el az analitikát. Ezután a Google Analytics **Realtime** jelentésében ellenőrizheted, hogy megérkezik-e a látogatás.

## Hol nézd az adatokat?

- **Reports → Realtime:** aktuális látogatások.
- **Reports → Engagement → Pages and screens:** mely oldalakat olvassák a legtöbben.
- **Reports → Acquisition → Traffic acquisition:** honnan érkeznek a látogatók.

Hivatalos segítség a Measurement ID megtalálásához: https://support.google.com/analytics/answer/12270356?hl=hu

## Hozzájárulás módosítása

A látogató az **Adatvédelem → Analitikai beállítások módosítása** gombbal újra megnyithatja a választót. Az elutasítás/hozzájárulás visszavonása után az oldal megjegyzi a választást, eltávolítja az ismert GA első fél sütiket, és szükség esetén újratölti az oldalt.

Ez egy alap, az analitikát elfogadásig blokkoló hozzájárulási megoldás, nem teljes CMP, és nem helyettesíti az adatkezelői adatok kitöltését vagy a jogi felülvizsgálatot. A csomag nem kapcsol be AdSense- vagy hirdetési célú követést. Ha később Google-hirdetéseket is hozzáadsz, külön ellenőrizni kell az aktuális CMP- és hozzájárulási követelményeket.
