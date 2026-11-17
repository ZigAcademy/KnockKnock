import * as THREE from 'three';
import { StaticBuilder } from './builder';
import { PROPS, type Prop } from './props';
import type { Inrichting } from './interiors';
import { KAMER, AANRECHT, KEUKEN_DIEPTE, TRAP, trapVak, keukenVakken, controleerInrichting, type Opening, type MeubelPlaatsing } from './vrijeZones';
import { Character, type Look } from '../player/character';
import { dempVertex, type Palet } from '../assets/modellen';
import { THEME, WORLD } from '../theme';

export interface HotspotObject {
  id: string;
  prop: Prop;
  /** Wereldpositie van de pin. */
  anker: THREE.Vector3;
  materials: THREE.MeshStandardMaterial[];
}

/** Standaardkleuren voor de materialen uit de meubelpacks (gedempt; geen oranje). */
const MEUBEL_KLEUR: Record<string, string> = {
  Wood: '#9A7B5F', Wood_Dark: '#6E5644', Wood_Light: '#B89C7E', DarkWood: '#6E5644', Wood1: '#8E7258',
  Black: '#2F3236', White: '#E6E2DA', Grey: '#8A8F96', LightMetal: '#B5B9BE', Metal: '#8A8F96', DarkMetal: '#4A4E55',
  Light: '#FFF1D2', Plant_Green: '#6A8A57', DarkGreen: '#4F6B45', LightOrange: '#B9876A', Kitchen: '#8A9A8C',
  KitchenTop: '#D9D6D0', Legs: '#5E4B3C', Chair: '#5F6670', Cushin: '#8C8F86', Cushing: '#8C8F86', DarkRed: '#8A5E55',
  carpet: '#C9C1B4', carpetDarker: '#A99F92', carpetWhite: '#E6E2DA', plant: '#6A8A57', woodDark: '#6E5644', wood: '#A08262',
  metal: '#9AA0A7', metalDark: '#3E4249', metalMedium: '#7D838A', lamp: '#F2E6CC', glass: '#BFD3E6', _defaultMat: '#9A9A9A',
};
const STOF = /^(Couch_|Sofa$)/;

/**
 * Eén kamer, van voren opengewerkt, met een vaste camera. Herbruikbaar sjabloon:
 * alles (deur, ramen, keuken, meubels, licht, hotspots) komt uit de inrichting
 * per woning (src/world/interiors.ts). Bij het bouwen worden de vrije zones gecontroleerd.
 */
export class Interior {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
  readonly hotspots: HotspotObject[] = [];
  readonly huurder: Character;
  private look = new THREE.Vector3(0, 0.75, -0.35);
  private dir = new THREE.Vector3(0, 0.62, 1).normalize();
  private glow = new Map<string, number>();
  private hover: string | null = null;
  private raycaster = new THREE.Raycaster();
  /** Extra hoogte in beeld voor een kamer met verdieping (m). */
  private extra = 0;

  constructor(inrichting: Inrichting, hotspotIds: string[], huurderLook: Partial<Look>) {
    if (inrichting.kamer.verdieping) { this.extra = inrichting.kamer.verdieping.y * 0.75; this.look.y += this.extra * 0.55; }
    for (const fout of controleerInrichting(inrichting)) console.error(`Inrichting: ${fout}`);
    const s = this.scene;
    s.background = new THREE.Color(THEME.tint);
    this.licht(inrichting);
    s.add(this.buildRoom(inrichting));

    for (const id of hotspotIds) {
      const plaats = inrichting.hotspots[id];
      const maker = plaats && PROPS[plaats.prop];
      if (!maker) { console.warn(`Geen object voor hotspot ${id}`); continue; }
      const prop = maker();
      prop.group.position.set(...plaats.pos);
      prop.group.rotation.y = plaats.rotY ?? 0;
      prop.group.name = `hotspot-${id}`;
      prop.group.userData.hotspot = id;
      s.add(prop.group);
      const materials: THREE.MeshStandardMaterial[] = [];
      prop.group.traverse((o) => {
        const m = (o as THREE.Mesh).material;
        if (m instanceof THREE.MeshStandardMaterial) materials.push(m);
      });
      prop.group.updateMatrixWorld(true);
      this.hotspots.push({ id, prop, anker: prop.group.localToWorld(prop.anker.clone()), materials });
    }

    this.huurder = new Character(huurderLook);
    this.huurder.setBasis('Idle_Neutral');
    const [hx, hz] = inrichting.huurder.pos;
    this.huurder.root.position.set(hx, 0, hz);
    this.huurder.root.rotation.y = inrichting.huurder.rotY;
    s.add(this.huurder.root);
  }

