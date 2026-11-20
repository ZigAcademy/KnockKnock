import * as THREE from 'three';
import { kitModel } from '../assets/modellen';
import { omgevingsTijd } from '../render/detail';

/**
 * Realistische heggen en grasplukken (Sketchfab; zie public/assets/modellen/BRONNEN.md):
 *  - 'heg' ("Hedge" door 1-3D.com, CC BY-SA 4.0): stukken heg op de plek van de heg-dozen, per stuk geschaald;
 *  - 'gras-plak' ("Realtime Grass" door mfhscoobydoo, CC BY 4.0): plukken gras op de gazons in de voortuinen.
 * Alles als InstancedMesh (één draw call per onderdeel). Zonder kit (lage resolutie) geven de functies null.
 */

/** Model → lijst van (geometrie, materiaal, matrix in de ruimte van het model) en de buitenmaat. */
export function onderdelen(model: THREE.Object3D): { delen: { geo: THREE.BufferGeometry; mat: THREE.Material; m: THREE.Matrix4 }[]; box: THREE.Box3 } {
  const kopie = model.clone(true);
  kopie.position.set(0, 0, 0); kopie.rotation.set(0, 0, 0); kopie.scale.set(1, 1, 1);
  kopie.updateMatrixWorld(true);
  const delen: { geo: THREE.BufferGeometry; mat: THREE.Material; m: THREE.Matrix4 }[] = [];
  kopie.traverse((o) => { const me = o as THREE.Mesh; if (me.isMesh) delen.push({ geo: me.geometry, mat: me.material as THREE.Material, m: me.matrixWorld.clone() }); });
  return { delen, box: new THREE.Box3().setFromObject(kopie) };
}

