# Knock Knock! – startpakket

3D-browsergame voor Zig Grow: help huurders in hun woning en los daarna hetzelfde probleem op als medewerker van de corporatie in Zig365.

## Inhoud
| Bestand | Wat |
|---|---|
| `CLAUDE.md` | Instructies die Claude Code automatisch leest: stack, huisstijl, fontlicentie, regels |
| `docs/GAME_DESIGN.md` | Concept, kernloop, woningen, score, vormgeving |
| `docs/BOUWPLAN.md` | Fases 0–5 met wat "klaar" betekent |
| `docs/EERSTE_PROMPT.md` | De prompt om mee te beginnen + vervolgprompts |
| `public/content/scenarios.json` | Alle inhoud: 6 woningen + finale, gebaseerd op e-learnings 01, 02, 03, 04, 05, 06, 07, 14 en 15 |
| `public/assets/portretten/` | 14 portretten (webversies) van de personages uit de e-learnings |
| `public/assets/logo/` | GROW3, GROW4 (wordmark licht/donker), GROW13, GROW14 (icoon licht/donker) |
| `public/assets/fonts/` | Poppins (open licentie, met OFL-tekst) |
| `tools/render_titels.py` | Maakt titel-PNG's in Safiro met het font op je eigen Mac |

## Zo begin je
1. Pak deze map uit op een plek buiten OneDrive, bijvoorbeeld `~/Projects/wijkwijs`.
2. `git init`, open de map in de terminal, start `claude` en plak de prompt uit `docs/EERSTE_PROMPT.md`.
3. Zodra het project staat, maak je de Safiro-titels:
   `python3 tools/render_titels.py "/Users/tim.vos/Documents/Branding for Claude/Safiro Complete Desktop"`

## Over Safiro
De desktoplicentie staat ontwerpwerk toe, maar geen webfont en geen verspreiding van het fontbestand. Daarom gebruikt het spel Poppins voor tekst en Safiro alleen in afbeeldingen. Wil je Safiro live in het spel, vraag dan een app/game- of weblicentie aan bij Atipo (info@atipo.es).

## Nog te beslissen
Zie `open_vragen` onderaan `public/content/scenarios.json`.
