import * as THREE from 'three';
import { StaticBuilder } from './builder';
import { boxCollider, type Collider } from './collision';
import { textTexture } from './labels';
import { THEME, WORLD } from '../theme';
import { bouwStraatDecor, WONING_DETAILS, ZEBRA_X, lantaarnPalet } from './straatDecor';
import { natuurPalet } from './paletten';
import { RaamBouwer, RaamStijl } from './ramen';
import { woordmerkMateriaal, icoonMateriaal, WOORDMERK_VERHOUDING } from './logos';

/** Huisnummers van de Lindelaan in het spel (rijtjes, even kant). */
export const HUISNUMMERS = [14, 16, 18, 20, 22, 24, 26];

export const LAYOUT = {
  houseWidth: 6,
  houseDepth: 8,
  wallHeight: 5.6,
  gardenDepth: 3.4,
  sidewalkNear: [3.5, 5.5] as const,
  road: [5.5, 12.5] as const,
  sidewalkFar: [12.5, 14.5] as const,
  westEnd: -14,
  office: { minX: 44, maxX: 58, minZ: -4, maxZ: 22, entranceZ: 9 },
  southEnd: 23,
};

export interface DoorInfo {
  nummer: number;
  /** Midden van de deur op de gevel. */
  door: THREE.Vector3;
  /** Punt op het tuinpad waar je staat om aan te bellen. */
  stand: THREE.Vector3;
  /** Scharnier van de deur; rotation.y > 0 = open (naar binnen). */
  deur: THREE.Group;
  /** Donkere deuropening, zichtbaar als de deur open is. */
  opening: THREE.Mesh;
}

export interface Street {
  group: THREE.Group;
  colliders: Collider[];
  doors: Map<number, DoorInfo>;
  spawn: THREE.Vector3;
  /** Grondhoogte (stoep ligt iets hoger dan de weg). */
  heightAt(x: number, z: number): number;
}

const houseX = (i: number) => i * LAYOUT.houseWidth;
const DOOR_OFFSET = 1.5;

