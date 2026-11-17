import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/**
 * Laadt de geoptimaliseerde modellen (public/assets/modellen, zie tools/modellen.mjs).
 * Alles is optioneel: ontbreekt een bestand, dan blijft het leeg en vallen
 * personages en decor terug op de figuren uit primitieven.
 */

export const OUTFITS = ['man-casual', 'man-hoodie', 'man-suit', 'vrouw-casual', 'vrouw-formal', 'vrouw-suit'] as const;
export type Outfit = typeof OUTFITS[number];
/** Losse hoofden (kapsels), passend op elk lichaam. */
export const KAPSELS = ['man-krul', 'man-kort', 'man-scheiding', 'man-lang', 'man-golf', 'vrouw-bob', 'vrouw-opgestoken', 'vrouw-pixie', 'vrouw-staart', 'vrouw-kort'] as const;
export type Kapsel = typeof KAPSELS[number];
export const KITS = ['autos', 'straat', 'natuur', 'meubels', 'eten', 'gebouwen'] as const;
export type KitNaam = typeof KITS[number];

interface Register {
  personages: Map<string, GLTF>;
  hoofden: Map<string, GLTF>;
  clips: Map<string, THREE.AnimationClip>;
  kits: Map<KitNaam, Map<string, THREE.Object3D>>;
  dieren: Map<string, GLTF>;
}

export const MODELLEN: Register = { personages: new Map(), hoofden: new Map(), clips: new Map(), kits: new Map(), dieren: new Map() };

const url = (rel: string) => new URL(`assets/modellen/${rel}`, document.baseURI).href;

/** Laadt alles parallel; meldt de voortgang (0–1). Faalt nooit. */
export async function laadModellen(voortgang: (f: number) => void = () => {}): Promise<void> {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const taken: [string, (g: GLTF) => void][] = [
    ...OUTFITS.map((o): [string, (g: GLTF) => void] => [`personages/${o}.glb`, (g) => MODELLEN.personages.set(o, g)]),
    ...KAPSELS.map((k): [string, (g: GLTF) => void] => [`personages/hoofd-${k}.glb`, (g) => MODELLEN.hoofden.set(k, g)]),
    ['personages/anim.glb', (g) => g.animations.forEach((c) => MODELLEN.clips.set(c.name, c))],
    ['dieren/hond.glb', (g) => MODELLEN.dieren.set('hond', g)],
    ...KITS.map((k): [string, (g: GLTF) => void] => [`${k}.glb`, (g) => {
      const m = new Map<string, THREE.Object3D>();
      for (const c of g.scene.children) m.set(c.name, c);
      MODELLEN.kits.set(k, m);
    }]),
  ];
  let klaar = 0;
  voortgang(0);
  await Promise.all(taken.map(async ([rel, zet]) => {
    try { zet(await loader.loadAsync(url(rel))); }
    catch (e) { console.warn(`Model niet geladen (terugval actief): ${rel}`, e); }
    klaar++;
    voortgang(klaar / taken.length);
  }));
}

export const heeftPersonages = () => MODELLEN.personages.size > 0 && MODELLEN.clips.has('Idle');

/** Origineel model uit een kit (niet aanpassen; gebruik kitKopie of bak het in). */
export function kitModel(kit: KitNaam, naam: string): THREE.Object3D | null {
  return MODELLEN.kits.get(kit)?.get(naam) ?? null;
}

const bboxCache = new WeakMap<THREE.Object3D, THREE.Box3>();
/** Omhullende doos van een kitmodel in zijn eigen assenstelsel. */
export function kitBox(o: THREE.Object3D): THREE.Box3 {
  let b = bboxCache.get(o);
  if (!b) {
    const parent = o.parent;
    const m = o.matrix.clone();
    o.removeFromParent();
    o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
    o.updateMatrixWorld(true);
    b = new THREE.Box3().setFromObject(o);
    m.decompose(o.position, o.quaternion, o.scale);
    parent?.add(o);
    bboxCache.set(o, b);
  }
  return b;
}

export interface Plaatsing {
  x: number; y?: number; z: number;
  rotY?: number;
  /** Doelmaat (uniform geschaald): breedte (x), hoogte (y), diepte (z) of grootste maat. */
  w?: number; h?: number; d?: number; max?: number;
  /** Losse schaal (als er geen doelmaat is). */
  s?: number;
  /** Niet-uniform passen in precies deze maat [b, h, d]. */
  fit?: [number, number, number];
}

/**
 * Matrix die een kitmodel op de grond zet (onderkant y, midden x/z), geschaald naar
 * de doelmaat en gedraaid om y.
 */
export function plaatsMatrix(o: THREE.Object3D, p: Plaatsing): THREE.Matrix4 {
  const box = kitBox(o);
  const size = box.getSize(new THREE.Vector3());
  let s = p.s ?? 1;
  if (p.h) s = p.h / size.y;
  else if (p.w) s = p.w / size.x;
  else if (p.d) s = p.d / size.z;
  else if (p.max) s = p.max / Math.max(size.x, size.y, size.z);
  const c = box.getCenter(new THREE.Vector3());
  const m = new THREE.Matrix4().makeTranslation(-c.x, -box.min.y, -c.z);
  if (p.fit) m.premultiply(new THREE.Matrix4().makeScale(p.fit[0] / Math.max(size.x, 1e-4), p.fit[1] / Math.max(size.y, 1e-4), p.fit[2] / Math.max(size.z, 1e-4)));
  else m.premultiply(new THREE.Matrix4().makeScale(s, s, s));
  m.premultiply(new THREE.Matrix4().makeRotationY(p.rotY ?? 0));
  m.premultiply(new THREE.Matrix4().makeTranslation(p.x, p.y ?? 0, p.z));
  return m;
}

