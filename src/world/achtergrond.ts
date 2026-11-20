import * as THREE from 'three';
import { WORLD } from '../theme';
import type { StaticBuilder } from './builder';
import { boxCollider, type Collider } from './collision';
import { RING } from './ringweg';

/**
 * Gebouwen langs de buitenkant van de ringweg (standaardversie), net zo afgewerkt als de straat:
 * bakstenen gevels (baksteendetail), dakpannen op schuine daken (dakdetail), witte kozijnen met
 * donker glas, voordeuren met stoepje, een plint en een lijst tussen de verdiepingen.
 * Rijtjeshuizen langs de lange kanten, flats op de hoeken en aan de korte kanten.
 * Alles wordt in de StaticBuilder ingebakken: geen extra draw calls.
 */

const W = 6, D = 8, H = 5.6;

/** Lokaal (gevel naar +z, midden onderaan op 0,0,0) → wereld. */
type Zet = (g: THREE.BufferGeometry, kleur: string, schaduw?: boolean) => void;

function rijtje(zet: Zet, n: number, k: number): number {
  const breed = n * W;
  for (let i = 0; i < n; i++) {
    const cx = -breed / 2 + W / 2 + i * W;
    const steen = WORLD.bricks[(i + k) % WORLD.bricks.length];
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, c: string) => zet(new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z), c);
    box(W, H, D, cx, 0, -D / 2, steen);
    box(W, 0.35, 0.08, cx, 0, 0.04, WORLD.roofEdge);
    box(W, 0.12, 0.1, cx, 2.95, 0.05, WORLD.frame);
    // dak
    const shape = new THREE.Shape();
    shape.moveTo(-D - 0.35, 0); shape.lineTo(0.35, 0); shape.lineTo(-D / 2, 2.8); shape.closePath();
    const dak = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(cx + W / 2, H, 0);
    zet(dak, (i + k) % 2 ? WORLD.roof : WORLD.roofAlt);
    if ((i + k) % 2 === 0) box(0.7, 1.6, 0.7, cx - 1.6, H + 1.4, -5.2, steen);
    // deur (links of rechts, om en om gespiegeld)
    const spiegel = i % 2 ? -1 : 1, dx = cx + spiegel * 1.6;
    box(1.3, 2.4, 0.1, dx, 0, 0.05, WORLD.frame);
    box(1.0, 2.15, 0.12, dx, 0.05, 0.06, WORLD.doors[(i + k * 3) % WORLD.doors.length]);
    box(1.6, 0.14, 0.7, dx, 0, 0.35, WORLD.kerb);
    // ramen: groot raam beneden, twee boven
    const raam = (w: number, h: number, x: number, y: number) => {
      box(w, h, 0.08, x, y, 0.04, WORLD.frame);
      box(w - 0.16, h - 0.16, 0.1, x, y + 0.08, 0.05, '#2F3A47');
      box(0.06, h - 0.16, 0.12, x, y + 0.08, 0.06, WORLD.frame);
      box(w + 0.15, 0.08, 0.2, x, y - 0.06, 0.1, WORLD.frame);
    };
    raam(2.6, 1.6, cx - spiegel * 1.1, 0.75);
    raam(1.4, 1.3, cx - spiegel * 1.6, 3.5);
    raam(1.4, 1.3, cx + spiegel * 1.4, 3.5);
  }
  return breed;
}

function flat(zet: Zet, breed: number, lagen: number, k: number): void {
  const h = lagen * 2.9 + 0.8, diep = 11;
  const gevel = k % 2 ? WORLD.bricks[k % WORLD.bricks.length] : '#B9AE9C';
  const box = (w: number, hh: number, d: number, x: number, y: number, z: number, c: string) => zet(new THREE.BoxGeometry(w, hh, d).translate(x, y + hh / 2, z), c);
  box(breed, h, diep, 0, 0, -diep / 2, gevel);
  box(breed + 0.3, 0.45, diep + 0.3, 0, h, -diep / 2, WORLD.roofEdge);
  box(breed + 0.05, 0.6, diep + 0.05, 0, 0, -diep / 2, '#5A5550');
  box(2.2, 2.6, 0.1, 0, 0, 0.05, WORLD.frame);
  box(1.9, 2.4, 0.12, 0, 0.05, 0.06, '#2F3A47');
  const kol = Math.floor(breed / 2.6);
  for (let v = 0; v < lagen; v++) {
    const y = 0.9 + v * 2.9;
    for (let c = 0; c < kol; c++) {
      const x = -breed / 2 + 1.3 + c * (breed - 2.6) / Math.max(1, kol - 1);
      if (v === 0 && Math.abs(x) < 1.6) continue;
      for (const z of [0.04, -diep - 0.04]) {
        box(1.4, 1.55, 0.08, x, y, z, WORLD.frame);
        box(1.22, 1.38, 0.1, x, y + 0.08, z, '#2F3A47');
        box(0.06, 1.38, 0.12, x, y + 0.08, z, WORLD.frame);
      }
      if (v > 0 && (c + v) % 2 === 0) {
        box(2.2, 0.16, 1.1, x, y - 0.25, 0.55, '#B9B4AA');
        box(2.2, 0.9, 0.05, x, y - 0.09, 1.08, '#5E646B');
      }
    }
  }
}

