import * as THREE from 'three';
import type { StaticBuilder } from './builder';
import { boxCollider, type Collider } from './collision';
import { natuurPalet, lantaarnPalet, klikoPalet, prullenbakPalet, deurmatPalet, gebouwPalet, herkleurLak } from './paletten';
import { WORLD } from '../theme';

/**
 * Decor voor de Lindelaan (fase 4b): Nederlandse details per woning, straatmeubilair,
 * een speeltuintje, geparkeerde auto's en gebouwen op de achtergrond.
 * Alles statisch en samengevoegd in de StaticBuilder (geen extra draw calls).
 * Ontbreekt een model, dan wordt het overgeslagen of vervangen door primitieven.
 */

export interface DecorCtx {
  b: StaticBuilder;
  colliders: Collider[];
  houseX: (i: number) => number;
  aantal: number;
  doorOffset: number;
  gardenDepth: number;
  houseDepth: number;
  wallHeight: number;
}

const rot = (y: number) => new THREE.Matrix4().makeRotationY(y);
const at = (x: number, y: number, z: number, ry = 0) => new THREE.Matrix4().makeTranslation(x, y, z).multiply(rot(ry));

/** Per woning (index 0 = nr 14) welke details er staan. Variatie, geen inhoud. */
export const WONING_DETAILS: { klikos: number; fiets?: boolean; bloembak?: boolean; dakkapel?: boolean; hekje?: boolean; mat?: string; leeg?: boolean; potten?: boolean }[] = [
  { klikos: 2, bloembak: true, mat: '#6B5443' },
  { klikos: 1, fiets: true, dakkapel: true, mat: '#4F5A54' },
  { klikos: 1, bloembak: true, hekje: true, mat: '#5E5148', potten: true },
  { klikos: 2, dakkapel: true, mat: '#6B5443' },
  { klikos: 1, fiets: true, hekje: true, mat: '#57524C', potten: true },
  { klikos: 1, dakkapel: true, bloembak: true, mat: '#4F5A54' },
  { klikos: 0, leeg: true },
];

export function bouwStraatDecor(ctx: DecorCtx): void {
  woningDetails(ctx);
  straatMeubilair(ctx);
  speeltuin(ctx);
  groen(ctx);
  geparkeerdeAutos(ctx);
  achtergrond(ctx);
  zebrapad(ctx);
}

// ---------------------------------------------------------------- woningen

function woningDetails(ctx: DecorCtx): void {
  const { b, colliders } = ctx;
  for (let i = 0; i < ctx.aantal; i++) {
    const d = WONING_DETAILS[i] ?? { klikos: 1 };
    const cx = ctx.houseX(i), dx = cx + ctx.doorOffset;

    // kliko's rechts van de deur, tegen de gevel
    for (let k = 0; k < d.klikos; k++) {
      const z = 1.15 + k * 0.8;
      const grijs = k === 1;
      const ok = b.model('straat', 'kliko', { x: cx + 2.47, y: 0.07, z, h: 1.05, rotY: Math.PI + (k ? 0.1 : -0.05) },
        klikoPalet(grijs ? '#596069' : '#4E6247', grijs ? '#596069' : '#4E6247'));
      if (!ok) b.box(0.55, 1.0, 0.7, cx + 2.47, 0.07, z, grijs ? '#596069' : '#4E6247');
      colliders.push(boxCollider(cx + 2.15, cx + 2.8, z - 0.4, z + 0.4, 1.05, false));
    }
    // deurmat op het stoepje
    if (d.mat && !b.model('straat', 'deurmat', { x: dx, y: 0.141, z: 0.42, w: 0.9 }, deurmatPalet(d.mat), { castShadow: false })) {
      b.box(0.9, 0.012, 0.5, dx, 0.14, 0.42, d.mat, { castShadow: false });
    }
    // bloembak onder het grote raam
    if (d.bloembak) {
      b.box(2.0, 0.42, 0.42, cx - 1.2, 0.07, 0.38, '#7A6656');
      b.box(1.9, 0.04, 0.34, cx - 1.2, 0.47, 0.38, '#5A4A3E', { castShadow: false });
      const bloemen = ['bloem-rood', 'bloem-geel', 'bloem-paars', 'struik'];
      for (let k = 0; k < 6; k++) {
        b.model('natuur', bloemen[(k + i) % bloemen.length], { x: cx - 2.0 + k * 0.32, y: 0.48, z: 0.38 + ((k % 2) - 0.5) * 0.1, h: 0.32 + (k % 3) * 0.05, rotY: k * 1.3 }, natuurPalet('#6F8F5A'));
      }
      colliders.push(boxCollider(cx - 2.25, cx - 0.15, 0.15, 0.62, 0.5, false));
    }
    // potten met een struikje naast het pad
    if (d.potten) {
      for (const [px, pz] of [[dx - 0.95, 2.6], [dx - 0.95, 1.6]]) {
        b.model('natuur', 'pot-groot', { x: px, y: 0.07, z: pz, w: 0.5 }, natuurPalet()) ?? b.box(0.45, 0.35, 0.45, px, 0.07, pz, '#8B6E5A');
        b.model('natuur', 'struik-detail', { x: px, y: 0.25, z: pz, w: 0.55 }, natuurPalet('#6F8F5A'));
        colliders.push(boxCollider(px - 0.28, px + 0.28, pz - 0.28, pz + 0.28, 0.6, false));
      }
    }
    // fiets in de voortuin, tegen de gevel
    if (d.fiets) {
      fiets(b, cx - 2.0, 0.07, 1.25, 0.15, i % 2 ? '#4C4F63' : '#5F6B58');
      colliders.push(boxCollider(cx - 2.95, cx - 1.05, 0.95, 1.55, 1.0, false));
    }
    // dakkapel op het voordakvlak
    if (d.dakkapel) dakkapel(b, cx + 0.3, ctx.wallHeight, WORLD.bricks[i % WORLD.bricks.length]);
    // lege woning (nr 26): wat hoog gras, geen mat
    if (d.leeg) {
      for (let k = 0; k < 9; k++) b.model('natuur', 'gras', { x: cx - 2.5 + (k % 3) * 0.8 + (k % 2) * 0.2, y: 0.07, z: 0.7 + Math.floor(k / 3) * 0.8, h: 0.35, rotY: k }, natuurPalet(), { castShadow: false });
    }
  }
}

