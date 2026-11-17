# Wijkwijs – game design document

*Werktitel. Versie 0.1, 16 november 2026. Zig Grow.*

## 1. In één zin

Je loopt in 3D door een straat, gaat bij huurders naar binnen en helpt ze met een probleem. Daarna wissel je van perspectief, word je een medewerker van de corporatie en los je hetzelfde probleem op in Zig365.

## 2. Doel en doelgroep

**Doelgroep:** nieuwe Zig-collega's (onboarding), sales en pre-sales, consultants, support. Iedereen die moet snappen wat een huurder meemaakt en hoe Zig365 de corporatie helpt om dat goed af te handelen.

**Leerdoelen (na het spelen kun je ...)**

1. uitleggen via welke kanalen een huurder een vraag, reparatie, klacht of melding doet, en wat het huurdersportaal daarin doet;
2. per situatie aanwijzen welk Zig365-onderdeel de corporatie gebruikt: Customer (CRM), Operations, Maintenance, Matching, Huurdersportaal of Leveranciersportaal;
3. de hoofdstappen van zes werkprocessen in de goede volgorde zetten (reparatieverzoek, klacht, overlast, bezwaar huurverhoging, betalingsregeling, geriefsverbetering);
4. het verschil uitleggen tussen wat de huurder ziet en wat er achter de schermen bij de corporatie gebeurt.

**Inhoudelijke bron:** de 22 Zig365-e-learnings (Zig365 Best Practice-procesmodel R2604, Mavim en werkinstructies op community.zig365.nl). Het spel verzint geen beleid. Wat er niet in de e-learnings staat, komt als open vraag in `content/scenarios.json` (`open_vragen`).

## 3. Kernloop per woning

```
 Straat  ──►  Aanbellen  ──►  HUURDERFASE (binnen)  ──►  Perspectiefwissel  ──►  CORPORATIEFASE (kantoor)  ──►  Terug naar straat
 (lopen)      (deur)         ontdekken + helpen         "Ondertussen bij..."      in Zig365 afhandelen          woning krijgt ✓
```

### 3.1 Straat (verkennen)
- Third-person: je ziet je eigen personage van achteren en iets van boven. Lopen met WASD/pijltjes of klik-om-te-lopen; op telefoon/tablet een virtuele joystick.
- Woningen met een probleem hebben een oranje markering (Zig-oranje = accent) boven de deur. Afgeronde woningen krijgen een blauw vinkje.
- Aan het eind van de straat staat het kantoor van de fictieve corporatie **Woonstichting Lindewaard**. Daar vindt de corporatiefase plaats.

### 3.2 Huurderfase (binnen in de woning)
- Je belt aan, de huurder doet open (portret + korte tekst), en je loopt naar binnen. De camera schakelt naar een vaste kamercamera.
- **Ontdekken:** in de woning zitten 2–4 *hotspots* (lekkende kraan, stapel post, raam met geluid van de buren ...). Klik je erop, dan krijg je informatie. Pas als je de kernhotspot hebt gevonden, gaat het gesprek verder.
- **Helpen:** een gesprek met keuzes. Je helpt de huurder de juiste route te kiezen (bijvoorbeeld een reparatieverzoek indienen via het huurdersportaal en daarbij de vraagboom doorlopen). Een goede keuze maakt de huurder blijer. Een minder goede keuze levert uitleg op, geen game over.
- **Leerpunt:** een kaartje "Dit neem je mee" met het Zig365-onderdeel dat de huurder helpt.

### 3.3 Perspectiefwissel
- Overgangsscherm in Zig-blauw: *"Ondertussen bij Woonstichting Lindewaard ..."*. Je speler-avatar wordt de medewerker (portret uit de e-learnings, bijvoorbeeld Anna van klantcontact).
- De camera vliegt van de woning naar het kantoor. Dat maakt de koppeling zichtbaar: hetzelfde probleem, de andere kant.

### 3.4 Corporatiefase (kantoor)
- Je zit aan een bureau. Op het scherm staat een **gestileerd, fictief Zig365-scherm**: geen echte screenshots, wel herkenbare namen (Customer, Operations, Maintenance).
- 3–5 korte opdrachten van deze vier typen:
  - **Systeem kiezen:** "Waar doe je dit?" (Customer / Operations / Maintenance / portaal);
  - **Volgorde:** sleep de stappen in de goede volgorde;
  - **Keuze:** wat is de juiste vervolgactie?
  - **Invullen:** kies de juiste status of het juiste type (bijvoorbeeld dossiertype OVERLIND).
- Feedback bij elke stap, letterlijk gebaseerd op de e-learning.
- Afsluiting: je ziet het effect bij de huurder (de kraan is gemaakt, de huurder is opgelucht) en het vinkje op de woning.

## 4. Woningen in de straat (zie `content/scenarios.json`)