export function buildStreet(): Street {
  const b = new StaticBuilder();
  const colliders: Collider[] = [];
  const doors = new Map<number, DoorInfo>();
  const group = new THREE.Group();
  const W = LAYOUT.houseWidth, D = LAYOUT.houseDepth, H = LAYOUT.wallHeight;
  const rowMinX = houseX(0) - W / 2, rowMaxX = houseX(HUISNUMMERS.length - 1) + W / 2;
  const [snA, snB] = LAYOUT.sidewalkNear, [rA, rB] = LAYOUT.road, [sfA, sfB] = LAYOUT.sidewalkFar;
  const off = LAYOUT.office;
  const ramen = new RaamBouwer();

  // ---------- Grond ----------
  const ground = new THREE.PlaneGeometry(220, 160);
  ground.rotateX(-Math.PI / 2);
  ground.translate(22, 0, 5);
  b.add(ground, WORLD.grass, { castShadow: false });

  const roadLen = off.minX - LAYOUT.westEnd;
  const roadCx = (off.minX + LAYOUT.westEnd) / 2;
  b.box(roadLen, 0.01, rB - rA, roadCx, 0, (rA + rB) / 2, WORLD.asphalt, { castShadow: false });
  for (let x = LAYOUT.westEnd + 2; x < off.minX - 2; x += 4) {
    if (Math.abs(x - ZEBRA_X) < 2.6) continue;
    b.box(2, 0.012, 0.15, x, 0, (rA + rB) / 2, WORLD.roadLine, { castShadow: false });
  }
  // stoepen + banden
  b.box(roadLen, 0.08, snB - snA, roadCx, 0, (snA + snB) / 2, WORLD.sidewalk, { castShadow: false });
  b.box(roadLen, 0.1, 0.18, roadCx, 0, snB - 0.09, WORLD.kerb, { castShadow: false });
  b.box(roadLen, 0.08, sfB - sfA, roadCx, 0, (sfA + sfB) / 2, WORLD.sidewalk, { castShadow: false });
  b.box(roadLen, 0.1, 0.18, roadCx, 0, sfA + 0.09, WORLD.kerb, { castShadow: false });
  // plein voor het kantoor
  b.box(5, 0.08, sfB - snA + 4, off.minX - 2.5, 0, (snA + sfB) / 2, WORLD.sidewalk, { castShadow: false });

  // ---------- Rijtjeshuizen ----------
  HUISNUMMERS.forEach((nummer, i) => {
    const cx = houseX(i);
    const brick = WORLD.bricks[i % WORLD.bricks.length];
    const doorColor = WORLD.doors[i % WORLD.doors.length];

    b.box(W, H, D, cx, 0, -D / 2, brick);
    // plint en lijst tussen de verdiepingen
    b.box(W, 0.35, 0.08, cx, 0, 0.04, WORLD.roofEdge);
    b.box(W, 0.12, 0.1, cx, 2.95, 0.05, WORLD.frame);

    // dak (driehoekig prisma met overstek)
    const shape = new THREE.Shape();
    shape.moveTo(-D - 0.35, 0); shape.lineTo(0.35, 0); shape.lineTo(-D / 2, 2.8); shape.closePath();
    const roof = new THREE.ExtrudeGeometry(shape, { depth: W, bevelEnabled: false });
    roof.rotateY(-Math.PI / 2);
    roof.translate(cx + W / 2, H, 0);
    b.add(roof, i % 2 ? WORLD.roof : WORLD.roofEdge);
    if (i % 2 === 0) b.box(0.7, 1.6, 0.7, cx - 1.6, H + 1.4, -5.2, brick);

    // deur met kozijn en stoepje
    const dx = cx + DOOR_OFFSET;
    b.box(0.15, 2.4, 0.12, dx - 0.575, 0, 0.06, WORLD.frame);
    b.box(0.15, 2.4, 0.12, dx + 0.575, 0, 0.06, WORLD.frame);
    b.box(1.3, 0.2, 0.12, dx, 2.2, 0.06, WORLD.frame);
    b.box(1.6, 0.14, 0.7, dx, 0, 0.35, WORLD.kerb);
    const deur = new THREE.Group();
    deur.position.set(dx - 0.5, 0.05, 0.005);
    deur.name = `deur-${nummer}`;
    // paneel, greep en brievenbusklep samen in één mesh (één draw call per deur)
    const db = new StaticBuilder();
    db.box(1.0, 2.15, 0.1, 0.5, 0, 0.05, doorColor);
    db.box(0.4, 0.5, 0.012, 0.5, 1.45, 0.1, doorColor);
    db.box(0.08, 0.08, 0.08, 0.82, 0.96, 0.13, WORLD.metal);
    db.box(0.32, 0.07, 0.02, 0.42, 1.245, 0.11, '#8C8F93');
    deur.add(db.build());
    group.add(deur);
    const opening = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.15), new THREE.MeshBasicMaterial({ color: WORLD.doorway }));
    opening.position.set(dx, 0.05 + 1.075, 0.008);
    opening.visible = false;
    group.add(opening);

    // ramen: beneden breed, boven twee
    // ramen waar je doorheen kijkt (interior mapping); nr 26 staat leeg
    const leeg = nummer === 26;
    const window = (wx: number, wy: number, ww: number, wh: number, stijl: RaamStijl, k: number) => {
      b.box(ww + 0.2, wh + 0.2, 0.06, wx, wy - 0.1, 0.03, WORLD.frame);
      ramen.add({ pos: new THREE.Vector3(wx, wy, 0.062), breedte: ww, hoogte: wh, normaal: new THREE.Vector3(0, 0, 1), stijl: leeg ? RaamStijl.Leeg : stijl, seed: i * 7 + k * 3 + 1, borstwering: stijl === RaamStijl.Woon ? 0.9 : 0.85 });
      b.box(0.08, wh, 0.14, wx, wy, 0.07, WORLD.frame);
      b.box(ww + 0.3, 0.08, 0.25, wx, wy - 0.14, 0.12, WORLD.frame);
    };
    window(cx - 1.2, 0.9, 2.2, 1.45, RaamStijl.Woon, 0);
    window(cx - 1.4, 3.45, 1.4, 1.2, RaamStijl.Slaap, 1);
    window(cx + 1.5, 3.45, 1.2, 1.2, RaamStijl.Slaap, 2);

    // voortuin: gras, tegelpad, heg met opening bij het pad
    b.box(W - 0.1, 0.07, LAYOUT.gardenDepth, cx, 0, LAYOUT.gardenDepth / 2 + 0.02, WORLD.grassDark, { castShadow: false });
    b.box(1.2, 0.09, LAYOUT.gardenDepth, dx, 0, LAYOUT.gardenDepth / 2 + 0.02, WORLD.path, { castShadow: false });
    const hz = LAYOUT.gardenDepth - 0.25;
    const segA = [cx - W / 2 + 0.05, dx - 0.7], segB = [dx + 0.7, cx + W / 2 - 0.05];
    const hekje = WONING_DETAILS[i]?.hekje;
    for (const [a, c] of [segA, segB]) {
      if (c - a < 0.2) continue;
      // sommige tuinen hebben een laag houten hekje in plaats van een heg
      if (hekje && b.model('natuur', 'hek', { x: (a + c) / 2, y: 0.07, z: hz, w: c - a }, natuurPalet())) {
        b.box(c - a, 0.06, 0.08, (a + c) / 2, 0.07, hz, '#7E6249');
      } else b.box(c - a, 0.8, 0.5, (a + c) / 2, 0, hz, WORLD.hedge);
      colliders.push(boxCollider(a, c, hz - 0.25, hz + 0.25, 0.8, false));
    }
    // erfafscheiding (lage heg) tussen tuinen
    b.box(0.35, 0.7, LAYOUT.gardenDepth - 0.6, cx - W / 2, 0, (LAYOUT.gardenDepth - 0.6) / 2 + 0.3, WORLD.hedge);
    colliders.push(boxCollider(cx - W / 2 - 0.18, cx - W / 2 + 0.18, 0.3, LAYOUT.gardenDepth - 0.3, 0.7, false));

    doors.set(nummer, {
      nummer,
      door: new THREE.Vector3(dx, 1.1, 0.15),
      stand: new THREE.Vector3(dx, 0, 1.2),
      deur, opening,
    });

    // huisnummerbordje
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.28),
      new THREE.MeshStandardMaterial({ map: textTexture(String(nummer), { width: 92, height: 56, font: '600 38px Poppins, sans-serif', color: THEME.navy, background: THEME.white, radius: 8 }), roughness: 0.8 }),
    );
    plate.position.set(dx, 2.55, 0.12);
    plate.name = `huisnummer-${nummer}`;
    group.add(plate);
  });
  // laatste erfafscheiding + zijgevel-afsluiting
  b.box(0.35, 0.7, LAYOUT.gardenDepth - 0.6, rowMaxX, 0, (LAYOUT.gardenDepth - 0.6) / 2 + 0.3, WORLD.hedge);
  colliders.push(boxCollider(rowMaxX - 0.18, rowMaxX + 0.18, 0.3, LAYOUT.gardenDepth - 0.3, 0.7, false));
  colliders.push(boxCollider(rowMinX, rowMaxX, -D - 0.4, 0.02, H + 2.8));
  // afscheiding naast nr 14 (heg) en tussen nr 26 en het kantoor (hek)
  b.box(0.5, 1.0, D + LAYOUT.gardenDepth, rowMinX - 0.4, 0, -D / 2 + LAYOUT.gardenDepth / 2, WORLD.hedge);
  colliders.push(boxCollider(rowMinX - 0.6, rowMinX - 0.2, -D, LAYOUT.gardenDepth, 1.0, false));
  b.box(off.minX - rowMaxX, 1.0, 0.1, (off.minX + rowMaxX) / 2, 0, -1.5, WORLD.metal);
  colliders.push(boxCollider(rowMaxX, off.minX, -1.7, -1.3, 1.0, false));

  // ---------- Kantoor van de corporatie ----------
  // Warm en herkenbaar: bakstenen sokkel, crème begane grond, bakstenen verdieping met houten
  // lamellen, een smalle Zig-blauwe band, een gedempt blauwe trappenhuistoren, groen op het dak.
  // De ramen zijn doorkijkramen met kantoren erachter.
  const ow = off.maxX - off.minX, od = off.maxZ - off.minZ, ocz = (off.minZ + off.maxZ) / 2, ocx = (off.minX + off.maxX) / 2;
  const KANTOOR = { sokkel: '#7A5A4C', creme: '#EDE4D3', baksteen: '#A9674F', hout: '#A88763', donker: '#3D4046', toren: '#5C76B4' };
  b.box(ow, 1.0, od, ocx, 0, ocz, KANTOOR.sokkel);
  b.box(ow, 2.5, od, ocx, 1.0, ocz, KANTOOR.creme);
  b.box(ow + 0.12, 0.5, od + 0.12, ocx, 3.5, ocz, KANTOOR.hout);
  b.box(ow + 0.16, 0.12, od + 0.16, ocx, 3.5, ocz, THEME.blue);
  b.box(ow, 3.6, od, ocx, 4.0, ocz, KANTOOR.baksteen);
  b.box(ow + 0.4, 0.35, od + 0.4, ocx, 7.6, ocz, KANTOOR.donker);
  // trappenhuistoren aan de kant van de huizen
  // de toren steekt 0,4 m vóór de gevel uit (anders vallen de gevels samen en flikkeren ze)
  const tx0 = off.minX - 0.4;
  b.box(4.4, 10.2, 5.2, tx0 + 2.2, 0, off.minZ + 2.6, KANTOOR.toren);
  b.box(4.6, 0.3, 5.4, tx0 + 2.2, 10.2, off.minZ + 2.6, KANTOOR.donker);
  colliders.push(boxCollider(tx0, off.minX, off.minZ, off.minZ + 5.2, 10.2));
  // trappenhuis: smalle, hoge ramen met donkere neggen
  for (let y = 1.0; y < 6.5; y += 2.6) {
    b.box(0.1, 2.2, 1.6, tx0 - 0.04, y - 0.1, off.minZ + 2.6, '#3D4046');
    ramen.add({ pos: new THREE.Vector3(tx0 - 0.095, y, off.minZ + 2.6), breedte: 1.4, hoogte: 2.0, normaal: new THREE.Vector3(-1, 0, 0), stijl: RaamStijl.Trap, seed: 200 + y, borstwering: 0.8, diepte: 3 });
  }
  // ramen: begane grond en verdieping, met donkere neggen; houten lamellen tussen de bovenramen
  let k = 0;
  for (const [y, h] of [[1.25, 2.0], [4.55, 2.4]] as const) {
    for (let z = off.minZ + 6.5; z < off.maxZ - 1.2; z += 3) {
      if (y < 2 && Math.abs(z - off.entranceZ) < 2.6) continue;
      b.box(0.14, h + 0.24, 2.44, off.minX - 0.05, y - 0.12, z, KANTOOR.donker);
      ramen.add({ pos: new THREE.Vector3(off.minX - 0.125, y, z), breedte: 2.2, hoogte: h, normaal: new THREE.Vector3(-1, 0, 0), stijl: RaamStijl.Kantoor, seed: 100 + k++, borstwering: 0.9, diepte: 4 });
      b.box(0.2, 0.08, 2.5, off.minX - 0.1, y - 0.12, z, '#C9C6BE');
      if (y > 2) for (const dz of [-1.6, 1.6]) b.box(0.18, h + 0.4, 0.14, off.minX - 0.09, y - 0.2, z + dz, KANTOOR.hout);
      // een paar luifels in gedempte kleuren boven de benedenramen
      if (y < 2 && k % 3 === 1) {
        const luifel = new THREE.BoxGeometry(1.0, 0.06, 2.4).rotateZ(-0.35);
        b.addAt(luifel, k % 2 ? '#6E8C82' : '#B8805F', new THREE.Matrix4().makeTranslation(off.minX - 0.45, y + h + 0.05, z));
      }
    }
  }
  // entree: glazen pui met de hal erachter, blauwe luifel met houten onderkant, plantenbakken
  b.box(0.16, 2.9, 3.6, off.minX - 0.05, 0, off.entranceZ, KANTOOR.donker);
  ramen.add({ pos: new THREE.Vector3(off.minX - 0.135, 0.05, off.entranceZ), breedte: 3.2, hoogte: 2.75, normaal: new THREE.Vector3(-1, 0, 0), stijl: RaamStijl.Hal, seed: 77, borstwering: 0, diepte: 5 });
  b.box(0.2, 2.75, 0.1, off.minX - 0.15, 0.05, off.entranceZ, KANTOOR.donker);
  b.box(2.4, 0.22, 5.0, off.minX - 1.2, 3.0, off.entranceZ, KANTOOR.toren);
  b.box(2.3, 0.04, 4.9, off.minX - 1.2, 2.98, off.entranceZ, KANTOOR.hout);
  for (const dz of [-3.1, 3.1]) {
    b.box(1.1, 0.6, 1.1, off.minX - 0.9, 0.08, off.entranceZ + dz, KANTOOR.sokkel);
    b.model('natuur', 'struik-groot', { x: off.minX - 0.9, y: 0.68, z: off.entranceZ + dz, w: 1.0, rotY: dz }, natuurPalet('#66855A'));
    b.model('natuur', 'bloem-geel', { x: off.minX - 0.75, y: 0.68, z: off.entranceZ + dz + 0.3, h: 0.3 }, natuurPalet());
    b.model('natuur', 'bloem-paars', { x: off.minX - 1.05, y: 0.68, z: off.entranceZ + dz - 0.3, h: 0.3 }, natuurPalet());
    colliders.push(boxCollider(off.minX - 1.5, off.minX - 0.3, off.entranceZ + dz - 0.6, off.entranceZ + dz + 0.6, 1.2, false));
  }
  // groen dak: struiken langs de dakrand
  for (let z = off.minZ + 6; z < off.maxZ - 0.5; z += 1.6) {
    b.model('natuur', ['struik', 'struik-groot', 'gras'][Math.round(z) % 3], { x: off.minX + 0.6 + (Math.round(z * 3) % 2) * 0.3, y: 7.95, z, w: 0.9 }, natuurPalet(['#6A8A57', '#73915E'][Math.round(z) % 2]));
  }
  colliders.push(boxCollider(off.minX, off.maxX, off.minZ, off.maxZ, 8.4));
  // ---------- Huisstijl van de corporatie op de gevel ----------
  // Lichtbak met het woordmerk boven de entree (navy rand), een uithangbord met het icoon
  // haaks op de gevel, en het icoon groot op de trappenhuistoren. NL/EN wisselen mee.
  const bordH = 1.5, bordW = bordH * WOORDMERK_VERHOUDING * 0.92;
  b.box(0.22, bordH + 0.24, bordW + 0.24, off.minX - 0.11, 3.95 - (bordH + 0.24) / 2, off.entranceZ, THEME.navy);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(bordW, bordH), woordmerkMateriaal());
  sign.rotation.y = -Math.PI / 2;
  sign.position.set(off.minX - 0.225, 3.95, off.entranceZ);
  sign.name = 'kantoor-bord';
  group.add(sign);
  // uithangbord: dubbelzijdig, aan een navy beugel, zichtbaar als je door de straat loopt
  // op het muurstuk tussen twee bovenramen (ramen om de 3 m vanaf minZ + 6.5)
  const uz = off.minZ + 8.0, uy = 6.0;
  b.box(1.5, 0.08, 0.08, off.minX - 0.75, uy + 0.75, uz, THEME.navy);
  // plaat haaks op de gevel (vlak in x/y), logo aan beide kanten
  b.box(1.36, 1.36, 0.14, off.minX - 0.95, uy - 0.68, uz, THEME.navy);
  b.box(0.06, 0.5, 0.06, off.minX - 0.45, uy + 0.5, uz, THEME.navy);
  b.box(0.06, 0.5, 0.06, off.minX - 1.45, uy + 0.5, uz, THEME.navy);
  for (const kant of [-1, 1]) {
    const u = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2), icoonMateriaal());
    u.position.set(off.minX - 0.95, uy, uz + kant * 0.075);
    u.rotation.y = kant > 0 ? 0 : Math.PI;
    u.name = 'kantoor-uithangbord';
    group.add(u);
  }
  // icoon op een bord op het dak van de toren (twee poten, navy rand, logo aan beide kanten)
  const tz = off.minZ + 2.6, bx = tx0 + 1.4, dak = 10.5, by = dak + 0.6 + 1.3;
  for (const dz of [-0.85, 0.85]) b.box(0.14, 0.8, 0.14, bx, dak, tz + dz, THEME.navy);
  b.box(0.12, 2.6, 2.6, bx, by - 1.3, tz, THEME.navy);
  for (const kant of [-1, 1]) {
    const toren = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), icoonMateriaal());
    toren.rotation.y = kant < 0 ? -Math.PI / 2 : Math.PI / 2;
    toren.position.set(bx + kant * 0.065, by, tz);
    toren.name = 'kantoor-toren-logo';
    group.add(toren);
  }

  // ---------- Overkant: bomen, lantaarns, fietsenstalling ----------
  const tree = (x: number, z: number, s: number, k: number) => {
    const soorten = ['boom-eik', 'boom-rond', 'boom-detail', 'boom-dik', 'boom-eik', 'boom-slank'];
    if (b.model('natuur', soorten[k % soorten.length], { x, z, h: 5.6 * s, rotY: k * 1.7 }, natuurPalet(WORLD.leaves[k % WORLD.leaves.length]))) {
      colliders.push(boxCollider(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 6 * s, false));
      return;
    }
    b.add(new THREE.CylinderGeometry(0.16 * s, 0.22 * s, 2.2 * s, 6).translate(x, 1.1 * s, z), WORLD.trunk);
    const crown = new THREE.IcosahedronGeometry(1.5 * s, 0);
    crown.rotateY(k); crown.translate(x, 2.9 * s, z);
    b.add(crown, WORLD.leaves[k % WORLD.leaves.length]);
    const crown2 = new THREE.IcosahedronGeometry(1.0 * s, 0);
    crown2.translate(x + 0.5 * s, 3.8 * s, z - 0.3 * s);
    b.add(crown2, WORLD.leaves[(k + 1) % WORLD.leaves.length]);
    colliders.push(boxCollider(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 6 * s, false));
  };
  [[-10, 16.6], [-3, 17.0], [3, 16.4], [17.5, 17.2], [35, 16.6], [38.5, 19.8], [-5.5, 20.8], [18, 21], [6, 21.5], [34.5, 22.0], [-12, 1.5]]
    .forEach(([x, z], k) => tree(x, z, 0.9 + (k % 3) * 0.12, k));

  const lamp = (x: number, z: number) => {
    if (b.model('straat', 'lantaarn', { x, y: 0.08, z, h: 4.6, rotY: 0 }, lantaarnPalet)) {
      colliders.push(boxCollider(x - 0.15, x + 0.15, z - 0.15, z + 0.15, 4.5, false));
      return;
    }
    b.add(new THREE.CylinderGeometry(0.07, 0.09, 4.5, 6).translate(x, 2.25, z), WORLD.roofEdge);
    b.box(0.9, 0.12, 0.3, x, 4.4, z - 0.35, WORLD.roofEdge);
    b.box(0.5, 0.05, 0.22, x, 4.36, z - 0.6, WORLD.frame);
    colliders.push(boxCollider(x - 0.15, x + 0.15, z - 0.15, z + 0.15, 4.5, false));
  };
  [1, 17, 33].forEach((x) => lamp(x, 14.0));

  // fietsenstalling tegenover nr 18
  const fx = houseX(2), fz = 17.2, fw = 6, fd = 2.2;
  for (const px of [fx - fw / 2, fx + fw / 2]) for (const pz of [fz - fd / 2, fz + fd / 2]) {
    b.box(0.12, 2.2, 0.12, px, 0, pz, WORLD.metal);
  }
  const shelterRoof = new THREE.BoxGeometry(fw + 0.4, 0.1, fd + 0.6);
  shelterRoof.rotateX(-0.12); shelterRoof.translate(fx, 2.3, fz);
  b.add(shelterRoof, WORLD.roof);
  b.box(fw, 1.6, 0.06, fx, 0.3, fz + fd / 2, WORLD.officeDark);
  for (let k = 0; k < 5; k++) {
    const bx = fx - fw / 2 + 0.8 + k * 1.1;
    for (const wz of [-0.55, 0.55]) {
      const wheel = new THREE.TorusGeometry(0.32, 0.04, 4, 10);
      wheel.rotateY(Math.PI / 2); wheel.translate(bx, 0.36, fz + wz);
      b.add(wheel, WORLD.roofEdge);
    }
    b.box(0.05, 0.05, 1.1, bx, 0.6, fz, WORLD.doors[k]);
    b.box(0.05, 0.4, 0.05, bx, 0.6, fz - 0.35, WORLD.doors[k]);
  }
  colliders.push(boxCollider(fx - fw / 2 - 0.2, fx + fw / 2 + 0.2, fz - fd / 2 - 0.2, fz + fd / 2 + 0.2, 2.4));

  // ---------- Randen ----------
  b.box(0.8, 1.2, 26, LAYOUT.westEnd - 0.4, 0, 9, WORLD.hedge);
  colliders.push(boxCollider(LAYOUT.westEnd - 0.8, LAYOUT.westEnd, -10, 30, 1.2, false));
  b.box(off.minX - LAYOUT.westEnd, 1.2, 0.8, (off.minX + LAYOUT.westEnd) / 2, 0, LAYOUT.southEnd + 0.4, WORLD.hedge);
  colliders.push(boxCollider(LAYOUT.westEnd - 1, off.maxX + 1, LAYOUT.southEnd, LAYOUT.southEnd + 1, 1.2, false));
  colliders.push(boxCollider(LAYOUT.westEnd - 1, rowMinX - 0.2, -10, -D, 3, false));
  colliders.push(boxCollider(off.minX - 1, off.minX, off.maxZ, LAYOUT.southEnd + 1, 3, false));

  bouwStraatDecor({
    b, colliders, houseX, aantal: HUISNUMMERS.length, doorOffset: DOOR_OFFSET,
    gardenDepth: LAYOUT.gardenDepth, houseDepth: D, wallHeight: H,
  });
  group.add(b.build());
  group.add(ramen.build());

  const heightAt = (x: number, z: number): number => {
    if (x > off.minX - 5 && z > snA && z < sfB) return 0.08;
    if (z >= rA && z <= rB) return 0.01;
    if ((z > snA && z < rA) || (z > rB && z < sfB)) return 0.08;
    if (z >= 0 && z <= snA && x > rowMinX && x < rowMaxX) return 0.08;
    return 0;
  };

  return {
    group, colliders, doors,
    spawn: new THREE.Vector3(LAYOUT.westEnd + 3, 0, (snA + snB) / 2),
    heightAt,
  };
}
