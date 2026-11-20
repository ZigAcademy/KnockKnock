# Bronnen omgeving (graphics)

Alles CC0 van [Poly Haven](https://polyhaven.com) (licentie: https://polyhaven.com/license), opgehaald op 19-11-2026.
Originelen in `tools/bron-assets/polyhaven/` (niet in git). Opnieuw maken: `node tools/detail.mjs`.

| Bestand | Bron | Makers |
|---|---|---|
| `lucht.hdr` | [Kloofendal 48d Partly Cloudy (Pure Sky)](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky), 1k HDR | Greg Zaal, Jarod Guest |
| `detail.jpg` linksboven (klinkers) | [Brick Pavement 03](https://polyhaven.com/a/brick_pavement_03), diffuse 1k | Charlotte Baglioni |
| `detail.jpg` rechtsboven (asfalt) | [Asphalt 02](https://polyhaven.com/a/asphalt_02), diffuse 1k | Rob Tuytel |
| `detail.jpg` linksonder (baksteen) | [Brick Wall 001](https://polyhaven.com/a/brick_wall_001), diffuse 1k | Rob Tuytel, Dimitrios Savva |
| `detail.jpg` rechtsonder (dakpannen) | [Ceramic Roof 01](https://polyhaven.com/a/ceramic_roof_01), diffuse 1k | Rob Tuytel |

`detail.jpg` is een grijswaarde-atlas (512 px per tegel, genormaliseerd); de kleur in het spel blijft de eigen kleur.

## Bibliotheken (npm, gebundeld)
- [postprocessing](https://github.com/pmndrs/postprocessing) 6.39.6 (Zlib): nabewerkingsketen, bloom, tone mapping, SMAA, vignet.
- [n8ao](https://github.com/N8python/n8ao) 2.1.0 (ISC): ambient occlusion (SSAO).

## Uitbreiding detail-atlas (3×3)
- Poly Haven (CC0): `leafy_grass` (gras) en `wood_planks` (houten hekken en schuurtje), als grijswaardedetail.
- Heg-tegel en `heg_blad.png`: zelf samengesteld (`tools/heg.mjs`) uit bladeren van de Stylized Nature MegaKit (Quaternius, CC0).