/** Fiets uit primitieven (er zit geen fiets in de packs). Oorsprong: grond, langs x. */
export function fiets(b: StaticBuilder, x: number, y: number, z: number, ry: number, kleur: string): void {
  const m = at(x, y, z, ry);
  const add = (g: THREE.BufferGeometry, c: string) => b.addAt(g, c, m.clone());
  for (const wx of [-0.52, 0.52]) {
    add(new THREE.TorusGeometry(0.33, 0.035, 5, 14).translate(wx, 0.36, 0), '#2B2D31');
    add(new THREE.CylinderGeometry(0.04, 0.04, 0.05, 6).rotateX(Math.PI / 2).translate(wx, 0.36, 0), '#8A8F96');
  }
  const buis = (x1: number, y1: number, x2: number, y2: number, c = kleur) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const g = new THREE.BoxGeometry(len, 0.045, 0.045).rotateZ(Math.atan2(y2 - y1, x2 - x1)).translate((x1 + x2) / 2, (y1 + y2) / 2, 0);
    add(g, c);
  };
  buis(-0.52, 0.36, -0.05, 0.4); buis(-0.05, 0.4, 0.38, 0.78); buis(-0.05, 0.4, -0.12, 0.8);
  buis(-0.12, 0.8, 0.38, 0.78); buis(0.38, 0.78, 0.52, 0.36); buis(-0.52, 0.36, -0.12, 0.8);
  add(new THREE.BoxGeometry(0.22, 0.05, 0.1).translate(-0.14, 0.86, 0), '#2B2D31');
  add(new THREE.BoxGeometry(0.05, 0.05, 0.5).translate(0.4, 0.92, 0), '#2B2D31');
  add(new THREE.BoxGeometry(0.3, 0.03, 0.18).translate(-0.48, 0.72, 0), '#3A3D42');
}

function dakkapel(b: StaticBuilder, x: number, H: number, muur: string): void {
  // voordakvlak loopt van (z 0.35, y H) naar (z -4, y H + 2.8)
  const zf = -1.35, yv = H + (0.35 - zf) * (2.8 / 4.35);
  b.box(2.4, 1.35, 2.2, x, yv - 0.55, zf - 1.1, muur);
  b.box(2.6, 0.14, 2.5, x, yv + 0.8, zf - 1.15, WORLD.roofEdge);
  b.box(2.0, 0.95, 0.06, x, yv - 0.35, zf + 0.01, WORLD.frame);
  b.box(1.8, 0.8, 0.08, x, yv - 0.28, zf + 0.02, WORLD.glass);
  b.box(0.06, 0.8, 0.1, x, yv - 0.28, zf + 0.03, WORLD.frame);
}