  /** Licht per sfeer: daglicht, grauw regenlicht of avond met warme lampen. */
  private licht(inr: Inrichting): void {
    const s = this.scene;
    const preset = {
      dag: { hemi: ['#FFFFFF', '#B9A88F', 1.6], zon: ['#FFF4E2', 1.8], pos: [3, 7, 5] },
      regen: { hemi: ['#E8EDF4', '#9A9FA6', 1.35], zon: ['#E2E9F2', 1.05], pos: [3.5, 7, 3] },
      avond: { hemi: ['#C5C9DA', '#62584F', 0.75], zon: ['#A9B6D6', 0.45], pos: [-2, 7, 5] },
    }[inr.kamer.licht] as { hemi: [string, string, number]; zon: [string, number]; pos: [number, number, number] };
    s.add(new THREE.HemisphereLight(...preset.hemi));
    const sun = new THREE.DirectionalLight(...preset.zon);
    sun.position.set(...preset.pos);
    sun.target.position.set(0, 0, -0.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 20 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
    s.add(sun, sun.target);
    // warme lampen (zonder schaduw: goedkoop)
    const sterk = inr.kamer.licht === 'avond' ? 3.2 : inr.kamer.licht === 'regen' ? 2.0 : 1.2;
    for (const m of inr.meubels.filter((x) => x.licht)) {
      const l = new THREE.PointLight('#FFD9A6', sterk, 6.5, 1.6);
      l.position.set(m.pos[0], (m.y ?? 0) + m.maat[1] * 0.35, m.pos[1]);
      s.add(l);
    }
  }

  private buildRoom(inr: Inrichting): THREE.Group {
    const k = inr.kamer.kleuren;
    const b = new StaticBuilder();
    const { minX, maxX, minZ, maxZ } = KAMER;
    const v = inr.kamer.verdieping;
    const h = v ? v.y + 2.5 : KAMER.h;
    const W = maxX - minX, D = maxZ - minZ;
    // vloer met plint aan de voorkant (opengewerkt) en planken
    b.box(W + 0.3, 0.2, D + 0.15, 0, -0.2, 0.075, WORLD.wood, { castShadow: false });
    b.box(W, 0.01, D, 0, 0, 0, k.vloer, { castShadow: false });
    const naad = new THREE.Color(k.vloer).multiplyScalar(0.88).getStyle();
    for (let x = minX + 0.5; x < maxX; x += 0.5) b.box(0.012, 0.012, D, x, 0, 0, naad, { castShadow: false });
    // muren met lijst en plint
    b.box(W + 0.3, h, 0.15, 0, 0, minZ - 0.075, k.muur, { castShadow: false });
    b.box(0.15, h, D + 0.15, minX - 0.075, 0, 0.075, k.muur, { castShadow: false });
    b.box(0.15, h, D + 0.15, maxX + 0.075, 0, 0.075, k.muur, { castShadow: false });
    const rand = k.plint ?? WORLD.wallAccent;
    b.box(W + 0.3, 0.12, 0.17, 0, h, minZ - 0.075, rand);
    b.box(0.17, 0.12, D + 0.15, minX - 0.075, h, 0.075, rand);
    b.box(0.17, 0.12, D + 0.15, maxX + 0.075, h, 0.075, rand);
    for (const [x, z, w, d] of [[0, minZ + 0.02, W, 0.04], [minX + 0.02, 0, 0.04, D], [maxX - 0.02, 0, 0.04, D]]) {
      b.box(w, 0.1, d, x, 0, z, rand, { castShadow: false });
    }
    if (v) this.verdieping(b, v, k.vloer, rand);
    this.deur(b, inr.kamer.binnendeur);
    for (const r of inr.kamer.ramen) this.raam(b, r);
    if (inr.kamer.keuken) this.keuken(b, inr);
    for (const m of inr.meubels) this.meubel(b, m, k.stof);
    return b.build();
  }

  /** Overloop achterin (vloer, lage balustrade) en een trap langs de linkerwand. */
  private verdieping(b: StaticBuilder, v: { y: number; diepte: number }, vloer: string, rand: string): void {
    const { minX, maxX, minZ } = KAMER;
    const W = maxX - minX, z1 = minZ + v.diepte;
    // vloer van de overloop met een dikke rand
    b.box(W, 0.18, v.diepte, 0, v.y - 0.18, minZ + v.diepte / 2, '#E9E5DD');
    b.box(W, 0.012, v.diepte, 0, v.y, minZ + v.diepte / 2, vloer, { castShadow: false });
    b.box(W, 0.2, 0.06, 0, v.y - 0.2, z1, rand);
    // lage balustrade (spijlen + leuning), vrij boven de trap
    const x0 = minX + TRAP.breedte + 0.05;
    for (let x = x0; x <= maxX - 0.05; x += 0.22) b.box(0.035, 0.62, 0.035, x, v.y, z1 - 0.04, '#F1EFEA');
    b.box(maxX - x0, 0.06, 0.08, (x0 + maxX) / 2, v.y + 0.62, z1 - 0.04, '#9A7B5F');
    // trap: treden van onder (vóór) naar boven (achter)
    const t = trapVak(v);
    const stap = v.y / TRAP.aantal, diep = (t.maxZ - t.minZ) / TRAP.aantal;
    const tx = (t.minX + t.maxX) / 2;
    for (let i = 0; i < TRAP.aantal; i++) {
      const z = t.maxZ - (i + 0.5) * diep;
      b.box(TRAP.breedte, 0.05, diep + 0.02, tx, (i + 1) * stap - 0.05, z, '#9A7B5F');
      b.box(TRAP.breedte, (i + 1) * stap - 0.05, 0.03, tx, 0, z + diep / 2, '#F1EFEA', { castShadow: false });
    }
    // trapboom aan de open kant, met leuning
    const len = Math.hypot(t.maxZ - t.minZ, v.y);
    const boom = new THREE.BoxGeometry(0.06, 0.25, len).rotateX(Math.atan2(v.y, t.maxZ - t.minZ));
    b.addAt(boom, '#E9E5DD', new THREE.Matrix4().makeTranslation(t.maxX, v.y / 2 - 0.05, (t.minZ + t.maxZ) / 2));
    const leuning = new THREE.BoxGeometry(0.05, 0.05, len).rotateX(Math.atan2(v.y, t.maxZ - t.minZ));
    b.addAt(leuning, '#9A7B5F', new THREE.Matrix4().makeTranslation(t.maxX, v.y / 2 + 0.85, (t.minZ + t.maxZ) / 2));
  }

  /** Lokale matrix voor iets tegen een wand (x langs de wand, z de kamer in). */
  private wandMatrix(o: Opening, y = 0): THREE.Matrix4 {
    const { minX, maxX, minZ } = KAMER;
    if (o.wand === 'achter') return new THREE.Matrix4().makeTranslation(o.pos, y, minZ);
    if (o.wand === 'links') return new THREE.Matrix4().makeTranslation(minX, y, o.pos).multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2));
    return new THREE.Matrix4().makeTranslation(maxX, y, o.pos).multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2));
  }

  private deur(b: StaticBuilder, o: Opening): void {
    const m = this.wandMatrix(o);
    const bw = o.breedte;
    b.addAt(new THREE.BoxGeometry(bw + 0.12, 2.18, 0.06).translate(0, 1.09, 0.03), WORLD.frame, m.clone(), { castShadow: false });
    b.addAt(new THREE.BoxGeometry(bw - 0.06, 2.06, 0.07).translate(0, 1.03, 0.04), '#E3DED5', m.clone(), { castShadow: false });
    b.addAt(new THREE.BoxGeometry(bw - 0.3, 0.7, 0.075).translate(0, 1.45, 0.04), '#DCD6CB', m.clone(), { castShadow: false });
    b.addAt(new THREE.BoxGeometry(0.1, 0.03, 0.06).translate(bw / 2 - 0.15, 1.0, 0.09), WORLD.metal, m.clone(), { castShadow: false });
  }

  private raam(b: StaticBuilder, o: Opening): void {
    const m = this.wandMatrix(o);
    const bw = o.breedte;
    b.addAt(new THREE.BoxGeometry(bw + 0.2, 1.4, 0.06).translate(0, 1.7, 0.03), WORLD.frame, m.clone(), { castShadow: false });
    b.addAt(new THREE.BoxGeometry(bw, 1.2, 0.07).translate(0, 1.7, 0.04), '#BFD3E6', m.clone(), { castShadow: false });
    b.addAt(new THREE.BoxGeometry(0.06, 1.2, 0.08).translate(0, 1.7, 0.05), WORLD.frame, m.clone(), { castShadow: false });
    b.addAt(new THREE.BoxGeometry(bw + 0.4, 0.06, 0.25).translate(0, 0.97, 0.12), WORLD.frame, m.clone());
  }

  /** Keukenblok langs de achterwand: Quaternius-modules, anders primitieven. */
  private keuken(b: StaticBuilder, inr: Inrichting): void {
    const kk = inr.kamer.keuken!;
    const kast = inr.kamer.kleuren.keuken ?? WORLD.cabinet;
    const palet: Palet = (n) => (n === 'Kitchen' ? kast : n === 'KitchenTop' ? WORLD.counter : MEUBEL_KLEUR[n]);
    const z = KAMER.minZ + KEUKEN_DIEPTE / 2;
    for (const v of keukenVakken(kk)) {
      const w = v.maxX - v.minX, x = (v.minX + v.maxX) / 2;
      if (v.soort === 'koelkast') {
        if (!b.model('meubels', 'koelkast', { x, z: (v.minZ + v.maxZ) / 2, fit: [w, v.top, v.maxZ - v.minZ] }, (n) => (n === 'White' ? '#E6E8EA' : MEUBEL_KLEUR[n]))) {
          b.box(w, v.top, v.maxZ - v.minZ, x, 0, (v.minZ + v.maxZ) / 2, '#E6E8EA');
        }
        continue;
      }
      const model = v.soort === 'oven' ? 'keuken-oven' : 'keuken-lades';
      if (!b.model('meubels', model, { x, z, fit: [w, AANRECHT, KEUKEN_DIEPTE] }, palet)) {
        b.box(w, AANRECHT - 0.06, KEUKEN_DIEPTE, x, 0, z, kast);
        b.box(w + 0.02, 0.06, KEUKEN_DIEPTE + 0.04, x, AANRECHT - 0.06, z, WORLD.counter);
      }
      if (v.soort === 'spoelbak') b.box(w * 0.7, 0.012, 0.38, x, AANRECHT + 0.001, z - 0.03, '#8E949B', { castShadow: false });
    }
    // tegelwand en bovenkastjes
    b.box(kk.x1 - kk.x0, 0.6, 0.02, (kk.x0 + kk.x1) / 2, AANRECHT, KAMER.minZ + 0.01, '#E4E0D8', { castShadow: false });
    for (const x of kk.bovenkast ?? []) {
      b.box(0.9, 0.65, 0.34, x, 1.55, KAMER.minZ + 0.17, kast);
      b.box(0.012, 0.55, 0.01, x, 1.6, KAMER.minZ + 0.345, new THREE.Color(kast).multiplyScalar(0.8).getStyle(), { castShadow: false });
    }
  }

  private meubel(b: StaticBuilder, m: MeubelPlaatsing, stof?: string): void {
    const [w, h, d] = m.maat;
    const y = m.y ?? 0;
    if (m.model.startsWith('proc:')) { this.procMeubel(b, m); return; }
    const palet: Palet = (n) => m.kleur?.[n] ?? (stof && STOF.test(n) ? stof : MEUBEL_KLEUR[n]);
    const kit = m.kit ?? 'meubels';
    const ok = b.model(kit, m.model, { x: m.pos[0], y, z: m.pos[1], rotY: m.rotY ?? 0, fit: [w, h, d] }, kit === 'eten' ? undefined : palet,
      { castShadow: h > 0.05, nabewerk: kit === 'eten' ? (g) => dempVertex(g, 0.65) : undefined });
    if (!ok) {
      // terugval: een eenvoudig blok in de juiste maat
      const g = new THREE.BoxGeometry(w, h, d).translate(0, h / 2, 0);
      b.addAt(g, h < 0.05 ? '#C9C1B4' : WORLD.fabric, new THREE.Matrix4().makeTranslation(m.pos[0], y, m.pos[1]).multiply(new THREE.Matrix4().makeRotationY(m.rotY ?? 0)), { castShadow: h > 0.05 });
    }
  }

  /** Kleine objecten uit primitieven: lijstjes, radiator, fietshelm. */
  private procMeubel(b: StaticBuilder, m: MeubelPlaatsing): void {
    const [w, h, d] = m.maat;
    const mat = new THREE.Matrix4().makeTranslation(m.pos[0], m.y ?? 0, m.pos[1]).multiply(new THREE.Matrix4().makeRotationY(m.rotY ?? 0));
    const kleur = m.kleur?.vlak ?? '#9FB2A0';
    if (m.model === 'proc:lijst') {
      // ingelijste print: lijst, passe-partout en een paar rustige vlakken (geen tekst)
      b.addAt(new THREE.BoxGeometry(w, h, d).translate(0, 0, d / 2), '#5E4B3C', mat.clone(), { castShadow: false });
      b.addAt(new THREE.BoxGeometry(w - 0.06, h - 0.06, d).translate(0, 0, d / 2 + 0.003), '#F1EDE6', mat.clone(), { castShadow: false });
      b.addAt(new THREE.BoxGeometry(w * 0.6, h * 0.35, d).translate(-w * 0.05, h * 0.12, d / 2 + 0.006), kleur, mat.clone(), { castShadow: false });
      const tweede = new THREE.Color(kleur).multiplyScalar(0.75).getStyle();
      b.addAt(new THREE.BoxGeometry(w * 0.35, h * 0.3, d).translate(w * 0.1, -h * 0.18, d / 2 + 0.008), tweede, mat.clone(), { castShadow: false });
    } else if (m.model === 'proc:kleed' || m.model === 'proc:kleed-rond') {
      // vloerkleed met rand (net boven de vloer)
      const rand = m.kleur?.rand ?? new THREE.Color(kleur).multiplyScalar(0.8).getStyle();
      const rond = m.model === 'proc:kleed-rond';
      const vorm = (bw: number, bd: number, y: number) => (rond ? new THREE.CylinderGeometry(0.5, 0.5, 0.008, 28).scale(bw, 1, bd) : new THREE.BoxGeometry(bw, 0.008, bd)).translate(0, y, 0);
      b.addAt(vorm(w, d, 0.016), rand, mat.clone(), { castShadow: false });
      b.addAt(vorm(w - 0.16, d - 0.16, 0.019), kleur, mat.clone(), { castShadow: false });
    } else if (m.model === 'proc:radiator') {
      for (let i = 0; i < 9; i++) b.addAt(new THREE.BoxGeometry(w / 10, h, d).translate(-w / 2 + (i + 0.5) * (w / 9), h / 2 + 0.12, 0), '#E9E7E2', mat.clone());
    } else if (m.model === 'proc:helm') {
      b.addAt(new THREE.SphereGeometry(0.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(w, h * 2, d), kleur, mat.clone());
      b.addAt(new THREE.TorusGeometry(w * 0.35, 0.01, 4, 10).rotateX(Math.PI / 2).translate(0, -0.06, 0), '#2E3033', mat.clone());
    }
  }

  /** Camera past zich aan de beeldverhouding aan, zodat de kamer altijd in beeld is. */
  resize(w: number, h: number): void {
    const aspect = w / h;
    this.camera.aspect = aspect;
    const vHalf = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * aspect);
    const nodigBreed = 4.7 / Math.tan(hHalf);
    const nodigHoog = (3.6 + this.extra) / Math.tan(vHalf);
    const dist = Math.max(nodigBreed, nodigHoog, 7);
    this.camera.position.copy(this.look).addScaledVector(this.dir, dist);
    this.camera.lookAt(this.look);
    this.camera.updateProjectionMatrix();
  }

  setHover(id: string | null): void { this.hover = id; }

  /** Hotspot onder een schermpunt (CSS-pixels), of null. */
  pick(x: number, y: number, w: number, h: number): string | null {
    this.raycaster.setFromCamera(new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1), this.camera);
    const hits = this.raycaster.intersectObjects(this.hotspots.map((hs) => hs.prop.group), true);
    for (const hit of hits) {
      let o: THREE.Object3D | null = hit.object;
      while (o && !o.userData.hotspot) o = o.parent;
      if (o) return o.userData.hotspot as string;
    }
    return null;
  }

  project(p: THREE.Vector3, w: number, h: number): { x: number; y: number } {
    const v = p.clone().project(this.camera);
    return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * h };
  }

  update(dt: number, t: number, reducedMotion: boolean): void {
    for (const hs of this.hotspots) {
      hs.prop.update?.(dt, t);
      const doel = hs.id === this.hover ? 1 : 0;
      const cur = this.glow.get(hs.id) ?? 0;
      const v = cur + (doel - cur) * (1 - Math.exp(-dt * 12));
      this.glow.set(hs.id, v);
      const pulse = reducedMotion ? 1 : 0.8 + 0.2 * Math.sin(t * 6);
      for (const m of hs.materials) { m.emissive.set(THEME.orange); m.emissiveIntensity = v * 0.55 * pulse; }
    }
    this.huurder.animate(dt, 0);
  }
}
