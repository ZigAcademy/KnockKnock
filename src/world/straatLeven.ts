import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { Character } from '../player/character';
import { DECOR_LOOKS } from './looks';
import { voertuig, VOERTUIG_VOOR } from './voertuigen';
import { rondjeRoute } from './ringweg';
import { LAGE_RESOLUTIE } from '../game/versie';
const LAYOUT_WEST = -14;
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js';
import { MODELLEN, kitMesh, demp } from '../assets/modellen';
import { herkleurLak } from './paletten';
import { woordmerkVerfMateriaal, WOORDMERK_VERHOUDING } from './logos';
import type { Collider } from './collision';
import { geluid } from '../audio/geluid';

/**
 * Leven in de straat (fase 4b): voorbijgangers, een hond aan de lijn, een auto die
 * rustig rondrijdt en een lucht met wolken. Puur decor: geen tekst, geen interactie.
 * Alles houdt rekening met de speler (uitwijken, stoppen).
 */

interface Pad { z: number; x0: number; x1: number; zMin: number; zMax: number }

class Voorbijganger {
  readonly char: Character;
  x: number; z: number;
  private dir: 1 | -1;
  private off = 0;
  private wacht = 0;
  private v = 0;
  readonly collider: Collider;

  constructor(look: number, private pad: Pad, start: number, dir: 1 | -1, private snelheid: number, private hoogte: number) {
    this.char = new Character(DECOR_LOOKS[look % DECOR_LOOKS.length]);
    this.char.root.name = 'voorbijganger';
    this.x = start; this.z = pad.z; this.dir = dir;
    this.collider = { minX: 0, maxX: 0, minZ: 0, maxZ: 0, height: 1.8, camBlock: false };
  }

  get positie(): THREE.Vector3 { return this.char.root.position; }
  get offset(): number { return this.off; }
  get richting(): number { return this.dir; }
  get staatStil(): boolean { return this.v < 0.1; }

  update(dt: number, speler: THREE.Vector3): void {
    const p = this.pad;
    let doelV = this.snelheid;
    if (this.wacht > 0) { this.wacht -= dt; doelV = 0; }
    // uitwijken als de speler voor je staat
    const voor = (speler.x - this.x) * this.dir;
    const lat = speler.z - (p.z + this.off);
    let doelOff = 0;
    if (voor > -0.4 && voor < 2.4 && Math.abs(lat) < 1.0) {
      const naarMin = p.z - 0.8 >= p.zMin, naarMax = p.z + 0.8 <= p.zMax;
      if (lat > 0 && naarMin) doelOff = -0.8; else if (lat <= 0 && naarMax) doelOff = 0.8;
      else if (naarMin) doelOff = -0.8; else if (naarMax) doelOff = 0.8;
      // te dichtbij en geen ruimte: even wachten
      if (voor < 0.9 && Math.abs(speler.z - (p.z + doelOff)) < 0.7) doelV = 0;
    }
    // nooit tegen de speler aan lopen: heel dichtbij en je loopt erheen → stilstaan
    if (Math.hypot(speler.x - this.x, speler.z - this.z) < 0.85 && voor > -0.2) doelV = 0;
    this.off += (doelOff - this.off) * (1 - Math.exp(-dt * 3));
    this.v += (doelV - this.v) * (1 - Math.exp(-dt * 4));
    this.x += this.dir * this.v * dt;
    if ((this.dir > 0 && this.x > p.x1) || (this.dir < 0 && this.x < p.x0)) {
      this.dir = this.dir > 0 ? -1 : 1;
      this.wacht = 1.5 + Math.random() * 2;
    }
    this.z = THREE.MathUtils.clamp(p.z + this.off, p.zMin, p.zMax);
    const r = this.char.root;
    r.position.set(this.x, this.hoogte, this.z);
    const want = Math.atan2(this.dir, (doelOff - this.off) * 0.8);
    let diff = want - r.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    r.rotation.y += diff * (1 - Math.exp(-dt * 8));
    this.char.animate(dt, this.v);
    const c = this.collider;
    c.minX = this.x - 0.22; c.maxX = this.x + 0.22; c.minZ = this.z - 0.22; c.maxZ = this.z + 0.22;
  }
}