// ---------------------------------------------------------------- straatmeubilair

/** Nederlands bankje: houten latten op betonnen poten. */
export function bankje(b: StaticBuilder, x: number, z: number, ry: number): void {
  const m = at(x, 0.08, z, ry);
  for (const px of [-0.7, 0.7]) b.addAt(new THREE.BoxGeometry(0.12, 0.42, 0.5).translate(px, 0.21, 0), '#9C978E', m.clone());
  for (let k = 0; k < 3; k++) b.addAt(new THREE.BoxGeometry(1.7, 0.05, 0.12).translate(0, 0.45, -0.17 + k * 0.15), '#8A6E55', m.clone());
  for (let k = 0; k < 2; k++) b.addAt(new THREE.BoxGeometry(1.7, 0.1, 0.04).translate(0, 0.62 + k * 0.15, -0.25), '#8A6E55', m.clone());
  for (const px of [-0.7, 0.7]) b.addAt(new THREE.BoxGeometry(0.06, 0.35, 0.05).translate(px, 0.6, -0.25), '#6B6E73', m.clone());
}

function nietje(b: StaticBuilder, x: number, z: number): void {
  const g = new THREE.TorusGeometry(0.35, 0.03, 4, 10, Math.PI);
  b.addAt(g, '#7D838A', at(x, 0.08, z, Math.PI / 2));
  b.addAt(new THREE.BoxGeometry(0.06, 0.02, 0.06).translate(0, 0.01, 0.35), '#7D838A', at(x, 0.08, z));
}

function straatMeubilair(ctx: DecorCtx): void {
  const { b, colliders } = ctx;
  // bankjes + prullenbak op de stoep aan de overkant (kijken naar de huizen)
  for (const [x, z] of [[-7, 14.15], [23, 14.15]]) {
    bankje(b, x, z, Math.PI);
    colliders.push(boxCollider(x - 0.9, x + 0.9, z - 0.3, z + 0.3, 0.8, false));
    const px = x + 1.25;
    if (!b.model('straat', 'prullenbak', { x: px, y: 0.08, z, h: 0.85 }, prullenbakPalet)) b.add(new THREE.CylinderGeometry(0.25, 0.25, 0.85, 8).translate(px, 0.5, z), '#4D5A50');
    colliders.push(boxCollider(px - 0.28, px + 0.28, z - 0.28, z + 0.28, 0.9, false));
  }
  // fietsnietjes naast de stalling
  for (let k = 0; k < 4; k++) nietje(b, 17.6 + k * 0.8, 14.05);
  colliders.push(boxCollider(17.2, 20.4, 13.7, 14.4, 0.8, false));
  // twee grote plantenbakken bij het plein voor het kantoor
  for (const z of [4.4, 13.6]) {
    const x = 40.5;
    b.box(1.4, 0.55, 1.4, x, 0.08, z, '#8F8A82');
    b.box(1.25, 0.04, 1.25, x, 0.63, z, '#5A4A3E', { castShadow: false });
    b.model('natuur', 'struik-groot', { x, y: 0.62, z, w: 1.1, rotY: z }, natuurPalet('#66855A'));
    for (const [fx, fz] of [[-0.4, -0.4], [0.4, 0.35], [-0.35, 0.4]]) b.model('natuur', 'bloem-geel', { x: x + fx, y: 0.62, z: z + fz, h: 0.3 }, natuurPalet());
    colliders.push(boxCollider(x - 0.75, x + 0.75, z - 0.75, z + 0.75, 1, false));
  }
}

// ---------------------------------------------------------------- speeltuin en groen

