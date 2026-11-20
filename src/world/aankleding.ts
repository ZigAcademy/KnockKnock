import * as THREE from 'three';
import { kitModel } from '../assets/modellen';
import { WORLD } from '../theme';
import type { StaticBuilder } from './builder';
import type { Beplanting } from './beplanting';
import { boxCollider, type Collider } from './collision';
import { onderdelen, instanties } from './groen';
import { gladModel } from './glad';
import { klikoPalet } from './paletten';
import { voertuig } from './voertuigen';
import { fietsMesh } from './fiets';
import { bankje } from './straatDecor';
import { RING, ringPad } from './ringweg';
import type { Gevel } from './achtergrond';

/**
 * Aankleding van de buurt (standaardversie): een park binnen de ring met bomen, struiken, paden,
 * picknicktafels en bankjes; bomen in de berm langs de ringweg; geparkeerde auto's (waar je in kunt
 * stappen) en volle voortuinen bij de huizen langs de ring; potten, kratten en tuinstoelen in de straat.
 * Objecten uit de props-kit (Poly Haven, CC0) worden per soort één InstancedMesh.
 */

let zaad = 20261120;
const rnd = () => ((zaad = (zaad * 16807) % 2147483647) / 2147483647);
const kies = <T>(l: readonly T[]) => l[Math.floor(rnd() * l.length)];

/** Verzamelt plaatsingen van props en bouwt ze als InstancedMesh. */
class Props {
  private plek = new Map<string, THREE.Matrix4[]>();
  zet(naam: string, x: number, y: number, z: number, ry = 0, s = 1): void {
    const l = this.plek.get(naam) ?? [];
    l.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(s, s, s)));
    this.plek.set(naam, l);
  }
  bouw(groep: THREE.Group): void {
    for (const [naam, plekken] of this.plek) {
      const model = kitModel('props', naam);
      if (!model) continue;
      const { delen, box } = onderdelen(model);
      // oorsprong midden onder
      const c = box.getCenter(new THREE.Vector3());
      const naarNul = new THREE.Matrix4().makeTranslation(-c.x, -box.min.y, -c.z);
      groep.add(instanties(`prop-${naam}`, delen, plekken.map((m) => m.clone().multiply(naarNul)), { schaduw: true }));
    }
  }
}

export interface AankledingCtx {
  b: StaticBuilder;
  beplanting: Beplanting;
  losse: THREE.Group;
  colliders: Collider[];
  gevels: Gevel[];
  /** Huizen in de straat: midden van de gevel per huis. */
  huizen: number[];
}

