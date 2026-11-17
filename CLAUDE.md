# Wijkwijs – instructies voor Claude Code

Wijkwijs is een 3D-browsergame voor Zig Grow (Zig's leermerk). De speler loopt in third-person door een straat, helpt huurders in hun woning en lost daarna hetzelfde probleem op als medewerker van een corporatie, in een gestileerd Zig365-scherm. Eigenaar: Tim Vos (Talent Development Partner, Zig Grow).

## Lees eerst
1. `docs/GAME_DESIGN.md`: concept, kernloop, score en vormgeving. Dit is leidend.
2. `docs/BOUWPLAN.md`: de fases. Werk fase voor fase en sluit elke fase af met de checklist.
3. `content/scenarios.json`: alle inhoud. **De code bevat geen leerinhoud**; alles komt uit deze JSON.

## Stack
- **Three.js** (laatste stabiele versie, via npm) + **Vite** + vanilla **TypeScript**. Geen React, geen game-engine.
- UI (dialogen, Zig365-scherm, menu's) als **HTML/CSS-overlay** boven de canvas, niet in WebGL.
- Build: `vite build` met `base: './'`, zodat alles met relatieve paden werkt (GitHub Pages én SCORM in een iframe).
- Geen server, geen login, geen externe CDN's bij runtime: alles wordt gebundeld.
- Geen fysica-engine; eenvoudige botsing met axis-aligned boxes is genoeg.

## Mappen
```
src/
  main.ts            opstarten, game-loop
  world/             straat, woningen, kantoor (procedurele low-poly geometrie)
  player/            personage, third-person camera, besturing (toetsenbord, muis, touch-joystick)
  scenes/            straat, interieur (per woning), kantoor; overgang/perspectiefwissel
  ui/                dialoog, hotspot-popup, zig365-scherm, hud, eindscherm, instellingen
  content/           laden en typen van scenarios.json
  scorm/             SCORM 2004-wrapper (API zoeken, Initialize, SetValue, Commit, Terminate)
  audio/             muziek, effecten, voice-over (met ducking)
public/
  content/scenarios.json
  assets/portretten/*.webp, assets/logo/*.png, assets/fonts/ (Safiro)
scorm/imsmanifest.xml  sjabloon; build-script zet het in de root van de zip
```

## Huisstijl (Zig Grow), niet onderhandelbaar
- Kleuren als CSS-variabelen en als constanten in `src/theme.ts`:
  `--blue:#1F5AFF` (drager) · `--orange:#FF9000` (alleen accent) · `--navy:#152330` (tekst/donker) · `--white:#FFFFFF` · `--grey:#595959` · `--tint:#EAF0FF` · `--line:#D6E0FF`.
- Geen andere merkkleuren. Wereldkleuren (baksteen, gras, asfalt) mogen, maar gedempt, zodat blauw en oranje opvallen.
- Oranje alleen voor markeringen (woning met probleem, actieve hotspot, call-to-action), nooit als groot vlak.
- **Fonts – let op de licentie.** Tim heeft een Safiro-*desktop*licentie: ontwerpwerk mag, maar het fontbestand mag niet in het project of de build, en het mag niet worden omgezet naar een webfont.
  - Lopende tekst en UI: **Poppins** (OFL, staat in `assets/fonts/`, met licentie). Gewichten: 400 tekst, 600 koppen, 700 nadruk.
  - Koppen die echt in Safiro moeten (titelscherm, overgang, eindscherm): als **PNG** uit `tools/render_titels.py`. Tim draait dat op zijn Mac met het lokale fontpad; de PNG's komen in `public/assets/titels/`. Nieuwe titel nodig? Voeg hem toe aan `TITELS` in dat script en vraag Tim het opnieuw te draaien.
  - Voeg nooit `.otf`-, `.ttf`- of `.woff`-bestanden van Safiro toe. Zet `*Safiro*` in `.gitignore`.
- Logo's in `assets/logo/`: `GROW3` (wordmark, op licht), `GROW4` (wordmark wit, op donker), `GROW13` (icoon, op licht), `GROW14` (icoon, op donker, bijv. favicon/laadscherm). In een hoek, verhouding behouden, nooit herkleuren. Maak nooit zelf een logo.
- Portretten in `assets/portretten/` horen bij vaste personages uit de e-learnings. Gebruik ze alleen voor het personage in `scenarios.json`.

## 3D-stijl
- Low-poly, platte kleuren, zachte schaduwen (één DirectionalLight met schaduw + HemisphereLight). Geen texturen nodig; als je toch texturen gebruikt, dan alleen CC0.
- Personages: eenvoudige figuren uit primitieven (capsule-lijf, bol-hoofd), met een korte loopanimatie via code. Huurders herken je aan kleur + portret in de dialoog.
- Woningen: rijtjeshuizen met een eigen deurkleur. Problemwoning: zwevend oranje icoon boven de deur. Afgerond: blauw vinkje.

## Gameplay-regels (uit het design)
- Huurderfase: hotspots ontdekken (kernhotspots moeten gevonden zijn), daarna de dialoog. Fout = uitleg, nooit game over.
- Corporatiefase: staptypen `systeem`, `keuze`, `volgorde`. **Schud de opties van keuze- en systeemvragen bij het tonen**: in de JSON staat het goede antwoord altijd op index `goed`.
- Volgorde-vragen: de JSON-volgorde is de goede volgorde; schud ze voor de speler.
- Feedback altijd met de `uitleg` uit de JSON, letterlijk.
- Score: huurderstevredenheid (som van `score` in de huurderfase) en proceskennis (goed bij de eerste poging).

## SCORM 2004
- Werkt ook zonder LMS (lokaal of op GitHub Pages): de wrapper faalt stil en het spel blijft speelbaar.
- `cmi.completion_status` = `completed` als alle woningen met `"mvp": true` af zijn (later: alle woningen).
- `cmi.score.scaled` = proceskennis / max; `cmi.success_status` = `passed` bij ≥ 0,7.
- `cmi.suspend_data`: JSON met afgeronde woningen en scores (houd het onder 4000 tekens).
- `npm run scorm` maakt `dist/KnockKnock_SCORM2004.zip` met `imsmanifest.xml` in de root; elk bestand in de build staat in het manifest.

## Kwaliteit
- Na elke wijziging: `npm run build` moet slagen, geen TypeScript-fouten.
- Playwright-rooktest (`npm test`): opent de build, wacht op de canvas, loopt naar woning 1, opent de dialoog en maakt screenshots. Bekijk de screenshots.
- Prestatie: 60 fps op een laptop met geïntegreerde GPU. Beperk draw calls (merge geometry / InstancedMesh voor herhaalde objecten), schaduwkaart max 2048, pixelRatio max 2.
- Bundel < 15 MB.
- Toegankelijk: volledig met toetsenbord, ondertitels, knop voor geluid en voice-over aan/uit, instelling "minder beweging".

## Inhoudsregels
- Verzin geen beleid of Zig365-functionaliteit. Alles wat de speler leert, staat in `scenarios.json` met een `bron` (nummer van de e-learning). Ontbreekt iets, zet het dan bij `open_vragen` en vraag het aan Tim.
- Nooit echte klant-, huurder- of medewerkergegevens. Alles is fictief.
- Teksten in de jij-vorm, kort en in B1-taal. Interface in het Nederlands; Engels volgt via het `en`-veld.
- Het Zig365-scherm in het spel is een **gestileerde, fictieve** interface. Gebruik geen echte screenshots en neem de echte UI niet één-op-één over.