/** Hond die naast het baasje loopt (Quaternius-dier, gedempte vacht). */
class Hond {
  readonly root = new THREE.Group();
  private mixer: THREE.AnimationMixer | null = null;
  private walk: THREE.AnimationAction | null = null;
  private idle: THREE.AnimationAction | null = null;
  private lijn: THREE.Line;
  private lijnPos: Float32Array;

  constructor(scene: THREE.Scene) {
    const g = MODELLEN.dieren.get('hond');
    if (g) {
      const m = SkeletonUtils.clone(g.scene) as THREE.Object3D;
      m.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        mesh.frustumCulled = false;
        const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((mt) => {
          const c = (mt as THREE.MeshStandardMaterial).clone();
          c.color = demp(c.color.getHex(), 0.55, -0.02);
          return c;
        });
        mesh.material = Array.isArray(mesh.material) ? mats : mats[0];
      });
      const box = new THREE.Box3().setFromObject(m);
      m.scale.setScalar(0.55 / Math.max(0.01, box.max.y - box.min.y));
      this.root.add(m);
      this.mixer = new THREE.AnimationMixer(m);
      const clip = (n: string) => g.animations.find((a) => a.name === n);
      const w = clip('Walk'), i = clip('Idle');
      if (w) { this.walk = this.mixer.clipAction(w); this.walk.play(); }
      if (i) { this.idle = this.mixer.clipAction(i); this.idle.play(); }
    } else {
      // terugval: eenvoudige hond uit primitieven
      const mat = new THREE.MeshStandardMaterial({ color: '#8C7560', roughness: 0.9, flatShading: true });
      const lijf = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.55), mat); lijf.position.y = 0.33;
      const kop = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.2), mat); kop.position.set(0, 0.46, 0.32);
      for (const [x, z] of [[-0.08, -0.2], [0.08, -0.2], [-0.08, 0.2], [0.08, 0.2]]) {
        const poot = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.25, 0.06), mat); poot.position.set(x, 0.12, z); this.root.add(poot);
      }
      this.root.add(lijf, kop);
    }
    this.lijnPos = new Float32Array(6);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.lijnPos, 3));
    this.lijn = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#3A3D42' }));
    this.lijn.frustumCulled = false;
    scene.add(this.root, this.lijn);
  }

  update(dt: number, baas: Voorbijganger): void {
    const bp = baas.positie;
    const dir = baas.richting;
    // naast het baasje, iets vooruit; aan de kant waar ruimte is
    const zij = baas.offset > 0.1 ? -0.55 : 0.55;
    const doel = new THREE.Vector3(bp.x + dir * 0.75, bp.y, THREE.MathUtils.clamp(bp.z + zij, 3.65, 5.35));
    const r = this.root;
    const oud = r.position.clone();
    r.position.lerp(doel, 1 - Math.exp(-dt * 5));
    const v = oud.distanceTo(r.position) / Math.max(dt, 1e-4);
    if (v > 0.05) r.rotation.y = Math.atan2(r.position.x - oud.x, r.position.z - oud.z);
    const loop = THREE.MathUtils.smoothstep(v, 0.1, 0.6);
    this.walk?.setEffectiveWeight(loop);
    this.idle?.setEffectiveWeight(1 - loop);
    if (this.walk) this.walk.timeScale = THREE.MathUtils.clamp(v / 1.1, 0.6, 1.6);
    this.mixer?.update(dt);
    // riem van de hand naar de halsband
    const hand = bp.clone().add(new THREE.Vector3(0, 0.9, 0)).addScaledVector(new THREE.Vector3(0, 0, Math.sign(zij)), 0.25);
    const hals = r.position.clone().add(new THREE.Vector3(Math.sin(r.rotation.y) * 0.22, 0.4, Math.cos(r.rotation.y) * 0.22));
    this.lijnPos.set([hand.x, hand.y, hand.z, hals.x, hals.y, hals.z]);
    this.lijn.geometry.getAttribute('position').needsUpdate = true;
  }
}

