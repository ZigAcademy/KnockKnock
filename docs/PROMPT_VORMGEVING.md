# Fase 4b – Rijkere vormgeving met de asset-packs

Doel: het hele spel ziet er rijker en levendiger uit, met echte 3D-personages en auto's, een straat met meer leven, een unieke woonkamer per huurder en een gezelliger kantoor. De leerinhoud verandert niet.

---

## Wat jij eerst doet (±10 minuten)

1. **Leg de huidige versie vast**, zodat je altijd terug kunt. Open een terminal in de map `wijkwijs`:
   ```bash
   git init
   ```
   ```bash
   git add -A
   ```
   ```bash
   git commit -m "MVP fase 0-4"
   ```
   (`dist/`, `node_modules/` en alles met Safiro staan al in `.gitignore`.)

2. **Optioneel, maar aan te raden: download twee gratis packs voor meubels en planten.** Er zit in je Downloads geen meubelpack, en meubels maken het grootste verschil in de woonkamers. Beide zijn CC0 en hebben dezelfde low-poly stijl als de Car Kit:
   - *Furniture Kit* van Kenney (kenney.nl → Assets → Furniture Kit)
   - *Nature Kit* van Kenney (bomen, struiken, bloemen)

   Zet de zips gewoon in `~/Downloads`. Heb je ze niet, dan bouwt Claude de meubels zelf uit simpele vormen (zoals nu).

3. **Start een nieuwe Claude Code-sessie** in de map `wijkwijs`. Een nieuwe sessie heeft een frisse context; de huidige is erg lang geworden.

4. **Plak de prompt hieronder.** Keur de vragen om toestemming goed (uitpakken naar `tools/bron-assets/`, een npm-pakket installeren om modellen te optimaliseren).

5. **Laat Claude doorwerken.** Hij doet alle vier de stappen achter elkaar en laat je aan het eind alles in één keer zien: screenshots, het inrichtingsplan en wat hij zelf heeft besloten. Dat duurt even; je hoeft er niet bij te blijven. Reageer daarna met wat je wilt aanpassen (een screenshot plakken werkt het best).

6. **Als alles af is:**
   - speel het spel in de browser met `?fps` achter de URL (doel: rond de 60 fps op je laptop);
   - draai `npm run scorm` en test het pakket opnieuw in SCORM Cloud;
   - commit: `git add -A` en `git commit -m "Fase 4b vormgeving"`.

---

## De prompt (kopieer alles tussen de lijnen)

---

Lees CLAUDE.md, docs/GAME_DESIGN.md, docs/BOUWPLAN.md en docs/VOORTGANG.md. Fase 0 t/m 4 van Wijkwijs zijn af en werken (MVP: Lindelaan 14, 16 en 18). We doen nu **fase 4b: rijkere vormgeving**. De leerinhoud, de spelregels en de flow blijven precies zoals ze zijn. Het gaat alleen om hoe het eruitziet en hoe levendig het voelt.

**Bronnen in `~/Downloads`** (alleen voor intern gebruik; licentie is geen probleem, maar houd wel een korte bronnenlijst bij in `public/assets/modellen/BRONNEN.md`):
- `Ultimate Modular Men- Feb 2022-*.zip` en `Ultimate Modular Women - April 2022-*.zip` (Quaternius): 21 personages in glTF, één gedeeld skelet, 24 animaties (gebruik `Idle`, `Idle_Neutral`, `Walk`, `Run`, `Wave`, `Interact`; laat alle vecht- en schietanimaties weg).
- `Animated Men Characters - Feb 2019-*.zip` (Quaternius, FBX/OBJ), alleen als aanvulling.
- `kenney_car-kit.zip`: auto's in `.glb`.
- `Ultimate Textured Building Pack - Dec 2019-*.zip` en `Buildings pack - Aug 2017-*.zip` (FBX/OBJ): Amerikaanse stadsgebouwen. Niet voor de rijtjeshuizen; hooguit als achtergrond verderop.
- `kenney_furniture-kit.zip` en `kenney_nature-kit.zip`: meubels, planten, bomen en struiken.
- `Ultimate House Interior Pack - June 2020-*.zip` en `Furniture Pack - March 2019-*.zip` (Quaternius): interieur en meubels in dezelfde stijl als de personages. Eerste keus voor de woonkamers; vul aan met de Kenney Furniture Kit.
- `Ultimate Animated Animals - July 2021-*.zip` (Quaternius): dieren alleen als decor (een kat op de vensterbank, een hond die op straat wordt uitgelaten, vogels), nooit als onderdeel van het verhaal. Groot pack: neem alleen de paar dieren die je gebruikt.
- `kenney_city-kit-roads.zip`: lantaarns, hekjes, verkeersborden zonder tekst, zebrapad.
- `kenney_food-kit.zip`: kopjes, fruitschaal, etenswaren voor de keukens en de koffiehoek in het kantoor.
- Gebruik al deze packs waar ze het spel rijker maken; je hoeft niet alles te gebruiken.
- Personages komen alleen uit de Quaternius-packs; meng geen andere personagestijlen.
- **Gebruik nooit `Safiro.zip` of `assets.zip`** (daar zitten fontbestanden in; zie de fontregels in CLAUDE.md).

