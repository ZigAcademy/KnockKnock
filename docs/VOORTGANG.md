# Voortgang Knock Knock! (werktitel was Wijkwijs)

## Fase 0 – Opzet ✔
- Vite 8 + TypeScript 7 + Three.js 0.187, `base: './'`. `content/` en `assets/` staan nu in `public/`.
- `src/theme.ts` + CSS-variabelen met de Zig Grow-kleuren. Poppins (400/500/600/700) uit `public/assets/fonts/`.
- Geen Safiro-bestanden; `*Safiro*` staat in `.gitignore`.
- Titelscherm: laadt `assets/titels/titel-wijkwijs.png` als die bestaat, anders de titel uit `meta.titel` in Poppins 600.
- `src/content/types.ts` typt `scenarios.json`; de code bevat geen leerinhoud.
- GROW3-logo linksboven, GROW14 als favicon.

## Fase 1 – Straat en lopen ✔ (graag testen)
- Lindelaan nr 14–26 (rijtjeshuizen, eigen deurkleur, huisnummerbordje, voortuin met heg en tuinpad), weg, stoepen, bomen, lantaarns, fietsenstalling tegenover nr 18, en het kantoor van Woonstichting Lindewaard aan het eind (naam uit `meta.corporatie`).
- Statische geometrie wordt samengevoegd: ±36 draw calls (57 met de losse deuren) voor de hele straat. Schaduwkaart 2048, pixelRatio max 2.
- Personage uit primitieven met loopanimatie in code; third-person camera volgt soepel en schuift naar voren als er een muur tussen zit.
- Besturing: WASD (lopen/zijwaarts), pijltjes (op/neer lopen, links/rechts camera draaien), Shift rennen, slepen = camera, wiel = zoom, klikken = erheen lopen (via het tuinpad). Touch: joystick linksonder, slepen = camera, tikken = erheen lopen.
- Botsing met axis-aligned boxes (huizen, heggen, bomen, kantoor, randen).
- Oranje markering boven elke woning uit `scenarios.json`. Bij de deur: knop "Aanbellen" (E, Enter of tik). Aanbellen toont nu alleen een melding met adres, huurder, portret en de deurtekst (of `intro` bij nr 26).
- `prefers-reduced-motion` zet het zweven van de markeringen en de camerasmoothing uit (de echte instelling volgt in fase 4).

## Fase 2 – Huurderfase woning 1 ✔ (graag testen)
- **Deur:** bij Lindelaan 14 gaat de deur open en staat de heer Farouk in de deuropening (eigen kleuren, `src/world/looks.ts`). Kaart met portret en `huurderfase.deur`.
- **Binnen:** één kamer met keuken als herbruikbaar sjabloon (`src/world/interior.ts`), vaste camera die zich aan de schermverhouding aanpast. Plaatsing per woning in `src/world/interiors.ts` (alleen vormgeving; de teksten komen via het hotspot-id uit de JSON).
- **Hotspots:** keukenkraan (met druppel en emmer), telefoon met briefje, laptop met inlogscherm. Oranje gloed bij hover/focus, pins boven de objecten (Tab/Enter), popup met de tekst uit de JSON. Pas als de kernhotspot gevonden is, verschijnt "Praat met de heer Farouk".
- **Gesprek:** vraag + opties (geschud), toetsen 1–3 of klikken, feedback letterlijk uit de JSON, hartjes voor huurderstevredenheid. Fout = uitleg, nooit game over.
- **Leerpunt:** kaart "Dit neem je mee" (gebruikt `assets/titels/kop-dit-neem-je-mee.png` als die bestaat). Daarna terug naar de straat. De oranje markering blijft staan tot de corporatiefase af is.
- Andere woningen tonen bij aanbellen nog een melding ("volgt in een latere fase").
- Volledig met toetsenbord te spelen; de rooktest doet dat ook.

## Fase 3 – Perspectiefwissel en corporatiefase woning 1 ✔ (graag testen)
- Na het leerpunt: blauw scherm "Ondertussen bij Woonstichting Lindewaard ..." met het portret van de medewerker ("Je bent nu ..."). Gebruikt `assets/titels/overgang-ondertussen.png` als die bestaat.
- De camera vliegt in een boog van de woning naar het kantoor. Bij "minder beweging" is het een harde overgang.
- Kantoor: bureau met beeldscherm, de medewerker zit aan het werk (eigen kleuren, `MEDEWERKER_LOOK` in `src/world/looks.ts`).
- **Zig365-scherm** (`src/ui/zig365.ts`): gestileerd en fictief. Een navy balk met "Zig365" als gewone tekst, de modulenamen Customer/Operations/Maintenance als decor, links de klant en het onderwerp, rechts de opdracht.
  - `systeem` = tegels, `keuze` = lijst; opties geschud; toetsen 1–n.
  - `volgorde` = slepen (muis/touch) of de knoppen ↑/↓ (toetsenbord); "Controleer".
  - Feedback: "Goed!"/"Niet helemaal." + `uitleg` letterlijk + "Bron: e-learning xx". Het juiste antwoord wordt altijd aangewezen; bij volgorde zie je de goede volgorde.
  - Proceskennis = goed bij de eerste poging.