/** Grijze carrosserie (licht, weinig kleur) naar een frisse witte lak; ramen en banden blijven. */
function maakWit(geo: THREE.BufferGeometry): void {
  const col = geo.getAttribute('color') as THREE.BufferAttribute | undefined;
  if (!col) return;
  const c = new THREE.Color(), hsl = { h: 0, s: 0, l: 0 }, wit = new THREE.Color('#F4F6F8');
  for (let i = 0; i < col.count; i++) {
    c.setRGB(col.getX(i), col.getY(i), col.getZ(i)).getHSL(hsl);
    if (hsl.l > 0.3 && hsl.s < 0.25) { c.lerp(wit, 0.7); col.setXYZ(i, c.r, c.g, c.b); }
  }
  col.needsUpdate = true;
}

/** Auto die rustig rondjes rijdt en stopt als de speler (of iemand) voor hem staat. */
class RijdendeAuto {
  readonly mesh: THREE.Object3D;
  readonly collider: Collider;
  private s = 0;
  private v = 0;
  private wacht = 0;
  private gestoptBij = new Set<number>();
  private doelX: number | null = null;
  private readonly lengte: number;
  /** x-posities waar dit voertuig even stopt (westwaarts, aan de kant van de huizen). */
  stopPlekken: () => number[] = () => [];
  // route: oostwaarts op z1, keren, westwaarts op z2, keren
  private readonly x0 = -10.5; private readonly x1 = 37.5;
  private readonly z1 = 9.85; private readonly z2 = 7.3;
  private readonly r = (9.85 - 7.3) / 2;