| # | Adres | Huurder | Probleem | Medewerker | Bron (e-learning) |
|---|---|---|---|---|---|
| 1 | Lindelaan 14 | de heer Farouk | Keukenkraan lekt + nieuw telefoonnummer | Anna (klantcontact) → Fatima (onderhoud) | 02, 06 |
| 2 | Lindelaan 16 | de heer Mensah | Drie keer gebeld over dakgoot, niemand belt terug | Anna (klantcontact) | 04 |
| 3 | Lindelaan 18 | mevrouw Hansen | Harde muziek bij de buren + kapotte verlichting fietsenstalling | Tariq (consulent wonen) | 05 |
| 4 | Lindelaan 20 | de heer Mulder | Bezwaar tegen huurverhoging: berging is weg | Wei (huuradministratie) | 03 |
| 5 | Lindelaan 22 | de heer Van Dijk | Twee maanden huurachterstand, wil een regeling | Amara (debiteurenbeheer) | 14 |
| 6 | Lindelaan 24 | de heer Volkov | Wil een tweede toilet boven (geriefsverbetering) | Fatima (onderhoud) | 06 |
| ★ | Lindelaan 26 | (leeg) → mevrouw Yilmaz | Finale: de woning wordt weer verhuurd | Bram (opzichter) → Sanne (verhuur) | 07, 01 |

**MVP = woning 1, 2 en 3.** De rest volgt in latere fases (zie `BOUWPLAN.md`).

Alle namen, adressen en bedragen zijn fictief en komen uit de e-learnings. Er komen geen echte klant-, huurder- of medewerkergegevens in het spel.

## 5. Score en voortgang

- **Twee meters** (in de stijl van Corpopoly, maar eenvoudiger):
  - *Huurderstevredenheid* (per woning 0–3 hartjes, uit de huurderfase);
  - *Proceskennis* (punten uit de corporatiefase).
- Geen munten, geen game over. Fouten leveren uitleg op.
- **Eindscherm:** per woning een vinkje en de leerpunten, plus een totaalscore.
- **SCORM 2004:** `cmi.score.scaled` = proceskennis / maximum, `cmi.completion_status` = completed als alle MVP-woningen af zijn, `cmi.success_status` = passed bij ≥ 70%. `cmi.suspend_data` bewaart welke woningen af zijn, zodat je later verder kunt.

## 6. Vormgeving (Zig Grow-huisstijl)

- **Kleuren:** Zig-blauw `#1F5AFF` (drager), Zig-oranje `#FF9000` (alleen accent: markeringen, de pijl, highlights), navy `#152330` (tekst, donkere vlakken), wit, grijs `#595959`, tint `#EAF0FF` / `#D6E0FF`. Geen andere merkkleuren; neutrale wereldkleuren (baksteen, groen, asfalt) mogen gedempt.
- **3D-stijl:** low-poly en "clean", zachte belichting, platte kleuren (MeshToonMaterial of MeshStandardMaterial met weinig roughness-variatie). Denk aan een isometrische miniatuurstraat. Geen fotorealisme.
- **Personages:** eenvoudige low-poly figuren in 3D. In de dialogen staan de **portretten** uit de e-learnings (`assets/portretten/`), zodat collega's de personages herkennen.
- **UI:** HTML/CSS-overlay over de 3D-canvas, in dezelfde stijl als de e-learnings en Corpopoly (afgeronde kaarten, navy tekst, blauwe knoppen, oranje accent).
- **Font:** Poppins voor UI en lopende tekst (open licentie, dezelfde als in de e-learnings). Grote titels in Safiro, als vooraf gerenderde afbeeldingen (`tools/render_titels.py`). De Safiro-desktoplicentie staat geen webfont en geen verspreiding van het fontbestand toe. Voor Safiro als echte webfont in het spel is een app/game- of weblicentie van Atipo nodig.
- **Logo:** GROW3 (op licht) en GROW4 (op donker), icoon GROW13/GROW14 voor favicon en laadscherm. Altijd in een hoek, nooit vervormd.

## 7. Geluid en voice-over

- Rustige achtergrondmuziek en straatgeluid (vogels, een fiets). Muziek gaat zachter onder de voice-over.
- Optionele voice-over voor huurders en medewerkers met dezelfde opzet als de e-learnings (Piper/edge-tts, stem Emma multilingual; "Zig" uitgesproken als "Zikk").
- **Knop voice-over aan/uit** en **geluid aan/uit**, altijd zichtbaar. Ondertitels altijd aan.

## 8. Techniek (samengevat, details in `CLAUDE.md`)

- **Three.js** + **Vite**. De build levert een statische map met relatieve paden op.
- Draait via een link (GitHub Pages, zoals Corpopoly) **en** als SCORM 2004-pakket in Studytube (in een iframe).
- Geen server en geen login. Alle content staat in `content/scenarios.json`.
- Doel: < 15 MB, 60 fps op een gemiddelde zakelijke laptop, speelbaar op een tablet.
- NL en EN: alle teksten in de JSON als `{ "nl": ..., "en": ... }` (EN volgt in fase 4).

## 9. Toegankelijkheid

- Volledig te spelen met toetsenbord (Tab/Enter in dialogen, WASD om te lopen).
- Ondertitels, voldoende contrast (navy op wit, wit op blauw), tekst min. 16 px.
- Instelling "minder beweging": geen camerazwaai, wel harde overgangen.
- Speelduur: ±5 min per woning, ±20 min voor de MVP.

## 10. Buiten scope (voor nu)

Multiplayer, vrij rondlopen in het kantoor, echte Zig365-screenshots, en een leaderboard over spelers heen. Die zijn later te overwegen.