- Meerdere medewerkers achter elkaar (woning 1: Anna, dan Fatima), elk met eigen intro.
- Afloop: terug naar de straat, de huurder doet open met de tekst uit `afloop`, daarna het blauwe vinkje.

## Fase 4 – MVP compleet ✔ (graag testen, ook in SCORM Cloud en Studytube)
- Interieurs voor nr 16 (regen, water langs de gevel, notitieblok bij de telefoon) en nr 18 (dreunende muur met geluidsgolven, raam met zicht op de donkere stalling en de scheve lamp). Hetzelfde kamersjabloon, met andere kleuren en meubels.
- **HUD** rechtsboven: huurderstevredenheid en proceskennis (over de MVP-woningen), en knoppen voor geluid, voice-over, overzicht en instellingen.
- **Eindscherm** na de laatste MVP-woning: per woning een vinkje, het leerpunt, de hartjes en de proceskennis, plus de totalen. Via de overzichtsknop kun je het altijd bekijken.
- **Instellingen**: geluid, voice-over, minder beweging (volgt standaard de systeeminstelling) en taal (EN uitgegrijsd). Bewaard in de browser.
- **SCORM 2004** (`src/scorm/scorm.ts`): zoekt `API_1484_11` in de parent-vensters en faalt stil zonder LMS. Rapporteert `completion_status`, `success_status` (passed bij ≥ 0,7, pas na afronden), `score.scaled/raw/min/max`, `progress_measure` en `suspend_data` (compact, ±150 tekens), en `exit = suspend` bij afsluiten. Bij een nieuwe sessie gaat het verder waar je was.
- `npm run scorm` → `dist/Wijkwijs_SCORM2004.zip`, met `imsmanifest.xml` in de root en elk buildbestand in het manifest. Het script stopt als er een Safiro-bestand in de build staat.
- Getest met een nagebootste LMS-API in Playwright (`tests/mvp.spec.ts`). SCORM Cloud en Studytube moet jij nog doen.

## Fase 4b – Rijkere vormgeving ✔ (graag bekijken)
Leerinhoud, spelregels en flow zijn niet veranderd; de bestaande tests zijn ongewijzigd groen.

**Pijplijn**
- Packs uitgepakt in `tools/bron-assets/` (staat in `.gitignore`). `node tools/modellen.mjs` maakt geoptimaliseerde GLB's in `public/assets/modellen/` (dedup, prune, meshopt-compressie, alleen de 6 animaties, geen vingeranimaties). Bronnenlijst: `public/assets/modellen/BRONNEN.md`.
- Laden met `GLTFLoader` + `MeshoptDecoder` (gebundeld). Laadscherm in de huisstijl (GROW14 op navy, blauwe voortgangsbalk).
- **Terugval:** ontbreekt een model, dan vallen personages terug op de figuren uit primitieven en decor op blokken; test `tests/terugval.spec.ts` blokkeert alle modellen en speelt woning 1.
- Modellen 2,5 MB, build 3,9 MB (doel < 8 MB).

**Stap 1 – Personages:** Quaternius-modellen voor speler, Farouk, Mensah, Hansen, Anna, Fatima en Tariq, afgestemd op de portretten (huid, haar, kleding; snor, sik, baard, sjaal en hoofddoek als kleine extra vormen aan het hoofdbot). Elk personage is samengevoegd tot één mesh (één draw call). Speler: Zig-blauw shirt. Animaties gedeeld: Idle/Walk/Run vloeien over op snelheid, Interact bij aanbellen, Wave in de afloop, Idle_Neutral binnen. Kantoor: zittende houding door botten te draaien (geen zitanimatie), met typende handen. De `Character`-API is gelijk gebleven.
**Stap 2 – Straat:** 5 geparkeerde auto's (gedempt), één auto die rustig rondrijdt en stopt voor de speler; kliko's, deurmatten, brievenbusklep, bloembakken, fietsen in de voortuin, dakkapellen, tuinhekjes, schuurtje; bankjes, prullenbakken, fietsnietjes, plantenbakken, zebrapad, speeltuintje; Nature Kit-bomen en -struiken; twee voorbijgangers (één met hond aan de lijn) die uitwijken voor de speler; gebouwen als silhouet in de nevel; lucht met verloop en wolken. Botsing bijgewerkt.
**Stap 3 – Woonkamers:** eerst het plan (`docs/INRICHTING.md`), daarna gebouwd. Het sjabloon is nu data-gestuurd (`src/world/interiors.ts`): deur, ramen, keukenblok, meubels, licht (dag/regen/avond). De bank staat niet meer voor de binnendeur. `src/world/vrijeZones.ts` controleert vrije zones (vóór elke deur, onder ramen, looproute deur → huurder, plek huurder, muur-hotspot) en of een hotspot achter een meubel verdwijnt; fouten komen in de console en in `tests/inrichting.spec.ts`.
**Stap 4 – Kantoor:** houten vloer en lambrisering, planten, kleed, hanglampen met warm licht, abstracte wandkunst (blauw en oranje als klein accent), koffiehoek, overlegtafel, daglicht door de ramen. Drie collega's (decor): één werkt, één staat bij de koffie, één zit aan de overlegtafel. De medewerker zit nu schuin naar de camera. Zig365-scherm, introkaarten en overgang zijn ongewijzigd.

