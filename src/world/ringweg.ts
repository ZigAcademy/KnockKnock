import * as THREE from 'three';
import { WORLD } from '../theme';
import type { StaticBuilder } from './builder';
import { boxCollider, type Collider } from './collision';
import { lantaarnPalet } from './paletten';
import { bouwAchtergrond, type Gevel } from './achtergrond';

/**
 * Ringweg om het blok (alleen standaardversie): een 8 m brede weg in een rechthoek met ronde hoeken,
 * aangesloten op de straat aan de westkant. Langs de buitenkant staan de gebouwen op de achtergrond.
 * Hier staan ook de route voor de auto die rondjes rijdt en de buitengrens van de wereld.
 */
export const RING = { x0: -36, x1: 76, z0: -40, z1: 38, r: 10, breed: 8 } as const;
/** De straat (z 5,5–12,5, midden 9) loopt door tot de westkant van de ring. */
export const AANSLUITING = { x0: -36, x1: -14, z: 9, breed: 7 } as const;
/** Buitengrens van de wereld (onzichtbare muur, ver achter de gebouwen). */
export const GRENS = { x0: -58, x1: 98, z0: -64, z1: 62 } as const;

/**
 * Middenlijn van de ring (of een evenwijdige lijn op `verschuiving` m naar buiten) als gesloten pad,
 * gelijkmatig bemonsterd om de `stap` m. Volgorde: oost langs z1, dan west, noord, oost (tegen de klok in van boven).
 */
export function ringPad(verschuiving = 0, stap = 1): THREE.Vector3[] {
  const { x0, x1, z0, z1, r } = RING;
  const ri = r + verschuiving;
  // stukken: [type, ...] rechte lijn of boog, in volgorde rond
  const stukken: ((t: number) => THREE.Vector3)[] = [];
  const lengtes: number[] = [];
  const recht = (ax: number, az: number, bx: number, bz: number) => { stukken.push((t) => new THREE.Vector3(ax + (bx - ax) * t, 0, az + (bz - az) * t)); lengtes.push(Math.hypot(bx - ax, bz - az)); };
  const boog = (cx: number, cz: number, a0: number) => { stukken.push((t) => { const a = a0 + t * Math.PI / 2; return new THREE.Vector3(cx + Math.cos(a) * ri, 0, cz + Math.sin(a) * ri); }); lengtes.push(ri * Math.PI / 2); };
  recht(x1 - r, z1 - r + ri, x0 + r, z1 - r + ri);            // zuidkant, naar west
  boog(x0 + r, z1 - r, Math.PI / 2);
  recht(x0 + r - ri, z1 - r, x0 + r - ri, z0 + r);             // westkant, naar noord
  boog(x0 + r, z0 + r, Math.PI);
  recht(x0 + r, z0 + r - ri, x1 - r, z0 + r - ri);             // noordkant, naar oost
  boog(x1 - r, z0 + r, Math.PI * 1.5);
  recht(x1 - r + ri, z0 + r, x1 - r + ri, z1 - r);             // oostkant, naar zuid
  boog(x1 - r, z1 - r, 0);
  const totaal = lengtes.reduce((a, b) => a + b, 0);
  const n = Math.max(8, Math.round(totaal / stap));
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < n; i++) {
    let d = (i / n) * totaal, k = 0;
    while (d > lengtes[k] && k < lengtes.length - 1) { d -= lengtes[k]; k++; }
    pts.push(stukken[k](d / lengtes[k]));
  }
  return pts;
}