/** Een gebouw langs de ring: midden van de gevel op straatniveau, richting van de gevel (naar de weg), lengte, soort. */
export interface Gevel { x: number; z: number; ry: number; lengte: number; soort: 'rij' | 'flat' }

export function bouwAchtergrond(b: StaticBuilder, colliders: Collider[]): Gevel[] {
  const gevels: Gevel[] = [];
  const { x0, x1, z0, z1, breed } = RING;
  const afstand = breed / 2 + 2 + 3.5; // stoep + voortuin tussen weg en gevel
  /** Plaats een gebouw: gevel naar de weg. `as`: 'n','z','w','o' (noord/zuid/west/oost-kant van de ring). */
  const plaats = (as: 'n' | 'z' | 'w' | 'o', t: number, bouw: (zet: Zet) => number, diep: number) => {
    const ry = as === 'n' ? 0 : as === 'z' ? Math.PI : as === 'w' ? Math.PI / 2 : -Math.PI / 2;
    const x = as === 'w' ? x0 - afstand : as === 'o' ? x1 + afstand : t;
    const z = as === 'n' ? z0 - afstand : as === 'z' ? z1 + afstand : t;
    const m = new THREE.Matrix4().makeTranslation(x, 0, z).multiply(new THREE.Matrix4().makeRotationY(ry));
    const zet: Zet = (g, kleur) => { g.applyMatrix4(m); b.add(g, kleur, { castShadow: false }); };
    const lengte = bouw(zet);
    gevels.push({ x, z, ry, lengte, soort: diep === D ? 'rij' : 'flat' });
    // botsing: de hele gevelstrook
    const hx = as === 'n' || as === 'z' ? lengte / 2 : diep / 2, hz = as === 'n' || as === 'z' ? diep / 2 : lengte / 2;
    const cx = as === 'w' ? x - diep / 2 : as === 'o' ? x + diep / 2 : x;
    const cz = as === 'n' ? z - diep / 2 : as === 'z' ? z + diep / 2 : z;
    colliders.push(boxCollider(cx - hx, cx + hx, cz - hz, cz + hz, 6));
    // stoep en voortuin langs de gevel
    const sw = new THREE.BoxGeometry(lengte + 2, 0.08, 2).translate(0, 0.04, afstand - breed / 2 - 1);
    zet(sw, WORLD.sidewalk);
    const tuin = new THREE.BoxGeometry(lengte, 0.06, 3.3).translate(0, 0.03, 1.75);
    zet(tuin, WORLD.grassDark);
    const heg = new THREE.BoxGeometry(lengte, 0.8, 0.45).translate(0, 0.4, 3.3);
    zet(heg, WORLD.hedge);
  };
  let k = 0;
  // noordkant: twee rijtjes van 5 en een flat in het midden
  plaats('n', x0 + 22, (z) => rijtje(z, 5, k++), D);
  plaats('n', (x0 + x1) / 2 + 4, (z) => { flat(z, 18, 5, k++); return 18; }, 11);
  plaats('n', x1 - 22, (z) => rijtje(z, 5, k++), D);
  // zuidkant
  plaats('z', x0 + 26, (z) => rijtje(z, 6, k++), D);
  plaats('z', x1 - 26, (z) => rijtje(z, 6, k++), D);
  // westkant (de straat sluit aan op z 9: daar blijft het vrij)
  plaats('w', z0 + 18, (z) => { flat(z, 16, 4, k++); return 16; }, 11);
  plaats('w', z1 - 12, (z) => rijtje(z, 3, k++), D);
  // oostkant (achter het kantoor)
  plaats('o', z0 + 20, (z) => rijtje(z, 5, k++), D);
  plaats('o', z1 - 20, (z) => { flat(z, 20, 5, k++); return 20; }, 11);
  return gevels;
}