function speeltuin(ctx: DecorCtx): void {
  const { b, colliders } = ctx;
  const x0 = 21, x1 = 32, z0 = 16.6, z1 = 21.6;
  // zachte ondergrond
  b.box(x1 - x0, 0.02, z1 - z0, (x0 + x1) / 2, 0, (z0 + z1) / 2, '#A99B86', { castShadow: false });
  // laag hekje rondom, met een opening aan de stoepkant
  const hek = (ax: number, az: number, bx: number, bz: number) => {
    const len = Math.hypot(bx - ax, bz - az), ry = Math.atan2(-(bz - az), bx - ax);
    const n = Math.max(1, Math.round(len / 1.0));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      if (!b.model('natuur', 'hek', { x, z, w: len / n, rotY: ry }, natuurPalet())) b.box(len / n, 0.6, 0.06, x, 0, z, '#7E6249', { rotY: ry });
    }
    colliders.push(boxCollider(Math.min(ax, bx) - 0.1, Math.max(ax, bx) + 0.1, Math.min(az, bz) - 0.1, Math.max(az, bz) + 0.1, 0.6, false));
  };
  hek(x0, z0, 25.5, z0); hek(27.5, z0, x1, z0);
  hek(x0, z1, x1, z1); hek(x0, z0, x0, z1); hek(x1, z0, x1, z1);
  // schommel
  const sx = 24, sz = 20.0, paal = '#6B7684';
  for (const px of [-1.3, 1.3]) for (const dz of [-0.45, 0.45]) {
    const g = new THREE.BoxGeometry(0.09, 2.3, 0.09).rotateX(dz > 0 ? -0.2 : 0.2).translate(px, 1.12, dz * 0.5);
    b.addAt(g, paal, at(sx, 0, sz));
  }
  b.box(2.8, 0.1, 0.1, sx, 2.2, sz, paal);
  for (const px of [-0.6, 0.6]) {
    for (const dx of [-0.2, 0.2]) b.box(0.02, 1.7, 0.02, sx + px + dx, 0.5, sz, '#2E3033');
    b.box(0.5, 0.05, 0.22, sx + px, 0.48, sz, '#3E5A6B');
  }
  colliders.push(boxCollider(sx - 1.5, sx + 1.5, sz - 0.6, sz + 0.6, 2.3, false));
  // glijbaan
  const gx = 29.5, gz = 19.4;
  b.box(1.0, 1.4, 1.0, gx - 1.0, 0, gz, '#8A6E55');
  b.box(1.1, 0.08, 1.1, gx - 1.0, 1.4, gz, '#6B7684');
  for (let k = 0; k < 4; k++) b.box(0.6, 0.05, 0.08, gx - 1.65, 0.3 + k * 0.33, gz - 0.2 + k * 0, '#6B7684');
  const glij = new THREE.BoxGeometry(2.2, 0.06, 0.6).rotateZ(-0.58);
  b.addAt(glij, '#5E7C8A', at(gx + 0.4, 0.78, gz));
  colliders.push(boxCollider(gx - 1.8, gx + 1.4, gz - 0.6, gz + 0.6, 1.6, false));
  // zandbak
  const zx = 23, zz = 17.95;
  b.box(2.4, 0.25, 0.15, zx, 0.02, zz - 1.12, '#8A6E55'); b.box(2.4, 0.25, 0.15, zx, 0.02, zz + 1.12, '#8A6E55');
  b.box(0.15, 0.25, 2.4, zx - 1.12, 0.02, zz, '#8A6E55'); b.box(0.15, 0.25, 2.4, zx + 1.12, 0.02, zz, '#8A6E55');
  b.box(2.1, 0.16, 2.1, zx, 0.02, zz, '#D2C29E', { castShadow: false });
  colliders.push(boxCollider(zx - 1.2, zx + 1.2, zz - 1.2, zz + 1.2, 0.3, false));
  bankje(b, 30.2, 17.4, 0);
  colliders.push(boxCollider(29.3, 31.1, 17.1, 17.7, 0.8, false));
}

function groen(ctx: DecorCtx): void {
  const { b, colliders } = ctx;
  // struiken langs de achterkant van de overkant-stoep (niet voor de stalling of de speeltuin)
  const vrij = (x: number) => !(x > 8 && x < 16) && !(x > 20 && x < 33);
  for (let x = -12.5; x < 40; x += 1.7) {
    if (!vrij(x)) continue;
    const soort = ['struik', 'struik-groot', 'struik-detail'][Math.abs(Math.round(x * 3)) % 3];
    b.model('natuur', soort, { x: x + Math.sin(x) * 0.3, y: 0, z: 15.1 + Math.cos(x * 2) * 0.15, w: 1.0 + (Math.abs(x) % 3) * 0.15, rotY: x }, natuurPalet(['#6A8A57', '#73915E', '#62804F'][Math.abs(Math.round(x)) % 3]));
  }
  // een bloemperk in het gras aan de overkant
  for (let k = 0; k < 14; k++) {
    const x = -10 + (k % 7) * 0.55, z = 18.5 + Math.floor(k / 7) * 0.55;
    b.model('natuur', ['bloem-rood', 'bloem-geel', 'bloem-paars'][k % 3], { x, z, h: 0.32, rotY: k }, natuurPalet());
  }
  // schuurtje met tuinhekje aan het begin van de straat (west)
  const sx = -9, sz = -3.5;
  b.box(2.6, 2.1, 2.0, sx, 0, sz, '#7A6A5C');
  for (let k = 0; k < 9; k++) b.box(0.02, 2.1, 0.03, sx - 1.2 + k * 0.3, 0, sz + 1.01, '#6A5C50', { castShadow: false });
  const dak = new THREE.BoxGeometry(3.0, 0.12, 2.5).rotateX(0.12);
  b.addAt(dak, WORLD.roofEdge, at(sx, 2.2, sz));
  b.box(0.8, 1.8, 0.04, sx + 0.6, 0, sz + 1.02, '#5E5046');
  colliders.push(boxCollider(sx - 1.4, sx + 1.4, sz - 1.1, sz + 1.1, 2.4));
  b.model('natuur', 'struik-groot', { x: sx - 2.0, z: sz + 0.8, w: 1.2 }, natuurPalet('#6A8A57'));
  b.model('natuur', 'boom-rond', { x: -12, z: -6, h: 6.5, rotY: 1 }, natuurPalet(WORLD.leaves[2]));
  colliders.push(boxCollider(-12.3, -11.7, -6.3, -5.7, 6, false));
}