  constructor(scene: THREE.Scene, opts: { model?: string; lak?: string; start?: number; logo?: boolean; echt?: string } = {}) {
    const lak = opts.lak ?? '#6B7A8C';
    this.s = opts.start ?? 0;
    // realistische auto uit de voertuigen-kit; anders de oude Kenney-auto (lage resolutie)
    const echt = voertuig(opts.echt ?? VOERTUIG_VOOR[opts.model ?? 'hatchback'] ?? 'hatchback');
    const m = echt ? null : kitMesh('autos', opts.model ?? 'hatchback', { w: opts.model === 'van' ? 1.7 : 1.5 });
    if (echt) {
      this.mesh = echt;
    } else if (m) {
      herkleurLak(m.geometry, lak);
      if (opts.logo) maakWit(m.geometry);
      this.mesh = m;
    } else {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: lak, roughness: 0.7, flatShading: true });
      const romp = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 2.8), mat); romp.position.y = 0.55;
      const dak = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 1.5), mat); dak.position.set(0, 1.1, -0.2);
      g.add(romp, dak);
      g.traverse((o) => { o.castShadow = true; });
      this.mesh = g;
    }
    if (opts.logo) {
      // logo van de corporatie op beide zijkanten (wisselt mee met de taal)
      // Het logo komt plat op het vlakke deel van de zijkant: boven de wielkasten, onder de ramen,
      // achter de spiegel. De afstand tot de zijkant meten we met een straal (geen buitenmaat:
      // die bevat ook spiegels en bumpers).
      this.mesh.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(this.mesh);
      const lengte = b.max.z - b.min.z, hoogte = b.max.y - b.min.y;
      // vrije strook tussen de rand van de wielkasten (±50%) en de ramen (±66% van de hoogte)
      // pick-up (realistisch): op de portieren van de cabine; oude bus: achter de spiegel
      const y = b.min.y + hoogte * (echt ? 0.47 : 0.575);
      const zc = (b.min.z + b.max.z) / 2 + lengte * (echt ? 0.1 : -0.15);
      const lw = lengte * (echt ? 0.25 : 0.4), lh = lw / WOORDMERK_VERHOUDING;
      const straal = new THREE.Raycaster();
      const groep = new THREE.Group();
      // realistische pick-up: het logo als decal óp de carrosserie (volgt de bolling van het portier),
      // op het voorportier tussen de sierstrip (±0,71 m) en de deurgreep (±0,97 m); gemeten met tools/autos/omzet.ts zij()
      const lijf = echt ? (echt.getObjectByProperty('name', 'pickup-wit-body') as THREE.Mesh | undefined) : undefined;
      if (lijf) {
        const breed = 0.95, hoog = breed / WOORDMERK_VERHOUDING, dy = 0.835, dz = 0.62;
        for (const kant of [-1, 1]) {
          straal.set(new THREE.Vector3(kant * 5, dy, dz), new THREE.Vector3(-kant, 0, 0));
          const raak = straal.intersectObject(lijf, false)[0];
          if (!raak) continue;
          const geo = new DecalGeometry(lijf, raak.point, new THREE.Euler(0, kant * Math.PI / 2, 0), new THREE.Vector3(breed, hoog, 0.35));
          const decal = new THREE.Mesh(geo, woordmerkVerfMateriaal());
          decal.name = 'busje-logo';
          decal.receiveShadow = true;
          groep.add(decal);
        }
      }
      for (const kant of lijf ? [] : [-1, 1]) {
        straal.set(new THREE.Vector3(kant * 5, y, zc), new THREE.Vector3(-kant, 0, 0));
        const raak = straal.intersectObject(this.mesh, true)[0];
        const x = raak ? raak.point.x : kant * b.max.x;
        const vlak = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), woordmerkVerfMateriaal());
        vlak.rotation.y = kant * Math.PI / 2;
        vlak.position.set(x + kant * 0.003, y, zc);
        vlak.name = 'busje-logo';
        vlak.receiveShadow = true;
        groep.add(vlak);
      }
      const geheel = new THREE.Group();
      geheel.add(this.mesh, groep);
      this.mesh = geheel;
    }
    const box = new THREE.Box3().setFromObject(this.mesh);
    this.lengte = box.max.z - box.min.z;
    this.collider = { minX: 0, maxX: 0, minZ: 0, maxZ: 0, height: 1.4, camBlock: false };
    scene.add(this.mesh);
  }

  /** Eigen route (gesloten kromme), bijv. het rondje over de ringweg; anders de lus in de straat. */
  private route: THREE.CatmullRomCurve3 | null = null;
  private routeLengte = 0;
  volgRoute(c: THREE.CatmullRomCurve3): void { this.route = c; this.routeLengte = c.getLength(); this.s = 0; }

  private get totaal(): number { if (this.route) return this.routeLengte; const L = this.x1 - this.x0; return 2 * L + 2 * Math.PI * this.r; }

  /** Positie en kijkrichting op afstand s langs de route. */
  private pose(s: number): { p: THREE.Vector3; d: THREE.Vector3 } {
    if (this.route) {
      const u = (((s % this.routeLengte) + this.routeLengte) % this.routeLengte) / this.routeLengte;
      return { p: this.route.getPointAt(u), d: this.route.getTangentAt(u).setY(0).normalize() };
    }
    const L = this.x1 - this.x0, boog = Math.PI * this.r;
    s = ((s % this.totaal) + this.totaal) % this.totaal;
    const cz = (this.z1 + this.z2) / 2;
    if (s < L) return { p: new THREE.Vector3(this.x0 + s, 0, this.z1), d: new THREE.Vector3(1, 0, 0) };
    s -= L;
    if (s < boog) { const a = s / this.r; return { p: new THREE.Vector3(this.x1 + Math.sin(a) * this.r, 0, cz + Math.cos(a) * this.r), d: new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)) }; }
    s -= boog;
    if (s < L) return { p: new THREE.Vector3(this.x1 - s, 0, this.z2), d: new THREE.Vector3(-1, 0, 0) };
    s -= L;
    const a = s / this.r;
    return { p: new THREE.Vector3(this.x0 - Math.sin(a) * this.r, 0, cz - Math.cos(a) * this.r), d: new THREE.Vector3(-Math.cos(a), 0, Math.sin(a)) };
  }

  get snelheid(): number { return this.v; }

  get positie(): THREE.Vector3 { return this.pose(this.s).p; }
  get richting(): THREE.Vector3 { return this.pose(this.s).d; }

  /** obstakels: mensen; voertuigen tellen alleen als ze dezelfde kant op rijden (geen patstelling). */
  update(dt: number, obstakels: THREE.Vector3[], voertuigen: RijdendeAuto[] = []): void {
    const { p, d } = this.pose(this.s);
    // op de ringweg mag het harder; in de straat rustig
    let doelV = this.route && (p.x < LAYOUT_WEST || p.z < 3 || p.z > 15) ? 7.5 : 3.2;
    const voor = (o: THREE.Vector3, ruimte: number) => {
      const rel = o.clone().sub(p).setY(0);
      const v = rel.dot(d), lat = Math.abs(rel.x * d.z - rel.z * d.x);
      return v > -0.6 && v < this.lengte / 2 + ruimte && lat < 1.8;
    };
    for (const o of obstakels) if (voor(o, 5.5)) doelV = 0;
    for (const a of voertuigen) if (a !== this && a.richting.dot(d) > 0.3 && voor(a.positie, 4.5) && a.positie.clone().sub(p).dot(d) > 0) doelV = 0;
    // even stoppen voor een geholpen woning (westwaarts rijden, langs de huizen); niet bij een eigen route
    if (this.route) { this.bijwerken(dt, doelV); return; }
    const L = this.x1 - this.x0, boog = Math.PI * this.r;
    const sm = ((this.s % this.totaal) + this.totaal) % this.totaal;
    // per rondje één willekeurige geholpen woning (anders stopt het bij elke deur)
    if (sm < L) this.gestoptBij.clear();
    if (sm > L && sm < L + boog && this.doelX === null) {
      const plekken = this.stopPlekken();
      this.doelX = plekken.length ? plekken[Math.floor(Math.random() * plekken.length)] : NaN;
    }
    if (sm > L + boog && sm < 2 * L + boog && this.doelX !== null && !Number.isNaN(this.doelX)) {
      if (!this.gestoptBij.has(this.doelX) && Math.abs(p.x - this.doelX) < 0.3) { this.gestoptBij.add(this.doelX); this.wacht = 4; }
    }
    if (sm < L) this.doelX = null;
    if (this.wacht > 0) { this.wacht -= dt; doelV = 0; }
    this.bijwerken(dt, doelV);
  }

  private bijwerken(dt: number, doelV: number): void {
    this.v += (doelV - this.v) * (1 - Math.exp(-dt * (doelV < this.v ? 4 : 1.2)));
    this.s += this.v * dt;
    const n = this.pose(this.s);
    this.mesh.position.set(n.p.x, 0.01, n.p.z);
    this.mesh.rotation.y = Math.atan2(n.d.x, n.d.z);
    const hl = this.lengte / 2 + 0.1, hw = 0.8;
    const ex = Math.abs(n.d.x) * hl + Math.abs(n.d.z) * hw, ez = Math.abs(n.d.z) * hl + Math.abs(n.d.x) * hw;
    const c = this.collider;
    c.minX = n.p.x - ex; c.maxX = n.p.x + ex; c.minZ = n.p.z - ez; c.maxZ = n.p.z + ez;
  }
}