export function bouwRingweg(b: StaticBuilder, colliders: Collider[]): Gevel[] {
  const { x0, x1, z0, z1, r, breed } = RING;
  const h = breed / 2;
  const asfalt = (w: number, d: number, x: number, z: number) => b.box(w, 0.012, d, x, 0, z, WORLD.asphalt, { castShadow: false });
  // rechte stukken
  asfalt(x1 - x0 - 2 * r, breed, (x0 + x1) / 2, z0);
  asfalt(x1 - x0 - 2 * r, breed, (x0 + x1) / 2, z1);
  asfalt(breed, z1 - z0 - 2 * r, x0, (z0 + z1) / 2);
  asfalt(breed, z1 - z0 - 2 * r, x1, (z0 + z1) / 2);
  // bochten (kwartcirkels)
  for (const [cx, cz, a0] of [[x1 - r, z1 - r, 0], [x0 + r, z1 - r, Math.PI / 2], [x0 + r, z0 + r, Math.PI], [x1 - r, z0 + r, Math.PI * 1.5]] as const) {
    const g = new THREE.RingGeometry(r - h, r + h, 24, 1, -a0 - Math.PI / 2, Math.PI / 2).rotateX(-Math.PI / 2);
    g.translate(cx, 0.012, cz);
    b.add(g, WORLD.asphalt, { castShadow: false });
  }
  // aansluiting op de straat
  const a = AANSLUITING;
  asfalt(a.x1 - a.x0 + 0.2, a.breed, (a.x0 + a.x1) / 2, a.z);
  // stoepen langs de aansluiting (doorgetrokken straatstoepen)
  b.box(a.x1 - (a.x0 + h), 0.08, 2, (a.x1 + a.x0 + h) / 2, 0, a.z - a.breed / 2 - 1, WORLD.sidewalk);
  b.box(a.x1 - (a.x0 + h), 0.08, 2, (a.x1 + a.x0 + h) / 2, 0, a.z + a.breed / 2 + 1, WORLD.sidewalk);
  // gestreepte middenlijn langs de hele ring
  const pad = ringPad(0, 0.5);
  for (let i = 0; i < pad.length; i += 8) {
    const p = pad[i], q = pad[(i + 4) % pad.length];
    if (Math.abs(p.x - x0) < 1 && Math.abs(p.z - AANSLUITING.z) < AANSLUITING.breed / 2 + 1) continue;
    const len = p.distanceTo(q);
    const g = new THREE.BoxGeometry(len, 0.012, 0.15).rotateY(-Math.atan2(q.z - p.z, q.x - p.x)).translate((p.x + q.x) / 2, 0.013, (p.z + q.z) / 2);
    b.add(g, WORLD.roadLine, { castShadow: false });
  }
  // stoepranden binnen en buiten
  for (const kant of [-1, 1]) {
    const rand = ringPad(kant * (h + 0.1), 1);
    for (let i = 0; i < rand.length; i++) {
      const p = rand[i], q = rand[(i + 1) % rand.length];
      // geen rand waar de straat aansluit
      const mx = (p.x + q.x) / 2, mz = (p.z + q.z) / 2;
      if (kant > 0 && Math.abs(mx - x0) < h + 1 && Math.abs(mz - a.z) < a.breed / 2 + 2.2) continue;
      const len = p.distanceTo(q);
      if (len < 0.01) continue;
      const g = new THREE.BoxGeometry(len + 0.05, 0.12, 0.2).rotateY(-Math.atan2(q.z - p.z, q.x - p.x)).translate(mx, 0.06, mz);
      b.add(g, WORLD.kerb, { castShadow: false });
    }
  }
  // lantaarns aan de binnenkant, om de 22 m
  const lampen = ringPad(-(h + 0.9), 22);
  for (const p of lampen) {
    if (!b.model('straat', 'lantaarn', { x: p.x, y: 0, z: p.z, h: 4.6, rotY: Math.atan2(-(p.x - (x0 + x1) / 2), -(p.z - (z0 + z1) / 2)) }, lantaarnPalet)) {
      b.add(new THREE.CylinderGeometry(0.07, 0.09, 4.5, 6).translate(p.x, 2.25, p.z), WORLD.roofEdge);
    }
    colliders.push(boxCollider(p.x - 0.2, p.x + 0.2, p.z - 0.2, p.z + 0.2, 4.5, false));
  }
  const gevels = bouwAchtergrond(b, colliders);
  // onzichtbare buitengrens van de wereld
  const g = GRENS;
  colliders.push(boxCollider(g.x0 - 1, g.x1 + 1, g.z0 - 1, g.z0, 3, false));
  colliders.push(boxCollider(g.x0 - 1, g.x1 + 1, g.z1, g.z1 + 1, 3, false));
  colliders.push(boxCollider(g.x0 - 1, g.x0, g.z0, g.z1, 3, false));
  colliders.push(boxCollider(g.x1, g.x1 + 1, g.z0, g.z1, 3, false));
  return gevels;
}

/**
 * Route voor de auto die rondjes rijdt (rechts rijden): de straat in (oostwaarts, z 9,85), keren bij het
 * kantoor, terug (westwaarts, z 7,3), rechtsaf de ring op (binnenbaan), het hele blok rond en via de
 * westkant weer de straat in. Een gesloten, gladde kromme.
 */
export function rondjeRoute(): THREE.CatmullRomCurve3 {
  const baan = 1.8;
  const xw = RING.x0 + baan;   // binnenbaan aan de westkant
  const pts: THREE.Vector3[] = [];
  for (let x = xw + 6; x <= 36; x += 6) pts.push(new THREE.Vector3(x, 0, 9.85));
  // keren voor het kantoor
  const cz = (9.85 + 7.3) / 2, r = (9.85 - 7.3) / 2;
  for (let a = 0; a <= Math.PI; a += Math.PI / 6) pts.push(new THREE.Vector3(37.5 + Math.sin(a) * r, 0, cz + Math.cos(a) * r));
  for (let x = 34; x >= xw + 6; x -= 6) pts.push(new THREE.Vector3(x, 0, 7.3));
  // rechtsaf de ring op, richting noord
  pts.push(new THREE.Vector3(xw + 1.5, 0, 5.2));
  // ring (binnenbaan) vanaf de westkant net ten noorden van de straat, helemaal rond tot net ten zuiden ervan
  const ring = ringPad(-baan, 4);
  // ringPad begint aan de zuidkant; zoek het punt op de westkant net boven z 3 (richting noord)
  let start = ring.findIndex((p, i) => i > 0 && Math.abs(p.x - xw) < 0.5 && p.z < 3 && ring[i - 1].z >= 3);
  if (start < 0) start = 0;
  for (let k = 0; k < ring.length; k++) {
    const p = ring[(start + k) % ring.length];
    // stop als we van het zuiden terug bij de straat zijn
    if (k > 10 && Math.abs(p.x - xw) < 0.5 && p.z < 16 && p.z > 3) break;
    pts.push(p);
  }
  // rechtsaf de straat weer in
  pts.push(new THREE.Vector3(xw + 1.5, 0, 12.2));
  return new THREE.CatmullRomCurve3(pts, true, 'centripetal');
}
