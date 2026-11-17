# Bronnen 3D-modellen (fase 4b)

Alleen voor intern gebruik in Wijkwijs. Alle modellen zijn geselecteerd en geoptimaliseerd met
`tools/modellen.mjs` (gltf-transform + meshopt). De originele packs staan in `tools/bron-assets/`
(niet in git, niet in de build). Licentie volgens de makers: CC0 (Quaternius en Kenney).

| Bestand | Bron (pack) | Wat erin zit |
|---|---|---|
| `personages/man-casual.glb`, `man-hoodie.glb`, `man-suit.glb` | Quaternius – Ultimate Modular Men (Feb 2022) | Casual_2, Casual_Hoodie, Suit (pistool-mesh verwijderd) |
| `personages/vrouw-casual.glb`, `vrouw-formal.glb`, `vrouw-suit.glb` | Quaternius – Ultimate Modular Women (April 2022) | Casual, Formal, Suit |
| `personages/anim.glb` | Quaternius – Ultimate Modular Men (gedeeld skelet) | Idle, Idle_Neutral, Walk, Run, Wave, Interact (zonder vingers) |
| `personages/hoofd-man-*.glb` | Quaternius – Ultimate Modular Men | hoofden (kapsels) van Casual_2, Casual_Hoodie, Suit, Beach, Adventurer |
| `personages/hoofd-vrouw-*.glb` | Quaternius – Ultimate Modular Women | hoofden (kapsels) van Casual, Formal, Adventurer, Soldier, SciFi |
| `dieren/hond.glb` | Quaternius – Ultimate Animated Animals (July 2021) | ShibaInu (Walk, Idle, Idle_2, Eating), vacht gedempt in code |
| `autos.glb` | Kenney – Car Kit | sedan, hatchback-sports, suv, van, delivery |
| `straat.glb` | Kenney – City Kit (Roads), Kenney – Furniture Kit, Quaternius – Ultimate House Interior | light-curved (lantaarn), rugDoormat (deurmat), Trashcan_Green (kliko), Trashcan_Cylindric (prullenbak) |
| `natuur.glb` | Kenney – Nature Kit | bomen (oak, default, detailed, fat, simple), struiken, bloemen, gras, hek, pot |
| `meubels.glb` | Quaternius – Ultimate House Interior (June 2020), Quaternius – Furniture Pack (March 2019), Kenney – Furniture Kit | banken, stoelen, tafels, kasten, planten, lampen, gordijn, keukenmodules, bureau(stoel), kantoorspullen |
| `eten.glb` | Kenney – Food Kit | kopje, mokken, theekop, schaal, appel, sinaasappel, peer, pak, glas |
| `gebouwen.glb` | Quaternius – Ultimate Textured Building Pack (Dec 2019, *Models with Materials*) | 4 gebouwen, alleen als silhouet op de achtergrond |

Niet gebruikt: `Safiro.zip` en `assets.zip` (fontbestanden), Animated Men Characters (Feb 2019) en
Buildings pack (Aug 2017) waren niet nodig. Geen fiets, kat of vogels in de packs: de fietsen zijn
uit primitieven gemaakt, kat en vogels zijn weggelaten.