/** Lucht als koepel met een zacht verloop, en wolken van samengevoegde blokjes (1 draw call). */
function maakLucht(): { koepel: THREE.Mesh; wolken: THREE.Mesh } {
  const geo = new THREE.SphereGeometry(170, 24, 12);
  const pos = geo.getAttribute('position');
  const col = new Float32Array(pos.count * 3);
  const laag = new THREE.Color('#E1E9F7'), hoog = new THREE.Color('#A9C2EA'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp(pos.getY(i) / 170, 0, 1);
    c.copy(laag).lerp(hoog, Math.pow(t, 0.6));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const koepel = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }));
  koepel.renderOrder = -1;
  koepel.name = 'lucht';

  const delen: THREE.BufferGeometry[] = [];
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  for (let k = 0; k < 11; k++) {
    const cx = -60 + rnd() * 170, cz = -70 + rnd() * 150, cy = 38 + rnd() * 16;
    const n = 3 + Math.floor(rnd() * 3);
    for (let j = 0; j < n; j++) {
      const r = 3.5 + rnd() * 3.5;
      const g = new THREE.IcosahedronGeometry(r, 0).scale(1.4, 0.55, 1).translate(cx + (j - n / 2) * r * 1.2, cy + rnd() * 1.5, cz + (rnd() - 0.5) * 4);
      delen.push(g.index ? g.toNonIndexed() : g);
    }
  }
  let n = 0;
  for (const g of delen) n += g.getAttribute('position').count;
  const P = new Float32Array(n * 3);
  let o = 0;
  for (const g of delen) { P.set(g.getAttribute('position').array as Float32Array, o); o += g.getAttribute('position').count * 3; }
  const wg = new THREE.BufferGeometry();
  wg.setAttribute('position', new THREE.BufferAttribute(P, 3));
  wg.computeVertexNormals();
  const wolken = new THREE.Mesh(wg, new THREE.MeshLambertMaterial({ color: '#F7F8FB', emissive: '#C9D3E6', emissiveIntensity: 0.35, flatShading: true, fog: false }));
  wolken.name = 'wolken';
  return { koepel, wolken };
}

