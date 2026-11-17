# Bronnen geluid (fase 5)

Gemaakt met `node tools/geluiden.mjs` uit `tools/bron-assets/audio-*` (niet in git). Licentie: CC0 (Kenney).
Elk geluid staat er twee keer in: het origineel (`.ogg`, Chrome/Firefox/nieuwe Safari) en een ingekorte
mono AAC-versie (`.m4a`, oudere Safari/iPad). De game kiest zelf.

| Bestand | Pack | Origineel |
|---|---|---|
| `stap-steen-0..4` | Kenney – Impact Sounds | footstep_concrete_000–004 |
| `stap-gras-0..4` | Kenney – Impact Sounds | footstep_grass_000–004 |
| `stap-hout-0..4` | Kenney – Impact Sounds | footstep_wood_000–004 |
| `deur-open`, `deur-dicht` | Kenney – RPG Audio | doorOpen_1, doorClose_2 |
| `blad` | Kenney – RPG Audio | bookFlip2 |
| `klik`, `hotspot`, `goed`, `minder`, `leerpunt`, `scherm-open`, `scherm-dicht` | Kenney – Interface Sounds | click_002, open_002, confirmation_002, bong_001, maximize_003, maximize_006, minimize_006 |
| `toets-1..4` | Kenney – UI Audio | click1–4 |

| `praten.mp3` | Aangeleverd door Tim ("cartoon phone talking sound effect") | ongewijzigd; licentie nog checken |
| `buren-muziek.m4a` | Aangeleverd door Tim ("Techno Music - Background Music") | fragment 60–105 s, mono, naadloze lus; licentie nog checken |

In code gemaakt (Web Audio, geen bestanden): deurbel, motor van de auto, gebrabbel (terugval als `praten.mp3` ontbreekt), dreun bij nr 18,
druppende kraan, regen, gedempte muziek bij de buren, vogels, kantoorgeroezemoes, zoef bij de perspectiefwissel.