**Werkwijze en techniek**
- Pak de packs uit in `tools/bron-assets/` en zet die map in `.gitignore`. Alleen geselecteerde, geoptimaliseerde modellen komen in `public/assets/modellen/`.
- Optimaliseer met `@gltf-transform/cli` (devDependency): GLB, meshopt-compressie, ongebruikte animaties en materialen eruit. Laad met `GLTFLoader` + `MeshoptDecoder` uit `three/addons` (gebundeld, geen CDN). FBX/OBJ alleen omzetten als het echt nodig is (via three's loaders in een Node-script, of vraag mij om Blender).
- Animaties maar één keer laden en delen tussen alle personages (zelfde skelet). Gebruik `SkeletonUtils.clone` voor kopieën.
- Laadt een model niet, dan valt het spel terug op de huidige figuren uit primitieven. Het spel mag nooit vastlopen op een ontbrekend model.
- Toon tijdens het laden een eenvoudig laadscherm in de huisstijl (GROW14-icoon op navy, voortgangsbalk in blauw).
- **Budget:** build < 15 MB (streef naar < 8 MB), 60 fps op een laptop met geïntegreerde GPU, niet meer dan ±8 animerende personages tegelijk in beeld, InstancedMesh of gedeelde geometrie voor herhaalde objecten, schaduwkaart max 2048, pixelRatio max 2. Meld na elke stap draw calls en buildgrootte.
- Huisstijl blijft gelden: wereldkleuren gedempt, blauw en oranje alleen als accent (oranje blijft gereserveerd voor markeringen, hotspots en de call-to-action). Pas felle kleuren uit de packs aan via de materialen.
- Geen nieuwe leerinhoud en geen nieuwe teksten in beeld. Decor heeft geen leesbare tekst (behalve de borden die er al zijn). Geen echte merken of logo's. Geen nagemaakte Zig365-schermen.
- Je mag zelf decor en sfeer verzinnen. Leid de inrichting af uit wat er in `scenarios.json` over de huurder staat, en vermijd stereotypen op basis van naam of afkomst.

**Doe alle vier de stappen in één keer, zonder tussendoor op mij te wachten.** Werk ze wel in deze volgorde af en controleer na elke stap zelf dat build, tests en screenshots in orde zijn voordat je verdergaat. Loop je ergens echt op vast (bijvoorbeeld een model dat niet om te zetten is), kies dan de beste oplossing, noteer dat in `docs/VOORTGANG.md` en ga door. Laat mij aan het eind alles in één keer zien.

**Stap 1 – Pijplijn en personages**
- Vervang de figuren uit primitieven door Quaternius-personages: de speler, de huurders van woning 1–3 en de medewerkers Anna, Fatima en Tariq. Kies passende outfits (bijvoorbeeld Casual, Suit, Formal, Worker; geen Punk, King, Witch, Spacesuit, Soldier, Swat). Bekijk de portretten in `public/assets/portretten/` en stem huidskleur, haar en kleding af via de materialen, zodat je iemand herkent naast zijn portret.
- Animaties: `Idle`/`Walk`/`Run` voor de speler (vloeiend overvloeien op snelheid), `Interact` bij aanbellen, `Wave` als de huurder in de afloop zwaait, `Idle_Neutral` binnen. De speler blijft herkenbaar als "jij" (Zig-blauw als accent in de kleding).
- Kantoor: er is geen zitanimatie. Maak een zittende pose door de botten te draaien, of kies een sta-bureau. Kies wat er het best uitziet.
- Houd de bestaande `Character`-API zodat de rest van de code blijft werken.

**Stap 2 – Straat met meer leven**
- Kenney-auto's: 4–6 geparkeerde auto's langs de stoep (sedan, hatchback, suv, bestelbus), gedempte kleuren. Geen politie, brandweer of ambulance. Eventueel één auto die af en toe langzaam door de straat rijdt en stopt als de speler op de weg staat.
- Nederlandse details per woning, met variatie: kliko's, een brievenbus of brievenbusklep, een deurmat, een bloembak, een fiets in de voortuin, af en toe een dakkapel, een schuurtje of tuinhekje.
- Straatmeubilair: bankjes, prullenbakken, fietsnietjes, bloembakken, een speeltuintje of een stukje groen aan de overkant. Rijkere bomen en struiken (Nature Kit als die er is).
- Twee of drie voorbijgangers die rustig over de stoep lopen (geen tekst, geen interactie, ze lopen om de speler heen).
- Achtergrond: verderop, buiten het speelveld, een paar gebouwen uit de Building Pack als silhouet, en een zachte lucht met wat wolken.
- De oranje markeringen, het blauwe vinkje, de huisnummers en het kantoorbord moeten goed zichtbaar blijven. Botsing (AABB) bijwerken voor alle nieuwe objecten.

**Stap 3 – Unieke woonkamers (eerst een plan)**
- Repareer eerst het kamersjabloon: de bank staat nu voor de binnendeur in de linkermuur (bank z 0–1,8, deur z 1,15–2,05). Zorg dat deuren, ramen en looproutes vrij blijven, en controleer dat met een check in de code (een vrije zone voor elke deur).
- Schrijf eerst per woning (14, 16, 18) een kort inrichtingsplan van 4–6 regels in `docs/INRICHTING.md`: sfeer, kleuren, belangrijkste meubels en hoe dat past bij de huurder en het probleem uit `scenarios.json`. Bouw daarna volgens dat plan; ik bekijk het plan en de kamers aan het eind samen.
- Bouw daarna elke kamer uniek: andere indeling (niet alleen andere kleuren), eigen meubels, verlichting en persoonlijke spullen. Gebruik de Furniture Kit als die er is, anders eigen low-poly meubels.
- De hotspot-objecten blijven duidelijk zichtbaar, niet verstopt achter meubels, en de pins staan er goed boven. De huurder staat op een logische plek en gebruikt `Idle_Neutral`.
- Houd het sjabloon herbruikbaar voor woning 4–6 later.

**Stap 4 – Gezelliger kantoor**
- Warmere sfeer: houten accenten, planten, een kleed, hanglampen met warm licht, wandkunst (abstract; blauw en oranje mogen als klein accent), een koffiehoek, een overlegtafel, daglicht door de ramen.
- Twee of drie collega's (Quaternius-personages, niet de medewerkers uit de JSON) die rustig werken of bij de koffie staan.
- Het Zig365-scherm, de intro-kaarten en de overgang blijven precies zoals ze zijn.

**Na elke stap (zelf controleren, niet op mij wachten)**
- `npm run build` moet slagen zonder TypeScript-fouten, en `npm test` moet groen zijn. Pas de tests alleen aan als de flow echt verandert (dat zou niet moeten).
- Maak screenshots en bekijk ze zelf. Herstel wat er niet goed uitziet voordat je aan de volgende stap begint.

**Aan het eind, in één overzicht voor mij**
- Screenshots: straatoverzicht, bij de deur, elke woonkamer, het kantoor en de touch-weergave.
- Buildgrootte en draw calls (straat, binnen, kantoor).
- Het inrichtingsplan uit `docs/INRICHTING.md`.
- Wat je zelf hebt besloten of verzonnen, en wat er nog openstaat; ook bijgewerkt in `docs/VOORTGANG.md`.
- Draai tot slot `npm run scorm`, zodat er een nieuw pakket klaarstaat.

---

## Wat je daarna van Claude kunt verwachten

| Stap | Wat je ziet | Waar je op let |
|---|---|---|
| 1 | Echte personages die lopen, zwaaien en aanbellen | Herken je de huurders en medewerkers naast hun portret? Voelt de speler als "jij"? |
| 2 | Auto's, kliko's, bankjes, voorbijgangers, wolken | Blijven de oranje markeringen opvallen? Loopt het nog soepel? |
| 3 | Een inrichtingsplan en drie verschillende kamers | Past de kamer bij de huurder? Vind je de hotspots meteen? |
| 4 | Warmer kantoor met collega's | Blijft het Zig365-scherm rustig en leesbaar? |

**Tip:** wil je iets anders, beschrijf het dan concreet ("de bank van meneer Mensah moet donkerder", "minder auto's") of plak een screenshot met een korte opmerking. Wil je terug naar de vorige versie, dan kan dat met git.