**Draw calls (SwiftShader-meting):** straat 55 (was 57), woonkamers 28–41, kantoor 16. 60 fps moet nog op een echte laptop gecontroleerd worden (`?fps`).

**Zelf besloten of verzonnen (graag checken)**
- Uiterlijk van de personages (outfit, kleuren, snor/sik/baard, sjaal, hoofddoek) afgeleid van de portretten. De sjaal van mevrouw Hansen is gedempt terracotta, niet Zig-oranje (oranje blijft voor markeringen).
- Tariq draagt een colbert over een lichtblauw overhemd (de hoodie had een korte broek).
- Speler is een man in een Zig-blauw T-shirt. Een neutralere keuze (of kiezen bij de start) kan later.
- Loopsnelheid iets lager (3,4 m/s, rennen 6,4) zodat de loopanimatie niet glijdt.
- Decor per woning (fiets, kliko's, bloembak, hekje) is willekeurige variatie; nr 26 staat leeg (hoog gras, geen mat).
- Inrichting en spullen per woonkamer (zie `docs/INRICHTING.md`); de fietshelm bij mevrouw Hansen komt uit haar verhaal (fietsenstalling).
- Geen kat en geen vogels: die zitten niet in de packs. De hond is een Shiba Inu met gedempte vacht.
- Achtergrondgebouwen (Amerikaanse stijl) alleen als silhouet in de nevel.
- Kantoorinrichting, collega's en wandkunst zijn verzonnen decor.

**Open**
- 60 fps op een laptop met geïntegreerde GPU nog meten.
- Hanglamp in nr 14 is een kroonluchter met drie kapjes; een eenvoudiger model kan.

## Fase 5 (deel) – Geluid ✔ (graag luisteren)
- `src/audio/geluid.ts`: één geluidsmotor (Web Audio). Start pas na de eerste klik of toets (autoplay-regels). De geluidsknop en de instelling zetten het echt aan en uit. Zonder geluidskaart of bestanden blijft alles werken.
- **Opnames (Kenney, CC0):** voetstappen op steen, gras en hout (in de maat van de loopanimatie, ondergrond volgt waar je loopt), deur open/dicht, interface-geluidjes (klik, hotspot, goed, minder goed, leerpunt, Zig365 open/dicht), toetsenbord op kantoor. Omzetten: `node tools/geluiden.mjs` (Ogg + AAC, samen ±400 kB). Bronnenlijst: `public/assets/geluid/BRONNEN.md`.
- **In code gemaakt:** ding-dong bij aanbellen, motor van de rijdende auto (luider dichtbij, links/rechts), gebrabbel bij gesproken tekst (eigen toonhoogte per personage, stopt als de kaart sluit), dreun door de muur bij nr 18 in de maat van het trillende schilderij, druppende kraan bij nr 14 in de maat van de druppel, regen bij nr 16, gedempte muziek bij de buren, vogels op straat, zacht geroezemoes en typen op kantoor, zoef bij de perspectiefwissel.
- Gebrabbel valt onder "geluid", niet onder "voice-over". De noot in de instellingen zegt nu alleen dat voice-over nog komt.
- **Nog open (rest van fase 5):** voice-over (Piper/edge-tts, Emma) met ducking, achtergrondmuziek, Engelse teksten, publiceren. Geluid is nog niet getest in Safari/iPad (daar wordt `.m4a` gebruikt) en in Studytube.
- Zelf gekozen: welke Kenney-geluiden waar; de hond blaft niet (geen geschikt geluid); geluidsniveaus zijn bewust zacht.

**Bijgewerkt na feedback**
- Gebrabbel gebruikt nu het aangeleverde praatgeluid (`praten.mp3`): korte stukjes uit de luide delen, per personage een eigen toonhoogte, tempo en klankkleur. Licentie van dat bestand graag checken.
- Vastlopen tegen een voorbijganger opgelost: je kunt altijd uit een botsvak lopen waar je al in staat, en voorbijgangers blijven staan als je vlak voor ze staat.
- Nieuwe knop rechtsboven **Personage terugzetten** (pijl rond): zet je op de dichtstbijzijnde vrije plek op de stoep en de camera terug achter je. De voortgang blijft staan.

## Wie ben jij? (personage kiezen) ✔
- Na Start kies je je uiterlijk: **figuur** (man/vrouw), **huidskleur** (6 tinten), **kapsel** (5 per figuur), **haarkleur** (6, of een hoofddoek) en **kleding** (3; Zig-blauw komt altijd terug). Met een draaiend 3D-voorbeeld, "Kies voor mij" en volledig met het toetsenbord te bedienen.
- De keuze wordt bewaard in de browser én in SCORM (`suspend_data`, veld `p`, 6 tekens). Wie terugkomt, slaat de stap over. Aanpassen kan altijd via **Instellingen → Personage aanpassen**.
- Bewust geen keuze voor "afkomst" (stereotypen); huidskleur, kapsel, haar en hoofddoek geven dezelfde vrijheid.
- Kapsels zijn losse hoofden uit de Quaternius-packs (`personages/hoofd-*.glb`, samen ±680 kB), die op elk lichaam passen. Daardoor kregen mevrouw Hansen (kort wit haar), Anna (staart) en de heer Mensah (kort) een kapsel dat beter bij hun portret past.
- Tests bijgewerkt voor de nieuwe stap (de flow verandert echt): de smoke-test kiest vrouw + pak, de MVP-test controleert dat het uiterlijk bij hervatten uit SCORM komt.
- Interfaceteksten die ik heb geschreven: "Wie ben jij?", "Kies hoe je eruitziet in de straat. Aanpassen kan later bij Instellingen.", Figuur, Huidskleur, Kapsel, Haarkleur, Kleding, de namen van de opties, "Kies voor mij", "Personage aanpassen", "Personage terugzetten".

## Alle woningen + finale ✔
- `mvp: true` voor w4, w5, w6 en de finale. Meters en SCORM rekenen nu over alle 7 woningen: huurderstevredenheid max **10**, proceskennis max **38**. `completion_status = completed` als alle 7 af zijn; `passed` bij ≥ 70%.
- **Lindelaan 20 (Mulder):** brief op tafel + raam met zicht op de achtertuin en de betonplaat. Medewerker Wei.
- **Lindelaan 22 (Van Dijk):** stapel post op een kastje bij de deur + laptop. Medewerker Amara.
- **Lindelaan 24 (Volkov):** kamer met trap en overloop; de hotspot (lege hoek naast de badkamer) zit boven. Medewerker Fatima.
- **Finale Lindelaan 26:** pas beschikbaar (markering + aanbellen) als woning 1 t/m 6 af zijn. Intro uit de JSON, dan Bram (voorinspectie, Maintenance) en Sanne (Matching) achter elkaar, dan de afloop: je geeft mevrouw Yilmaz de sleutels, de buren staan in hun voortuin en zwaaien, met de afloop-tekst uit de JSON. Daarna het eindscherm "De straat is compleet!".
- De melding "Deze woning volgt in een latere fase" is weg.
- Uiterlijk van Mulder, Van Dijk, Volkov, Yilmaz, Wei, Amara, Bram en Sanne afgestemd op de portretten. **Correctie:** Wei Chen was een vrouwelijk model; volgens het portret is het een man.
- Test `tests/mvp.spec.ts` speelt nu alle zes woningen en de finale helemaal door (met screenshots 40–48), controleert dat de finale dicht is vóór woning 6 en dat SCORM pas na de finale `completed` meldt.
- Zelf bedacht (graag checken): de finale-afloop speelt bij de voordeur van nr 26 (Yilmaz staat in de deuropening), de buren zwaaien in hun voortuin, de sleutels zijn een klein sleutelbosje dat van de speler naar Yilmaz gaat. De kaart van de finale-intro heeft als titel het adres. Bij de finale wordt geen leerpunt getoond (de JSON heeft er geen).

## Kantoor met vaste werkplekken + muziek bij de buren ✔
- Alle zeven medewerkers uit de JSON (Anna, Tariq, Fatima, Wei, Amara, Sanne, Bram) zitten altijd aan hun eigen bureau. Per casus gaat de camera naar het bureau van de medewerker die jij op dat moment bent; bij twee medewerkers in één casus wisselt de camera mee. Eén decor-collega staat bij de koffie.
- Geluidsoverlast bij nr 18: het aangeleverde techno-nummer (`tools/bron-assets/muziek/buren.mp3`) is teruggebracht tot een naadloze lus van 45 s (mono, ±180 kB, `buren-muziek.m4a`) en klinkt gedempt door de muur (alleen de lage tonen, rechts). De losse dreun is uit, zodat er niets uit de maat loopt; het schilderij trilt nog wel. Zonder het bestand valt het terug op de gemaakte akkoorden. Licentie van het nummer graag checken.

## Levendiger gevels en doorkijkramen ✔
- **Doorkijkramen** (`src/world/ramen.ts`): alle ramen van de huizen en het kantoor tonen een kamer met diepte (interior mapping in een shader). Per raam andere wandkleur, meubels (bank of bed), schilderij, plant, boekenkast, kleed, gordijnen of lamellen, en soms brandt er een lamp. Nr 26 is leeg. Het kantoor toont bureaus met schermen. Alle ramen samen zijn één draw call (straat blijft 55).
- **Kantoor van buiten:** bakstenen sokkel, crème begane grond, bakstenen verdieping met houten lamellen, een smalle Zig-blauwe band, een gedempt blauwe trappenhuistoren, gekleurde luifels, plantenbakken bij de entree en groen op het dak. Het naambord is ongewijzigd.
- **Achtergrondgebouwen:** gevarieerde gevelkleuren (terracotta, zand, saliegroen, lichtblauw, roze, lila) in plaats van grijze silhouetten.
- In de Playwright-screenshots (software-rendering) zie je ruis in de ramen; op een echte grafische kaart niet.

## Knock Knock!, Huis & Haard / Hearth & Home en de Engelse versie ✔
- **Naam:** het spel heet nu *Knock Knock!* (`meta.titel`, titelscherm met het logo, paginatitel, SCORM-titel, `dist/KnockKnock_SCORM2004.zip`). De SCORM-identifiers in het manifest zijn bewust gelijk gebleven, zodat een LMS het als hetzelfde pakket herkent.
- **Corporatie:** NL *Huis & Haard*, EN *Hearth & Home* (`meta.corporatie` is nu `{ nl, en }`). Logo's in `public/assets/logo/` (`huis-en-haard.png`, `hearth-and-home.png`, `huis-icoon.png` = het huisje met vlam, uit het logo geknipt).
- **Gevel:** lichtbak met het woordmerk boven de entree (navy rand), een dubbelzijdig uithangbord met het icoon haaks op de gevel, en het icoon groot op de blauwe trappenhuistoren. In het kantoor hangt het logo op de achterwand. Alle borden wisselen mee met de taal.
- **Kantoor door de ramen:** collega's aan hun bureau (op een eigen laag met diepte), houten lambrisering, hanglampen, planten, kunst; de hal toont een blauwe balie met een medewerker; het trappenhuis een trap.
- **Engels:** alle leerinhoud vertaald in `scenarios.json` (`en` naast `nl`, plus `opties_en`, `items_en`, `object_en`, `naam_en`, `rol_en`); script: `tools/vertaling_en.py`. Interfaceteksten in `src/i18n.ts`. Taal kiezen op het titelscherm of bij Instellingen (wisselt direct, ook midden in het spel). De keuze wordt in de browser bewaard.
- Safiro-titel-PNG's (overgang, "Dit neem je mee", eindscherm) worden alleen in het Nederlands gebruikt; in het Engels staat de tekst in Poppins.
- **Test:** `tests/engels.spec.ts` speelt woning 1 helemaal in het Engels. Alle 14 tests groen.
- **Graag checken:** de Engelse vaktermen (zie `open_vragen`), de titel *Key takeaway* voor "Dit neem je mee", en de Engelse namen van rollen (bijv. *customer contact officer*, *property inspector*). De straatnaam (Lindelaan) en de adressen zijn niet vertaald.

## Verbeteringen: voortgang, herkansing, achter de schermen, leven in de straat ✔
1. **Voortgang in de browser:** zonder LMS (de link op GitHub Pages) wordt de voortgang in de browser bewaard (`knockknock-voortgang`, zelfde vorm als SCORM `suspend_data`). Met een LMS gaat alles via SCORM, zoals voorheen. Bij Instellingen staat dan **Opnieuw beginnen** (vraagt eerst om bevestiging).
3. **Achter de schermen:** na de afloop van elke woning een scherm met de route van de vraag: huurder → de Zig365-onderdelen → de medewerker(s). Welke onderdelen er staan, wordt afgeleid uit de teksten van die woning in `scenarios.json` (goede antwoorden, vragen, uitleg en de bronnamen); de beschrijvingen komen letterlijk uit `producten` (nu ook in het Engels). Niets verzonnen. Met **voice-over** (Emma, edge-tts, NL/EN, 44 korte fragmenten in `public/assets/stem/ads/`, 1,8 MB) wordt de route voorgelezen en licht de stap op die aan de beurt is; de achtergrond gaat dan zachter. Volgt de knoppen voor geluid en voice-over; in het scherm zelf staat ook een knop **Voice-over uit/aan** (geldt voor het hele spel).
4. **Herkansing:** wie Zig365-vragen niet in één keer goed had, kan ze na de laatste vraag nog één keer oefenen ("Oefenen · telt niet mee"). De proceskennis verandert niet.
7. **Leven bij geholpen woningen:** de huurder staat daarna in de voortuin en zwaait als je langsloopt. Nr 16: de dakgoot lekt zichtbaar tot de woning af is. Tegenover nr 18 hangt de lamp bij de fietsenstalling eerst scheef en uit, daarna recht en aan. Na de finale is nr 26 ingericht (ramen) en staat mevrouw Yilmaz in de tuin.
8. **Busje van Huis & Haard / Hearth & Home:** wit busje met het logo als belettering op beide zijkanten (zonder achtergrond, plat op de zijkant boven de wielkasten; wisselt mee met de taal). Rijdt rondjes en stopt per rondje even bij één geholpen woning.
12. **Safiro-titels:** `tools/render_titels.py` heeft nu alle koppen in NL en EN (overgang, "Dit neem je mee", "De straat is compleet!", "Achter de schermen"). Het spel pakt `naam.png` (NL) of `naam-en.png` (EN) als die bestaat. **Graag draaien op je Mac** (zie de uitleg bovenin het script).

**Getest:** 27 Playwright-tests groen, waarvan 13 nieuw: de afleiding van de onderdelen per woning (7), voortgang herstellen en opnieuw beginnen, een gespeelde woning na herladen, herkansing + achter de schermen + voice-over (score blijft 5/7), achter de schermen op een telefoon met minder beweging en zonder voice-over (en de finale gaat open na woning 6), alle tuinen + busje dat rijdt en stopt na de finale, dakgoot en stallinglamp vóór en na. Elke test controleert dat er geen JavaScript-fouten zijn. Tijdens het testen gevonden en opgelost: het verborgen scherm "Achter de schermen" lag als donkere laag over het spel; de route paste niet in beeld bij zeven stappen; het busje stopte bij elke deur.

## Graphics ✔
- **Versie** (Instellingen → Versie: Standaard / Lage resolutie, `src/game/versie.ts`): standaard is het nieuwe beeld (realistische personages, echte planten, nabewerking, HDRI, oppervlaktedetail, wind, wolkenschaduw, vogels, rook). Lage resolutie is het eerdere beeld (zoals live tot en met commit aead0c0) en laadt de Rocketbox-personages en planten-kit niet (±9 MB minder). Zonder LMS laadt het spel bij wisselen direct opnieuw (voortgang blijft); in een LMS geldt de keuze vanaf de volgende start, omdat opnieuw laden de SCORM-sessie kan breken. Testen kan ook met `?versie=laag`.
- **Beeldkwaliteit** (Instellingen → Beeldkwaliteit: Automatisch / Hoog / Laag): bij hoog een nabewerkingsketen (`src/render/beeld.ts`): SSAO (zachte schaduw in hoeken en onder randen), subtiele bloom, Neutral-tone mapping (houdt Zig-blauw en -oranje fel), iets meer contrast, zachte vignet, SMAA. Laag = precies het oude beeld. Automatisch begint hoog en zakt naar laag als de framerate 3 s onder 40 fps blijft.
- **Lucht en omgevingslicht** uit een CC0-HDRI (echte wolkenlucht, zachte reflecties in ruiten en glas).
- **Oppervlakken**: klinkers op stoep en tuinpaden, asfalt met slijtage, baksteen met voegen, dakpannen (CC0, als grijswaardedetail over de eigen kleuren; één atlas van 570 kB, geen extra draw calls).
- **Ringweg, buurt en zelf rijden** (alleen standaardversie):
  - de heg aan de westkant is open: de straat sluit aan op een ringweg van 8 m breed om het blok (ronde hoeken, middenstreep, stoepranden, lantaarns; `src/world/ringweg.ts`);
  - langs de buitenkant van de ring staan rijtjeshuizen en flats, afgewerkt als de straat: baksteendetail, dakpannen, witte kozijnen, voordeuren, voortuin met heg (`src/world/achtergrond.ts`). Ze vervangen de losse achtergrondgebouwen;
  - de hatchback rijdt een rondje: de straat in, keren bij het kantoor, de ring op en het hele blok rond (rechts rijden, op de ring harder);
  - gimmick: bij een geparkeerde auto verschijnt "Instappen (E)". W gas, S remmen/achteruit, A/D sturen (touch: joystick), achtervolgcamera; E stapt weer uit naast het bestuurdersportier (`src/player/rijden.ts`). Andere auto's en voorbijgangers stoppen voor je. De schaduw volgt je buiten de straat. Test: `tests/rijden.spec.ts`.
- **Voller en levendiger** (standaardversie, `src/world/aankleding.ts`):
  - park binnen de ring: bomen en struikgroepen (MegaKit), wandelpaden, picknicktafels (Poly Haven) en bankjes;
  - bomen in de berm langs de ringweg, tussen de lantaarns; bomen buiten de ring als horizon;
  - langs de huizen aan de ring: geparkeerde auto's (ook om in te stappen), kliko's, potten met planten, af en toe een fiets, tuinstoelen of kratten; bij de flats plantenbakken;
  - in de straat: plantenpotten naast de deuren, gieters, emmers en een tuinset;
  - achtergevels van de straat met achterdeur en ramen (zichtbaar vanuit het park);
  - prestatie: ±1,6 mln driehoeken; bomen per vak van 60 m (frustum culling); heggen en gazons langs de ring blijven een getextureerde doos.
  - "Automatisch" (beeldkwaliteit) meet nu in echte tijd, zodat het op een trage computer binnen een paar seconden naar laag gaat. Tests draaien standaard in "laag" (geen GPU in de testbrowser).
- **Realisme-ronde straat** (alleen standaardversie, lage resolutie blijft het oude beeld):
  - daken: elk huis dakpannen (de helft had een kleur zonder textuur), ook dakkapellen; dak- en hegdetail vervaagt minder op afstand;
  - baksteen: zeven kleuren dicht bij elkaar (één straat, net andere partijen);
  - detail-atlas 3×3 met gras, houten planken en heg; hekken en schuurtje krijgen houtnerf (`tools/detail.mjs`);
  - heggen: realistisch heg-model ("Hedge", 1-3D.com, CC BY-SA 4.0) in stukken van ±1,5 m op elke heg; dichtbij gedetailleerd (netjes vereenvoudigd, zonder gaten en zonder doos eronder), ver weg grof met de doos als kern (`src/world/groen.ts`); zonder model losse blaadjes (`src/world/heg.ts`);
  - gras: grasplukken ("Realtime Grass", CC BY 4.0) dicht op elkaar in de voortuinen, op een gazon in dezelfde kleur; niet in paden, plantenbakken, kliko's of fietsen (mag onder de heg doorlopen); graspollen (MegaKit) in het park;
  - fietsen: retrofiets met mandje ("Retro bike", annzep, CC BY 4.0) in de tuinen en de stalling, elk een eigen kleur, en een gele mountainbike ("Bike", T-FLEX CAD ST, CC BY 4.0) in de stalling en één voortuin; fietspaaltjes ("Bike Rack #4", aecoviz) bij de stalling; zonder model een stadsfiets uit code (`src/world/fiets.ts`);
  - kliko's glad (plastic) in plaats van facetten (`src/world/glad.ts`);
  - gebouwen op de achtergrond: realistische flats en blokken (baksteen of lichte gevel, ramen met kozijn, balkons) in plaats van de cartoonmodellen.
- **Auto's**: realistischere auto's uit de Generic passenger car pack (Comrade1280, CC BY 4.0; naamsvermelding in `public/assets/modellen/BRONNEN.md`). Geparkeerd en rijdend; het busje van de corporatie is nu een witte pick-up met het Huis & Haard-logo op de portieren (wisselt mee met de taal). Lage resolutie houdt de Kenney-auto's.
- **Planten**: bomen, struiken, bloemen en gras uit de Stylized Nature MegaKit (Quaternius, CC0) met echte bladtexturen, als InstancedMesh per soort (14 draw calls voor alle planten) en wiegend in de wind (`src/world/beplanting.ts`). Zonder `planten.glb` valt de straat terug op de Kenney-modellen.
- **Personages zachter**: normalen van de samengevoegde personages worden gemiddeld tot 60° (`zachteNormalen` in `character.ts`), zodat de vlakken niet meer facetachtig zijn; scherpe randen blijven scherp. Een gratis CC0-pack met moderne kleding bestaat niet (Synty Modern Civilians is betaald).
- **Realistische personages** (Microsoft Rocketbox, MIT): alle mensen in het spel. Huurders en medewerkers zijn zo goed mogelijk op hun portret afgestemd (`mens` in `src/world/looks.ts`; ruilen kan daar). De speler kiest figuur en een van 4–5 personages (`SPELER_MENSEN` in `src/game/speler.ts`); de code in de browser/SCORM krijgt `r<n>` erbij. Medewerkers zitten met een echte zitanimatie. Per personage ±0,3 MB (512 px WebP), animaties ±1,3 MB samen; 3 draw calls per personage. Zonder geladen modellen valt alles terug op de Quaternius-figuren (en de oude personagemaker).
  - Huurders opnieuw gekozen op portret (gezicht, haar, kleding). Waar de kleur niet klopt, verft `tools/rocketbox.mjs` de kleding bij het omzetten (regels in `VERF`, met masker voor ogen en tanden): Farouk witte jas → marine colbert, Mensah paars → lichtblauw overhemd en grijs haar, Hansen rood → marine jasje, Mulder rode trui → marine, Volkov bordeaux → lichtblauw, Fatima witte hoofddoek → marine.
  - Nog verschillen: Farouk is kaal met snor (portret: vol grijs haar) en heeft nog een stethoscoop en naamkaartje; Van Dijk zonder bril en baard (trui met ruit); Hansen grijsblond in plaats van wit haar; Zig-blauw zit niet meer in de kleding van de speler.
  - Lopen: de loop- en renanimaties van Rocketbox schuiven de heup vooruit (root motion) en sprongen dan terug; die beweging wordt bij het omzetten verwijderd. Boven ±1,7 m/s jogt een Rocketbox-personage (de speler loopt 3,4 m/s).
  - Bundel nu ±23 MB (budget in CLAUDE.md: 15 MB).
- **Leven**: bomen, struiken en bloemen wiegen in de wind; langzame wolkenschaduwen over de straat; vogels; rook uit drie schoorstenen. Stil bij "minder beweging".
- **Personages**: kijken met hun hoofd naar je als je dichtbij bent (huurders in de tuin, voorbijgangers, de huurder in de deur).
- Bronnen: `public/assets/omgeving/BRONNEN.md`. Build 13 MB (onder 15 MB).
- **Niet gedaan:** knipperende ogen (de ogen zitten in de vertexkleuren van het samengevoegde model; dat vraagt een aparte aanpak) en Blender-ingebakken licht in de kamers.
- **60 fps:** niet gemeten op een echte laptop (de tests draaien zonder GPU). Graag testen met `?fps`; zakt het, dan schakelt Automatisch zelf naar laag.

## Testen
- `npm run dev` → spelen in de browser. Voeg `?fps` toe aan de URL voor een fps-teller.
- `npm run build` en `npm test` (Playwright, screenshots in `tests/screenshots/`).
- Modellen opnieuw maken: `node tools/modellen.mjs` (packs in `tools/bron-assets/`). Previews: `npx vite --port 5199` en dan `node tools/preview/straat.mjs`, `kamers.mjs`, `kantoor.mjs` of `shot.mjs`.
- De test draait met software-rendering (SwiftShader), dus 60 fps kan alleen op een echte laptop gecontroleerd worden.

## Open / vragen voor Tim
- Interfaceteksten die ik zelf heb geschreven (geen leerinhoud): "Kijk rond: x van y bekeken", "Praat met ...", "Je bent nu ...", "Goed!" / "Niet helemaal.", "Juist antwoord", "Nog niet geholpen", "Verder rondlopen", en de noot in de instellingen over geluid en voice-over. Bij woning 4–6 en nr 26 staat nog "Deze woning volgt in een latere fase." Pas gerust aan.
- **Geluid en voice-over** zijn nog niet gebouwd (fase 5); de knoppen bewaren alleen de keuze.
- **Zonder LMS** (GitHub Pages) wordt de voortgang niet bewaard. Moet dat lokaal in de browser, of is opnieuw beginnen prima?
- **Woning 2 en 3 hebben elk 6 stappen bij één medewerker.** De proceskennis van de MVP is 19 punten (7 + 6 + 6).
- De volgordevraag geeft alleen een punt als alle stappen goed staan.
- **Hartjes:** het design noemt 0–3 hartjes per woning, maar in de JSON is de maximale score per woning 1 of 2 (woning 1: 2). Ik toon nu zoveel hartjes als de JSON toelaat. Wil je altijd 3, dan moeten de scores in de JSON anders of omgerekend worden.
- **Schudden in de huurderfase:** CLAUDE.md noemt schudden alleen voor de corporatiefase; ik schud de opties van de huurderdialoog ook, anders staat het beste antwoord altijd bovenaan. Akkoord?
- Het leerpunt noemt nog geen Zig365-onderdeel uit `producten`, omdat de woningen daar in de JSON niet naar verwijzen. Een veld `product` per woning zou dat mogelijk maken.
- Woning 26 (finale) krijgt nu ook een oranje markering, omdat hij in de JSON staat. Moet die pas verschijnen als de andere woningen af zijn?
- Titel-PNG's: draai `tools/render_titels.py` zodra je wilt; het titelscherm pakt `titel-wijkwijs.png` dan automatisch op.
- Zie ook `open_vragen` in `public/content/scenarios.json`.