export function instanties(naam: string, delen: ReturnType<typeof onderdelen>['delen'], plekken: THREE.Matrix4[], opts: { schaduw?: boolean; wind?: number } = {}): THREE.Group {
  const g = new THREE.Group();
  g.name = naam;
  for (const d of delen) {
    const mat = d.mat.clone() as THREE.MeshStandardMaterial;
    if (opts.wind) {
      const kracht = opts.wind;
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uTijd = omgevingsTijd;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTijd;').replace('#include <begin_vertex>', `#include <begin_vertex>
vec3 ip = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
float hgt = max(0.0, (instanceMatrix * vec4(position, 1.0)).y - ip.y);
transformed.x += sin(uTijd * 2.1 + ip.x * 1.7 + position.z * 3.0) * ${kracht.toFixed(3)} * hgt;`);
      };
      mat.customProgramCacheKey = () => `${naam}-wind`;
    }
    const inst = new THREE.InstancedMesh(d.geo, mat, plekken.length);
    plekken.forEach((p, i) => inst.setMatrixAt(i, p.clone().multiply(d.m)));
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = !!opts.schaduw; inst.receiveShadow = true;
    inst.computeBoundingSphere();
    g.add(inst);
  }
  return g;
}

/** Heggen aan de straatkant (voortuinen): gedetailleerd model, zonder doos eronder. */
export const hegDichtbij = (b: THREE.Box3) => b.max.z < 6 && b.max.y < 1.0 && b.min.z > -1 && b.min.x > -17 && b.max.x < 61;
/** Komt er een echt heg-model? (standaardversie met geladen kit) */
export const heeftHegModel = () => !!kitModel('groen', 'heg');

/** Echte heg op de plek van elke heg-doos: stukken van ±1,5 m, precies passend gemaakt. */
export function hegStukken(heggen: THREE.Box3[]): THREE.Object3D | null {
  if (!kitModel('groen', 'heg') || !heggen.length) return null;
  // heggen aan de straatkant (voortuinen, z < 6) in detail; de lange heggen bij het park en achter de straat grof
  const dichtbij = heggen.filter(hegDichtbij);
  const ver = heggen.filter((b) => !dichtbij.includes(b));
  const g = new THREE.Group();
  g.name = 'heg-stukken';
  for (const [naam, lijst] of [['heg', dichtbij], ['heg-ver', ver]] as const) {
    const model = kitModel('groen', naam) ?? kitModel('groen', 'heg');
    if (model && lijst.length) g.add(hegLijst(model, lijst, naam === 'heg' ? 2.0 : 3.2));
  }
  return g;
}

function hegLijst(model: THREE.Object3D, heggen: THREE.Box3[], stuk: number): THREE.Object3D {
  const { delen, box } = onderdelen(model);
  for (const d of delen) (d.mat as THREE.MeshStandardMaterial).color?.set('#C9D6BE'); // iets dieper groen
  const ms = box.getSize(new THREE.Vector3()), mc = box.getCenter(new THREE.Vector3());
  const naarNul = new THREE.Matrix4().makeTranslation(-mc.x, -box.min.y, -mc.z);
  const plekken: THREE.Matrix4[] = [];
  for (const b of heggen) {
    const s = b.getSize(new THREE.Vector3());
    const langsZ = s.z > s.x;
    const lengte = langsZ ? s.z : s.x, dikte = langsZ ? s.x : s.z;
    const n = Math.max(1, Math.round(lengte / stuk));
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n - 0.5;
      const pos = new THREE.Vector3((b.min.x + b.max.x) / 2 + (langsZ ? 0 : t * lengte), b.min.y, (b.min.z + b.max.z) / 2 + (langsZ ? t * lengte : 0));
      // stukjes iets langer dan nodig, zodat de naden in elkaar overlopen; iets breder dan de doos (die blijft als kern)
      const sc = new THREE.Vector3((lengte / n) * 1.12 / ms.x, (s.y * 1.04) / ms.y, (dikte * 1.15) / ms.z);
      const m = new THREE.Matrix4().makeTranslation(pos.x, pos.y, pos.z)
        .multiply(new THREE.Matrix4().makeRotationY(langsZ ? Math.PI / 2 : 0) .multiply(new THREE.Matrix4().makeRotationY(i % 2 ? Math.PI : 0)))
        .multiply(new THREE.Matrix4().makeScale(sc.x, sc.y, sc.z))
        .multiply(naarNul);
      plekken.push(m);
    }
  }
  return instanties('heg', delen, plekken, { schaduw: true });
}

/** Grasplukken op de gazons (niet op paden). */
export function grasPlakken(gazons: THREE.Box3[], vrij: THREE.Box3[], heggen: THREE.Box3[] = []): THREE.Object3D | null {
  const model = kitModel('groen', 'gras-plak');
  if (!model || !gazons.length) return null;
  const { delen, box } = onderdelen(model);
  const ms = box.getSize(new THREE.Vector3()), mc = box.getCenter(new THREE.Vector3());
  const naarNul = new THREE.Matrix4().makeTranslation(-mc.x, -box.min.y, -mc.z);
  const hoogte = 0.14;
  let zaad = 99; const rnd = () => ((zaad = (zaad * 16807) % 2147483647) / 2147483647);
  const plekken: THREE.Matrix4[] = [];
  // dicht op elkaar (overlappend). Paden, plantenbakken, kliko's en fietsen: de hele pluk blijft erbuiten.
  // Heggen en de rand van het gazon: de pluk mag eronder doorlopen (de heg dekt dat af), alleen het midden moet vrij zijn.
  const stap = 0.62;
  for (const g of gazons) {
    for (let x = g.min.x + 0.15; x < g.max.x - 0.1; x += stap) for (let z = g.min.z + 0.15; z < g.max.z - 0.1; z += stap) {
      const k = 0.8 + rnd() * 0.3, doorsnede = 0.85 * k, r = doorsnede / 2;
      const px = x + (rnd() - 0.5) * 0.15, pz = z + (rnd() - 0.5) * 0.15;
      if (heggen.some((h) => px > h.min.x && px < h.max.x && pz > h.min.z && pz < h.max.z)) continue;
      if (vrij.some((p) => px > p.min.x - r && px < p.max.x + r && pz > p.min.z - r && pz < p.max.z + r)) continue;
      const m = new THREE.Matrix4().makeTranslation(px, g.max.y - 0.01, pz)
        .multiply(new THREE.Matrix4().makeRotationY(rnd() * Math.PI * 2))
        .multiply(new THREE.Matrix4().makeScale(doorsnede / ms.x, (hoogte * k) / ms.y, doorsnede / ms.z))
        .multiply(naarNul);
      plekken.push(m);
    }
  }
  // de bron is olijfgroen/droog: frisser en lichter (kleur > 1 maakt lichter)
  for (const d of delen) (d.mat as THREE.MeshStandardMaterial).color?.setRGB(1.0, 1.32, 0.82);
  return plekken.length ? instanties('gras-plakken', delen, plekken, { wind: 0.25 }) : null;
}