export function bouwAankleding(ctx: AankledingCtx): void {
  const { b, beplanting, losse, colliders } = ctx;
  const props = new Props();
  const boom = (x: number, z: number, h = 6 + rnd() * 3) => {
    beplanting.voegToe(kies(['boom-1', 'boom-2', 'boom-3', 'boom-2', 'boom-3']), { x, z, h, rotY: rnd() * Math.PI * 2 });
    colliders.push(boxCollider(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 4, false));
  };
  const struikGroep = (x: number, z: number, n = 3) => {
    for (let i = 0; i < n; i++) beplanting.voegToe(kies(['struik', 'struik-bloem', 'bloemen-1', 'bloemen-2', 'varen', 'plant']), { x: x + (rnd() - 0.5) * 2.4, z: z + (rnd() - 0.5) * 2.4, w: 0.8 + rnd() * 0.8, rotY: rnd() * 6.3 });
  };
  const pad = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const g = new THREE.BoxGeometry(len, 0.03, 1.6).rotateY(-Math.atan2(z1 - z0, x1 - x0)).translate((x0 + x1) / 2, 0.015, (z0 + z1) / 2);
    b.add(g, WORLD.path, { castShadow: false });
  };

  // ---------- park binnen de ring ----------
  const { x0, x1, z0, z1, breed } = RING;
  const bin = { x0: x0 + breed / 2 + 2, x1: x1 - breed / 2 - 2, z0: z0 + breed / 2 + 2, z1: z1 - breed / 2 - 2 };
  // het blok zelf (straat, huizen, kantoor, park bij de stalling) blijft vrij
  const blok = { x0: -16, x1: 60, z0: -11, z1: 24.5 };
  const vrij = (x: number, z: number, m = 0) => !(x > blok.x0 - m && x < blok.x1 + m && z > blok.z0 - m && z < blok.z1 + m) && !(x < -12 && z > 4 && z < 14);
  // wandelpaden: een lus door het noordelijke park en een pad langs de westkant
  pad(-26, -20, 66, -20); pad(-26, -20, -26, 0); pad(66, -20, 66, 0); pad(-26, 18, -26, 30); pad(-26, 30, 66, 30);
  // bomen: losjes verspreid, niet op paden
  for (let i = 0; i < 260; i++) {
    const x = bin.x0 + rnd() * (bin.x1 - bin.x0), z = bin.z0 + rnd() * (bin.z1 - bin.z0);
    if (!vrij(x, z, 3)) continue;
    if (Math.abs(z + 20) < 2.5 || Math.abs(z - 30) < 2.5 || Math.abs(x + 26) < 2.5 || Math.abs(x - 66) < 2.5) continue;
    if (rnd() < 0.45) boom(x, z); else struikGroep(x, z, 2 + Math.floor(rnd() * 3));
  }
  // picknicktafels en bankjes langs het pad
  for (const [x, z] of [[-6, -24], [18, -24], [44, -24]] as const) {
    props.zet('picknicktafel', x, 0, z, rnd() * 0.4);
    colliders.push(boxCollider(x - 1.3, x + 1.3, z - 1.6, z + 1.6, 0.8, false));
  }
  for (const [x, z, ry] of [[4, -18.3, Math.PI], [30, -18.3, Math.PI], [56, -18.3, Math.PI], [8, 28.3, 0], [36, 28.3, 0], [-24.3, 24, Math.PI / 2]] as const) {
    bankje(b, x, z, ry);
    colliders.push(boxCollider(x - 1, x + 1, z - 0.4, z + 0.4, 0.6, false));
  }

  // ---------- bomen in de berm langs de ring (tussen de lantaarns) ----------
  const berm = ringPad(-(breed / 2 + 2.6), 11);
  for (const p of berm.filter((_, i) => i % 2 === 1)) {
    // halverwege twee lantaarns (die staan om de 22 m vanaf het begin van het pad)
    if (!vrij(p.x, p.z, 1)) continue;
    boom(p.x, p.z, 7 + rnd() * 2);
  }

  // ---------- langs de huizen aan de ring: geparkeerde auto's en volle voortuinen ----------
  const lakken = ['#7D8A93', '#A39A8C', '#8E6E68', '#6B7A8C', '#C9C6BE', '#4E5A4C', '#2E3440'];
  const soorten = ['sedan', 'hatchback', 'stationwagen', 'compact', 'minivan', 'suv'];
  for (const g of ctx.gevels) {
    const ry = g.ry, voor = new THREE.Vector3(Math.sin(ry), 0, Math.cos(ry)), langs = new THREE.Vector3(Math.cos(ry), 0, -Math.sin(ry));
    // gevel ligt op afstand ±9,5 van de weg-middenlijn; buitenbaan op 1,8 m, parkeerstrook op ±3 m
    const weg = new THREE.Vector3(g.x, 0, g.z).addScaledVector(voor, 9.5 - 3.0);
    // auto's
    for (let i = 0; i < Math.max(1, Math.floor(g.lengte / 9)); i++) {
      if (rnd() < 0.3) continue;
      const t = -g.lengte / 2 + 3 + i * 9 + rnd() * 2;
      const p = weg.clone().addScaledVector(langs, t);
      const a = voertuig(kies(soorten));
      if (!a) break;
      a.position.copy(p);
      a.rotation.y = Math.atan2(langs.x, langs.z) + (rnd() < 0.5 ? Math.PI : 0);
      a.name = 'geparkeerd-ring';
      losse.add(a);
      const hl = 2.3, hb = 1.0;
      const ex = Math.abs(langs.x) * hl + Math.abs(langs.z) * hb, ez = Math.abs(langs.z) * hl + Math.abs(langs.x) * hb;
      const col = boxCollider(p.x - ex, p.x + ex, p.z - ez, p.z + ez, 1.5, false);
      colliders.push(col);
      a.userData.rijdbaar = { object: a, collider: col };
      void lakken;
    }
    if (g.soort !== 'rij') {
      // flat: fietsen tegen de gevel en plantenbakken bij de entree
      for (let i = 0; i < 1; i++) {
        const p = new THREE.Vector3(g.x, 0, g.z).addScaledVector(voor, 1.2).addScaledVector(langs, -6 + i * 0.75);
        const f = fietsMesh(kies(['#3E4A5C', '#6B2F2F', '#2F4A3A', '#1E1F22']), i === 1 ? 'fiets-mtb' : 'fiets-retro');
        f.position.copy(p); f.rotation.y = Math.atan2(voor.x, voor.z) + Math.PI / 2;
        losse.add(f);
      }
      for (const s of [-2.2, 2.2]) {
        const p = new THREE.Vector3(g.x, 0, g.z).addScaledVector(voor, 0.9).addScaledVector(langs, s);
        props.zet('plantenbak', p.x, 0, p.z, Math.atan2(langs.x, langs.z), 1.3);
        beplanting.voegToe(kies(['bloemen-1', 'bloemen-2', 'plant']), { x: p.x, y: 0.42, z: p.z, w: 0.8 });
      }
      continue;
    }
    // rijtjeshuizen: per huis kliko's, potten, soms een fiets, tuinstoel of kratten
    const n = Math.round(g.lengte / 6);
    for (let i = 0; i < n; i++) {
      const t = -g.lengte / 2 + 3 + i * 6;
      const thuis = (along: number, uit: number) => new THREE.Vector3(g.x, 0, g.z).addScaledVector(langs, t + along).addScaledVector(voor, uit);
      const ryGevel = Math.atan2(voor.x, voor.z);
      // kliko's tegen de gevel
      const k = thuis(i % 2 ? -2.4 : 2.4, 0.6);
      const kliko = gladModel('straat', 'kliko', { x: k.x, y: 0, z: k.z, h: 1.05, rotY: ryGevel + Math.PI }, klikoPalet('#4E6247', '#4E6247'));
      if (kliko) losse.add(kliko);
      // pot met plant naast de deur
      const d = thuis(i % 2 ? 0.6 : -0.6, 0.45);
      props.zet('pot-klei', d.x, 0, d.z, rnd() * 6, 1.6);
      beplanting.voegToe(kies(['plant', 'varen', 'bloemen-1']), { x: d.x, y: 0.33, z: d.z, w: 0.45 });
      const r = rnd();
      if (r < 0.06) {
        const f = fietsMesh(kies(['#3E4A5C', '#6B2F2F', '#5F6B58', '#8C8F94']), rnd() < 0.3 ? 'fiets-mtb' : 'fiets-retro');
        const p = thuis(i % 2 ? 1.5 : -1.5, 1.5);
        f.position.copy(p); f.rotation.y = ryGevel + Math.PI / 2 + 0.15;
        losse.add(f);
      } else if (r < 0.45) {
        const p = thuis(i % 2 ? 1.6 : -1.6, 2.0);
        props.zet('tuinstoel', p.x, 0, p.z, ryGevel + (rnd() - 0.5));
        props.zet('tuinstoel', p.x + langs.x * 0.8, 0, p.z + langs.z * 0.8, ryGevel + (rnd() - 0.5));
      } else if (r < 0.55) {
        const p = thuis(i % 2 ? 1.8 : -1.8, 1.2);
        props.zet('krat-plastic', p.x, 0, p.z, ryGevel + rnd());
        props.zet('krat-plastic', p.x, 0.25, p.z, ryGevel + rnd() * 0.3);
      }
    }
  }

  // ---------- buiten de ring: bomen achter en tussen de huizen (horizon) ----------
  const buiten = { x0: x0 - 30, x1: x1 + 30, z0: z0 - 30, z1: z1 + 30 };
  const bebouwd = ctx.gevels.map((g) => ({ x: g.x, z: g.z, r: g.lengte / 2 + 6 }));
  for (let i = 0; i < 160; i++) {
    const x = buiten.x0 + rnd() * (buiten.x1 - buiten.x0), z = buiten.z0 + rnd() * (buiten.z1 - buiten.z0);
    // niet op of vlak naast de ring, niet in de huizen
    if (x > x0 - breed / 2 - 4 && x < x1 + breed / 2 + 4 && z > z0 - breed / 2 - 4 && z < z1 + breed / 2 + 4) continue;
    if (bebouwd.some((g) => Math.hypot(x - g.x, z - g.z) < g.r)) continue;
    beplanting.voegToe(kies(['boom-2', 'boom-3']), { x, z, h: 7 + rnd() * 4, rotY: rnd() * Math.PI * 2 });
  }

  // ---------- extra leven in de straat zelf ----------
  ctx.huizen.forEach((cx, i) => {
    // pot met plant aan de deurkant, gieter of emmer in sommige tuinen
    props.zet('pot-klei', cx + 0.5, 0.07, 0.4, i, 1.6);
    beplanting.voegToe(kies(['plant', 'varen']), { x: cx + 0.5, y: 0.42, z: 0.4, w: 0.45 });
    if (i % 3 === 0) props.zet('gieter', cx - 0.4, 0.07, 1.9, i * 1.3, 1.4);
    if (i % 3 === 1) props.zet('emmer', cx - 2.4, 0.07, 2.6, i, 0.8);
    if (i === 3) { props.zet('tuinset', cx - 1.4, 0.07, 1.8, Math.PI / 2); }
  });

  props.bouw(losse);
}