// ---------------------------------------------------------------- auto's

/** Geparkeerde auto's aan de overkant (gedempte kleuren, geen hulpdiensten). */
export const GEPARKEERD: { model: string; x: number; lak: string; ry: number }[] = [
  { model: 'sedan', x: 1.5, lak: '#7D8A93', ry: Math.PI / 2 },
  { model: 'van', x: 7.5, lak: '#A39A8C', ry: Math.PI / 2 },
  { model: 'suv', x: 19.5, lak: '#6E7B6A', ry: -Math.PI / 2 },
  { model: 'sedan', x: 29.2, lak: '#8E6E68', ry: Math.PI / 2 },
  { model: 'bestelbus', x: 35.6, lak: '#C9C6BE', ry: -Math.PI / 2 },
];
export const PARKEER_Z = 11.72;

function geparkeerdeAutos(ctx: DecorCtx): void {
  const { b, colliders } = ctx;
  for (const a of GEPARKEERD) {
    const maat = b.model('autos', a.model, { x: a.x, y: 0.01, z: PARKEER_Z, w: 1.6, rotY: a.ry }, undefined, { nabewerk: (g) => herkleurLak(g, a.lak) });
    if (!maat) continue;
    const half = maat.z / 2;
    colliders.push(boxCollider(a.x - half, a.x + half, PARKEER_Z - 0.82, PARKEER_Z + 0.82, 1.4, false));
  }
}

// ---------------------------------------------------------------- achtergrond

function achtergrond(ctx: DecorCtx): void {
  const { b } = ctx;
  // vrolijke, wat gedempte gevelkleuren (geen merkkleuren)
  const tonen = ['#C98E6E', '#D9C38E', '#8FAFA0', '#9CB0CF', '#D8A9A0', '#E6DCC8', '#B7A3C4'];
  const rij: [string, number, number, number, number][] = [
    // [model, x, z, hoogte, draaiing] — ver achter de huizen en achter de overkant
    ['flat-slank', -26, -46, 15, 0], ['huis-breed', -6, -50, 11, 0], ['flat-balkon', 14, -54, 16, 0],
    ['huis-dubbel', 32, -48, 11, 0], ['flat-slank', 50, -56, 17, 0], ['huis-breed', 70, -44, 10, -0.3],
    ['flat-balkon', -18, 60, 14, Math.PI], ['huis-dubbel', 6, 64, 11, Math.PI], ['flat-slank', 30, 66, 16, Math.PI],
    ['huis-breed', 54, 58, 10, Math.PI + 0.3], ['huis-dubbel', -52, 10, 11, Math.PI / 2], ['flat-balkon', -54, -16, 14, Math.PI / 2],
  ];
  rij.forEach(([m, x, z, h, ry], k) => b.model('gebouwen', m, { x, z, h, rotY: ry }, gebouwPalet(tonen[(k * 3) % tonen.length]), { castShadow: false }));
}

function zebrapad(ctx: DecorCtx): void {
  for (let z = 6.0; z < 12.3; z += 1.0) ctx.b.box(2.8, 0.013, 0.5, ZEBRA_X, 0, z, '#E4E4DF', { castShadow: false });
}
export const ZEBRA_X = 41.2;

export { lantaarnPalet };