export class StraatLeven {
  private mensen: Voorbijganger[] = [];
  private hond: Hond | null = null;
  private auto: RijdendeAuto;
  /** Busje van de corporatie (met logo): stopt even voor woningen die geholpen zijn. */
  readonly busje: RijdendeAuto;
  private koepel: THREE.Mesh;
  private wolken: THREE.Mesh;
  /** HDRI-lucht geladen: getekende koepel en wolken uit. */
  echteLucht(): void { this.koepel.visible = false; this.wolken.visible = false; }
  private t = 0;

  constructor(scene: THREE.Scene, colliders: Collider[]) {
    // overkant: rustig heen en weer; deze kant: met de hond
    const overkant = new Voorbijganger(0, { z: 13.1, x0: -12, x1: 38, zMin: 12.75, zMax: 13.35 }, 4, 1, 1.25, 0.08);
    const metHond = new Voorbijganger(1, { z: 4.25, x0: -11.5, x1: 38, zMin: 3.7, zMax: 5.1 }, 30, -1, 1.05, 0.08);
    this.mensen.push(overkant, metHond);
    for (const m of this.mensen) { scene.add(m.char.root); colliders.push(m.collider); }
    this.hond = new Hond(scene);
    this.auto = new RijdendeAuto(scene);
    // standaardversie: de auto rijdt een rondje over de ringweg om het blok
    if (!LAGE_RESOLUTIE) this.auto.volgRoute(rondjeRoute());
    this.busje = new RijdendeAuto(scene, { model: 'van', lak: '#EEF1F4', start: 62, logo: true, echt: 'pickup-wit' });
    this.busje.mesh.name = 'busje';
    colliders.push(this.auto.collider, this.busje.collider);
    const l = maakLucht();
    this.koepel = l.koepel; this.wolken = l.wolken;
    scene.add(this.koepel, this.wolken);
  }

  update(dt: number, camera: THREE.Camera, speler: THREE.Vector3, reducedMotion: boolean): void {
    for (const m of this.mensen) {
      m.update(dt, speler);
      // even naar de speler kijken als die vlakbij staat
      m.char.kijkNaar = m.positie.distanceTo(speler) < 3.5 ? speler.clone().setY(speler.y + 1.6) : null;
    }
    if (this.hond) this.hond.update(dt, this.mensen[1]);
    const mensen = [speler, ...this.mensen.map((m) => m.positie)];
    this.auto.update(dt, mensen, [this.busje]);
    this.busje.update(dt, mensen, [this.auto]);
    // motorgeluid: luider dichterbij, links/rechts ten opzichte van de camera
    const rel = this.auto.mesh.position.clone().sub(camera.position);
    const rechts = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    geluid.motor(rel.length(), this.auto.snelheid, rel.clone().normalize().dot(rechts));
    this.koepel.position.copy(camera.position);
    // wolken drijven langzaam heen en weer (geen sprongen)
    if (!reducedMotion) { this.t += dt; this.wolken.position.x = Math.sin(this.t * 0.012) * 30; }
  }
}
