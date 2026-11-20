import * as THREE from 'three';
import { WORLD } from '../theme';
import { LAGE_RESOLUTIE } from '../game/versie';

/**
 * Oppervlaktedetail (klinkers, asfalt, baksteen, dakpannen) uit één grijswaarde-atlas
 * (public/assets/omgeving/detail.jpg, CC0 van Poly Haven; zie tools/detail.mjs).
 * De kleur blijft de vertexkleur (huisstijl en per huis een eigen baksteen); de textuur
 * voegt alleen structuur toe. Projectie in wereldcoördinaten, dus geen UV's nodig.
 * Zolang de atlas niet geladen is, doet het detail niets (1×1 grijs = ×1).
 */
export const enum Detail { Geen = 0, Klinker = 1, Asfalt = 2, Baksteen = 3, Dak = 4, Gras = 5, Hout = 6, Heg = 7 }

/** Kleur → soort detail (zodat bestaande code niets hoeft te weten). */
const PER_KLEUR = new Map<string, Detail>([
  [WORLD.sidewalk.toLowerCase(), Detail.Klinker],
  [WORLD.path.toLowerCase(), Detail.Klinker],
  [WORLD.asphalt.toLowerCase(), Detail.Asfalt],
  ...WORLD.bricks.map((b): [string, Detail] => [b.toLowerCase(), Detail.Baksteen]),
  ['#a9674f', Detail.Baksteen], // verdieping van het kantoor
  ['#7a5a4c', Detail.Baksteen], // sokkel van het kantoor
  [WORLD.roof.toLowerCase(), Detail.Dak],
  [WORLD.roofAlt.toLowerCase(), Detail.Dak],
  [WORLD.grass.toLowerCase(), Detail.Gras],
  [WORLD.grassDark.toLowerCase(), Detail.Gras],
  [WORLD.hedge.toLowerCase(), Detail.Heg],
  [WORLD.wood.toLowerCase(), Detail.Hout],
  ['#6a5c50', Detail.Hout], // schuurtje (planken)
  ['#5e5046', Detail.Hout], // deur van het schuurtje
]);
export function detailVoorKleur(kleur: string): Detail { return PER_KLEUR.get(kleur.toLowerCase()) ?? Detail.Geen; }

/** Gedeelde tijd voor wind en wolkenschaduw (gezet door de straat; stil bij "minder beweging"). */
export const omgevingsTijd = { value: 0 };

const grijs = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
grijs.needsUpdate = true;
const uniform = { value: grijs as THREE.Texture };
let geladen = false;
function laadAtlas(): void {
  if (geladen) return;
  geladen = true;
  new THREE.TextureLoader().load('./assets/omgeving/detail.jpg', (t) => {
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 8;
    t.colorSpace = THREE.NoColorSpace;
    uniform.value = t;
  }, undefined, () => { /* zonder atlas: geen detail */ });
}

/**
 * Patcht een MeshStandardMaterial met vertexkleuren: de geometrie moet een attribuut
 * `aDetail` (float, 0 = geen) hebben.
 */
export function metDetail(mat: THREE.MeshStandardMaterial, opts: { buiten?: boolean } = {}): THREE.MeshStandardMaterial {
  // lage resolutie: geen textuurdetail, wind en wolkenschaduw (zoals het eerdere beeld)
  if (LAGE_RESOLUTIE) return mat;
  laadAtlas();
  const buiten = opts.buiten ? 1 : 0;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uDetail = uniform;
    sh.uniforms.uTijd = omgevingsTijd;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute float aDetail;
attribute float aWind;
uniform float uTijd;
varying float vDetail;
varying vec3 vWPos;
varying vec3 vWNrm;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#if ${buiten} == 1
// wind: bladeren en takken wiegen; de stam staat vast (aWind = 0 onderaan)
if (aWind > 0.0) {
  vec3 wp0 = (modelMatrix * vec4(transformed, 1.0)).xyz;
  float vlaag = 0.6 + 0.4 * sin(uTijd * 0.35 + wp0.x * 0.05);
  transformed.x += sin(uTijd * 1.6 + wp0.x * 0.45 + wp0.z * 0.3) * aWind * 0.11 * vlaag;
  transformed.z += cos(uTijd * 1.3 + wp0.x * 0.25 + wp0.y * 0.4) * aWind * 0.06 * vlaag;
}
#endif`)
      .replace('#include <fog_vertex>', `#include <fog_vertex>
vDetail = aDetail;
vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
vWNrm = normalize(mat3(modelMatrix) * objectNormal);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D uDetail;
uniform float uTijd;
varying float vDetail;
varying vec3 vWPos;
varying vec3 vWNrm;
// tegel i uit de 3x3-atlas, zonder naden bij het herhalen (textureGrad op de doorlopende uv)
float detailTegel(int i, vec2 uv) {
  const float T = 1.0 / 3.0, S = 1.0 / 3.0 - 0.01;
  vec2 off = vec2(float(i - (i / 3) * 3), float(2 - i / 3)) * T;
  vec2 f = fract(uv) * S + 0.005 + off;
  return textureGrad(uDetail, f, dFdx(uv) * S, dFdy(uv) * S).r;
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
#if ${buiten} == 1
// wolkenschaduw: langzaam schuivend zachtere licht/donker-patroon over de straat
{
  vec2 q = vWPos.xz * 0.018 + vec2(uTijd * 0.012, uTijd * 0.004);
  float w = sin(q.x * 3.1 + sin(q.y * 2.3)) * 0.5 + sin(q.y * 2.7 + sin(q.x * 1.7 + 1.3)) * 0.5;
  w += 0.5 * sin((q.x + q.y) * 5.3 + 0.7);
  diffuseColor.rgb *= 1.0 - 0.16 * smoothstep(0.35, 0.95, w);
}
#endif
if (vDetail > 0.5) {
  int id = int(vDetail + 0.5) - 1;
  vec3 n = abs(normalize(vWNrm));
  // tegelmaat in meters en kracht: klinkers, asfalt, baksteen, dak, gras, hout, heg
  float maat = id == 0 ? 2.5 : id == 1 ? 3.0 : id == 2 ? 2.2 : id == 3 ? 3.0 : id == 4 ? 2.2 : id == 5 ? 1.6 : 0.85;
  float kracht = id == 0 ? 0.42 : id == 1 ? 0.3 : id == 2 ? 0.55 : id == 3 ? 0.7 : id == 4 ? 0.6 : id == 5 ? 0.65 : 0.95;
  vec2 uv;
  if (id == 3) uv = vec2(vWPos.x, vWPos.y * 1.6 + vWPos.z * 0.3);
  else if (n.y > 0.7) uv = vWPos.xz;
  else if (n.x > n.z) uv = vWPos.zy;
  else uv = vWPos.xy;
  float d = detailTegel(id, uv / maat);
  // verder weg minder detail (geen moiré); daken en heggen blijven ook van ver herkenbaar
  float afstand = length(vWPos - cameraPosition);
  kracht *= clamp(1.4 - afstand / 45.0, (id == 3 || id == 6) ? 0.75 : 0.25, 1.0);
  diffuseColor.rgb *= mix(1.0, clamp(d * 2.0, 0.35, 1.7), kracht);
}`);
  };
  mat.customProgramCacheKey = () => `detail-v3-${buiten}`;
  return mat;
}
