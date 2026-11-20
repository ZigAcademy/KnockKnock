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
| `planten.glb` | Quaternius – Stylized Nature MegaKit (Standard, CC0; via opengameart.org/content/stylized-nature-megakit) | 3 bomen, 2 struiken, 2 bloemgroepen, 2 soorten gras, plant, varen; met bladtexturen (verkleind naar 512 px). Vervangt de Kenney-bomen, -struiken en -bloemen in de straat; `natuur.glb` blijft als terugval. Gebouwd met `tools/planten.mjs`. |
| `mensen/*.glb` | Microsoft Rocketbox (MIT, github.com/microsoft/Microsoft-Rocketbox; licentie in `mensen/LICENSE-Rocketbox.txt`) | 22 realistische personages (Adults: Female_Adult_01/03/06/08/09/11/13/15, Male_Adult_03/04/05/06/08/09/12/13/16; Professions: Business_Female_01/02, Business_Male_02/05, Medical_Male_03), textures 512 px WebP, sommige kledingkleuren aangepast; animaties idle, walk, run, wave, knock_door, sit_table_idle (`anim-f`/`anim-m`). Omgezet met `tools/rocketbox.mjs`. |
| `voertuigen.glb` | "Generic passenger car pack" door Comrade1280 (sketchfab.com/comrade1280), via sketchfab.com/3d-models/generic-passenger-car-pack-20f9af9b8a404d5cb022ac6fe87f21f5, licentie CC BY 4.0 (creativecommons.org/licenses/by/4.0) | 7 auto's (sedan, minivan, suv, stationwagen, hatchback, compact, pick-up). Aangepast: opgesplitst, overgespoten in gedempte kleuren (pick-up wit), textures 512 px WebP, glas in het spel donker en glanzend. Het logo op de pick-up is het eigen Huis & Haard-logo. Omgezet met `tools/autos.mjs`. |
| `fietsen.glb` | "Retro bike" door annzep (sketchfab.com/annzep), sketchfab.com/3d-models/retro-bike-d9c4d3b44b2e4e4aa24e360c9830c0a1, CC BY 4.0; "Bike" door T-FLEX CAD ST (Free) (sketchfab.com/tflexcad), sketchfab.com/3d-models/bike-a4c57cc4d44f45a999e48d980a099aaf, CC BY 4.0; "Bike Rack #4" door aecoviz (sketchfab.com/Vissy), sketchfab.com/3d-models/bike-rack-4-8c8fd4fa06eb4b1c8db5bd3584892f3c, CC BY 4.0 | Retrofiets: grasheuvel en bloemen verwijderd, vereenvoudigd (580k → 31k driehoeken), framekleur per fiets aangepast. Mountainbike ('fiets-mtb'): vereenvoudigd (1,5 mln → 19k driehoeken). Fietspaaltje ongewijzigd (textures 512 px WebP). Omgezet met `tools/fietsen.mjs`. |
| `groen.glb` | "Hedge" door 1-3D.com (sketchfab.com/1-3D.com), sketchfab.com/3d-models/hedge-f2006b1a3af9442987963da054283ad7, **CC BY-SA 4.0**; "Realtime Grass" door mfhscoobydoo (sketchfab.com/mfhscoobydoo), sketchfab.com/3d-models/realtime-grass-07d38555cae844f7abdeace9d19c4777, CC BY 4.0 | Heg in twee versies vereenvoudigd ('heg' 12k, 'heg-ver' 2,4k driehoeken), in het spel iets dieper groen gekleurd. Let op: ShareAlike, dus deze aangepaste heg valt ook onder CC BY-SA 4.0 (licentie: creativecommons.org/licenses/by-sa/4.0). Gras: grondplaat verwijderd, in het spel frisser groen. Omgezet met `tools/groen.mjs`. |
| `props.glb` | Poly Haven (CC0, polyhaven.com): wooden_picnic_table, outdoor_table_chair_set_01, planter_box_01, planter_pot_clay, potted_plant_04, wooden_crate_01, plastic_crate_02, watering_can_metal_01, plastic_monobloc_chair_01, wooden_bucket_01, trashbag | Vereenvoudigd (500–2500 driehoeken per object), textures 512 px WebP. Gedownload en omgezet met `tools/props.mjs`. |

Niet gebruikt: `Safiro.zip` en `assets.zip` (fontbestanden), Animated Men Characters (Feb 2019) en
Buildings pack (Aug 2017) waren niet nodig. Geen fiets, kat of vogels in de packs: de fietsen zijn
uit primitieven gemaakt, kat en vogels zijn weggelaten.
