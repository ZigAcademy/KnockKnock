# Wijkwijs – bouwplan

Werk in deze volgorde. Elke fase levert iets speelbaars op. Rond een fase af met de checklist en laat Tim het eerst testen voordat je aan de volgende begint.

---

## Fase 0 – Opzet (±1 sessie)
- Vite + TypeScript + Three.js opzetten, `base: './'`.
- `src/theme.ts` met de huisstijlkleuren; CSS-variabelen; Poppins laden uit `assets/fonts/`. Titelscherm met `titel-wijkwijs.png` (Tim maakt die met `tools/render_titels.py`; tot dan een tekst-placeholder in Poppins 600). `.gitignore` met `*Safiro*`.
- `public/content/scenarios.json` laden en typen (`src/content/types.ts`).
- Lege scène met grondvlak, licht en het GROW3-logo in de UI-hoek.
- Playwright-rooktest die de build opent en een screenshot maakt.

**Klaar als:** `npm run dev` een blauwe lucht met een grondvlak en het logo toont, en `npm run build` + `npm test` slagen.

## Fase 1 – Straat en lopen (±2 sessies)
- Procedurele straat Lindelaan: stoep, weg, 7 rijtjeshuizen (nr 14–26), wat bomen en een fietsenstalling, en het kantoor van Woonstichting Lindewaard aan het eind.
- Speler-personage (low-poly) + third-person camera die soepel volgt en niet door muren gaat.
- Besturing: WASD/pijltjes, muis voor camera, klik-om-te-lopen; touch-joystick op tablets.
- Botsing met huizen en randen.
- Oranje markering boven de deuren van woningen die in de JSON staan; in de buurt van een deur verschijnt een knop "Aanbellen" (E / tik).

**Klaar als:** je soepel door de straat loopt (60 fps) en bij nr 14 kunt aanbellen.

## Fase 2 – Huurderfase woning 1 (±2 sessies)
- Interieurscène (één kamer met keuken), vaste kamercamera of beperkte third-person.
- Deurscène: huurder doet open, dialoogkaart met portret en tekst uit `huurderfase.deur`.
- Hotspots uit de JSON: klikbaar, oranje gloed bij hover, popup met tekst. Kernhotspots gevonden → dialoog ontgrendeld.
- Dialoogsysteem: vraag + opties, feedback, hartjes voor huurderstevredenheid.
- Leerpunt-kaart "Dit neem je mee".

**Klaar als:** woning 1 van deur tot leerpunt speelbaar is, volledig met toetsenbord.

## Fase 3 – Perspectiefwissel en corporatiefase woning 1 (±2 sessies)
- Overgang: scherm in Zig-blauw met "Ondertussen bij Woonstichting Lindewaard ...", en de camera vliegt van de woning naar het kantoor (bij "minder beweging": harde overgang).
- Kantoorscène: bureau, beeldscherm, de medewerker (portret) als jouw rol.
- Gestileerd Zig365-scherm (HTML-overlay): tabbladen Customer / Operations / Maintenance als decor, en daarin de opdracht.
- Staptypen `systeem`, `keuze` (opties geschud) en `volgorde` (slepen + toetsenbordalternatief).
- Meerdere medewerkers achter elkaar (woning 1: Anna, dan Fatima).
- Afloop: terug naar de straat, korte scène bij de huurder (`afloop`), blauw vinkje op de woning.

**Klaar als:** woning 1 de hele lus doorloopt en de score klopt.

## Fase 4 – MVP compleet: woning 2 en 3 + SCORM (±2 sessies)
- Interieurs voor nr 16 en 18 (hergebruik het kamersjabloon; variatie in kleur en meubels). Woning 3 heeft een raam met zicht op de fietsenstalling.
- HUD met meters, eindscherm met leerpunten en totaalscore.
- SCORM 2004-wrapper + `npm run scorm`; test in SCORM Cloud (gratis) en daarna in Studytube.
- Instellingen: geluid, voice-over, minder beweging, taal (EN mag nog uitgegrijsd zijn).

**Klaar als:** het SCORM-pakket in Studytube start, voortgang bewaart en `completed`/`passed` rapporteert.

## Fase 5 – Uitbreiden (later)
- Woning 4 (Mulder), 5 (Van Dijk) en 6 (Volkov), en de finale op nr 26 (Bram → Sanne → mevrouw Yilmaz krijgt de sleutels).
- Engelse teksten (`en`-velden) + taalwissel.
- Voice-over met Piper/edge-tts (Emma multilingual, "Zig" = "Zikk"), met ducking van de muziek.
- Geluid: sfeer, voetstappen, deurbel, "goed"/"fout"-effecten.
- Publiceren op GitHub Pages onder `zigacademy`, naast Corpopoly.

---

## Checklist per fase
- [ ] `npm run build` en `npm test` slagen; screenshots bekeken
- [ ] 60 fps in de straat (Chrome performance-overlay)
- [ ] Alleen huisstijlkleuren in de UI; logo correct
- [ ] Alle leerinhoud komt uit `scenarios.json`
- [ ] Toetsenbordbediening werkt
- [ ] Korte notitie in `docs/VOORTGANG.md`: wat is af, wat staat open, vragen voor Tim
