# Eerste prompt voor Claude Code

Open de map `wijkwijs` in je terminal, start `claude` en plak dit:

---

Lees CLAUDE.md, docs/GAME_DESIGN.md en docs/BOUWPLAN.md. We bouwen Wijkwijs, een 3D-browsergame voor Zig Grow.

Begin met **fase 0 en fase 1** uit het bouwplan:
1. Zet het project op met Vite + TypeScript + Three.js (`base: './'`). Verplaats `content/` en `assets/` naar `public/`.
2. Maak `src/theme.ts` met de Zig Grow-kleuren en laad Poppins uit `assets/fonts/`. Safiro gebruiken we alleen als vooraf gerenderde titel-PNG's (zie CLAUDE.md): voeg nooit Safiro-fontbestanden toe.
3. Bouw de straat Lindelaan (nr 14–26 + het kantoor van Woonstichting Lindewaard), het speler-personage, de third-person camera en de besturing, inclusief touch.
4. Zet de oranje markeringen boven de woningen uit `scenarios.json` en een "Aanbellen"-knop bij de deur. Aanbellen hoeft nog niets te doen behalve een melding tonen.
5. Voeg een Playwright-rooktest toe die screenshots maakt.

Werk in kleine stappen, laat na elke stap zien wat je gedaan hebt, en stop na fase 1 zodat ik kan testen. Verzin geen inhoud: alle teksten komen uit `content/scenarios.json`.

---

## Volgende prompts (na het testen)

**Fase 2:** "Fase 1 is goed. Ga door met fase 2: de huurderfase van woning 1 (Lindelaan 14), volgens het bouwplan."

**Fase 3:** "Ga door met fase 3: de perspectiefwissel en de corporatiefase van woning 1. Het Zig365-scherm is een gestileerde, fictieve interface in de huisstijl."

**Fase 4:** "Ga door met fase 4: woning 2 en 3, HUD, eindscherm en de SCORM 2004-export."

## Tips
- Plak een screenshot in Claude Code als iets er niet uitziet zoals je wilt. Dat werkt beter dan het beschrijven.
- Wil je inhoud aanpassen? Pas dan `public/content/scenarios.json` aan, niet de code.
- Commit na elke fase (`git commit`), dan kun je altijd terug.