/** Afmetingen van een kitmodel na plaatsing (handig voor botsing). */
export function geplaatsteMaat(o: THREE.Object3D, p: Plaatsing): THREE.Vector3 {
  const size = kitBox(o).getSize(new THREE.Vector3());
  if (p.fit) return new THREE.Vector3(...p.fit);
  let s = p.s ?? 1;
  if (p.h) s = p.h / size.y; else if (p.w) s = p.w / size.x; else if (p.d) s = p.d / size.z;
  else if (p.max) s = p.max / Math.max(size.x, size.y, size.z);
  return size.multiplyScalar(s);
}

/** Kleur per materiaalnaam; geef null om het materiaal over te slaan. */
export type Palet = (materiaal: string, kleur: THREE.Color) => THREE.ColorRepresentation | null | undefined;

/**
 * Zet een (kit)model om naar losse geometrieën in wereldruimte met alleen
 * position/normal/color (float), klaar om samen te voegen.
 */
export function bakGeometrie(o: THREE.Object3D, matrix: THREE.Matrix4, palet?: Palet): THREE.BufferGeometry[] {
  const uit: THREE.BufferGeometry[] = [];
  const parent = o.parent;
  const orig = o.matrix.clone();
  o.removeFromParent();
  o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
  o.updateMatrixWorld(true);
  const tmp = new THREE.Color();
  const v = new THREE.Vector3();
  o.traverse((n) => {
    const mesh = n as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const src = mesh.geometry;
    const world = new THREE.Matrix4().multiplyMatrices(matrix, mesh.matrixWorld);
    const groups = src.groups.length ? src.groups : [{ start: 0, count: src.index ? src.index.count : src.getAttribute('position').count, materialIndex: 0 }];
    const pos = src.getAttribute('position');
    const col = src.getAttribute('color');
    for (const g of groups) {
      const mat = mats[g.materialIndex ?? 0] as THREE.MeshStandardMaterial;
      const basis = mat?.color ? mat.color.clone() : new THREE.Color(1, 1, 1);
      const gekozen = palet?.(mat?.name ?? '', basis);
      if (gekozen === null) continue;
      if (gekozen !== undefined) basis.set(gekozen);
      const n = g.count;
      const P = new Float32Array(n * 3), C = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const idx = src.index ? src.index.getX(g.start + i) : g.start + i;
        v.fromBufferAttribute(pos, idx).applyMatrix4(world);
        P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z;
        tmp.copy(basis);
        if (col && gekozen === undefined) tmp.multiply(new THREE.Color(col.getX(idx), col.getY(idx), col.getZ(idx)));
        C[i * 3] = tmp.r; C[i * 3 + 1] = tmp.g; C[i * 3 + 2] = tmp.b;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
      geo.computeVertexNormals();
      uit.push(geo);
    }
  });
  orig.decompose(o.position, o.quaternion, o.scale);
  parent?.add(o);
  return uit;
}

/**
 * Losse kopie van een kitmodel als één mesh (één draw call), met vertexkleuren.
 * Handig voor bewegende objecten (een rijdende auto) en hotspot-decor.
 */
export function kitMesh(kit: KitNaam, naam: string, p: Omit<Plaatsing, 'x' | 'z'> & { x?: number; z?: number }, palet?: Palet, material?: THREE.Material): THREE.Mesh | null {
  const o = kitModel(kit, naam);
  if (!o) return null;
  const geos = bakGeometrie(o, plaatsMatrix(o, { x: 0, z: 0, ...p, rotY: 0 }), palet);
  if (!geos.length) return null;
  const merged = geos.length === 1 ? geos[0] : mergeGeos(geos);
  const m = new THREE.Mesh(merged, material ?? vertexMat());
  m.position.set(p.x ?? 0, 0, p.z ?? 0);
  m.rotation.y = p.rotY ?? 0;
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

let _vm: THREE.MeshStandardMaterial | null = null;
export function vertexMat(): THREE.MeshStandardMaterial {
  return _vm ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, flatShading: true });
}

function mergeGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let n = 0;
  for (const g of geos) n += g.getAttribute('position').count;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 3);
  let o = 0;
  for (const g of geos) {
    P.set(g.getAttribute('position').array as Float32Array, o);
    N.set(g.getAttribute('normal').array as Float32Array, o);
    C.set(g.getAttribute('color').array as Float32Array, o);
    o += g.getAttribute('position').count * 3;
    g.dispose();
  }
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', new THREE.BufferAttribute(P, 3));
  r.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  r.setAttribute('color', new THREE.BufferAttribute(C, 3));
  return r;
}

// ---------- kleurhulpjes ----------

/** Vertexkleuren van een geometrie dempen (minder verzadigd). */
export function dempVertex(geo: THREE.BufferGeometry, sat = 0.6): void {
  const col = geo.getAttribute('color') as THREE.BufferAttribute | undefined;
  if (!col) return;
  const c = new THREE.Color(), hsl = { h: 0, s: 0, l: 0 };
  for (let i = 0; i < col.count; i++) {
    c.setRGB(col.getX(i), col.getY(i), col.getZ(i)).getHSL(hsl);
    c.setHSL(hsl.h, hsl.s * sat, hsl.l);
    col.setXYZ(i, c.r, c.g, c.b);
  }
}

/** Kleur dempen: minder verzadiging, iets naar grijs-beige. */
export function demp(c: THREE.ColorRepresentation, sat = 0.55, licht = 0): THREE.Color {
  const col = new THREE.Color(c);
  const hsl = { h: 0, s: 0, l: 0 };
  col.getHSL(hsl);
  return col.setHSL(hsl.h, hsl.s * sat, Math.min(1, Math.max(0, hsl.l + licht)));
}
