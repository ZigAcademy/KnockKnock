import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { Character } from '../player/character';
import { DECOR_LOOKS } from './looks';
import { MODELLEN, kitMesh, demp } from '../assets/modellen';
import { herkleurLak } from './paletten';
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

/** Auto die rustig rondjes rijdt en stopt als de speler (of iemand) voor hem staat. */
class RijdendeAuto {
  readonly mesh: THREE.Object3D;
  readonly collider: Collider;
  private s = 0;
  private v = 0;
  private readonly lengte: number;
  // route: oostwaarts op z1, keren, westwaarts op z2, keren
  private readonly x0 = -10.5; private readonly x1 = 37.5;
  private readonly z1 = 9.85; private readonly z2 = 7.3;
  private readonly r = (9.85 - 7.3) / 2;

  constructor(scene: THREE.Scene) {
    const m = kitMesh('autos', 'hatchback', { w: 1.5 });
    if (m) {
      herkleurLak(m.geometry, '#6B7A8C');
      this.mesh = m;
    } else {
      const g = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: '#6B7A8C', roughness: 0.7, flatShading: true });
      const romp = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.7, 2.8), mat); romp.position.y = 0.55;
      const dak = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 1.5), mat); dak.position.set(0, 1.1, -0.2);
      g.add(romp, dak);
      g.traverse((o) => { o.castShadow = true; });
      this.mesh = g;
    }
    const box = new THREE.Box3().setFromObject(this.mesh);
    this.lengte = box.max.z - box.min.z;
    this.collider = { minX: 0, maxX: 0, minZ: 0, maxZ: 0, height: 1.4, camBlock: false };
    scene.add(this.mesh);
  }

  private get totaal(): number { const L = this.x1 - this.x0; return 2 * L + 2 * Math.PI * this.r; }

  /** Positie en kijkrichting op afstand s langs de route. */
  private pose(s: number): { p: THREE.Vector3; d: THREE.Vector3 } {
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

  update(dt: number, obstakels: THREE.Vector3[]): void {
    const { p, d } = this.pose(this.s);
    let doelV = 3.2;
    for (const o of obstakels) {
      const rel = o.clone().sub(p).setY(0);
      const voor = rel.dot(d);
      const lat = Math.abs(rel.x * d.z - rel.z * d.x);
      if (voor > -0.6 && voor < this.lengte / 2 + 5.5 && lat < 1.8) doelV = 0;
    }
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
  private koepel: THREE.Mesh;
  private wolken: THREE.Mesh;
  private t = 0;

  constructor(scene: THREE.Scene, colliders: Collider[]) {
    // overkant: rustig heen en weer; deze kant: met de hond
    const overkant = new Voorbijganger(0, { z: 13.1, x0: -12, x1: 38, zMin: 12.75, zMax: 13.35 }, 4, 1, 1.25, 0.08);
    const metHond = new Voorbijganger(1, { z: 4.25, x0: -11.5, x1: 38, zMin: 3.7, zMax: 5.1 }, 30, -1, 1.05, 0.08);
    this.mensen.push(overkant, metHond);
    for (const m of this.mensen) { scene.add(m.char.root); colliders.push(m.collider); }
    this.hond = new Hond(scene);
    this.auto = new RijdendeAuto(scene);
    colliders.push(this.auto.collider);
    const l = maakLucht();
    this.koepel = l.koepel; this.wolken = l.wolken;
    scene.add(this.koepel, this.wolken);
  }

  update(dt: number, camera: THREE.Camera, speler: THREE.Vector3, reducedMotion: boolean): void {
    for (const m of this.mensen) m.update(dt, speler);
    if (this.hond) this.hond.update(dt, this.mensen[1]);
    this.auto.update(dt, [speler, ...this.mensen.map((m) => m.positie)]);
    // motorgeluid: luider dichterbij, links/rechts ten opzichte van de camera
    const rel = this.auto.mesh.position.clone().sub(camera.position);
    const rechts = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    geluid.motor(rel.length(), this.auto.snelheid, rel.clone().normalize().dot(rechts));
    this.koepel.position.copy(camera.position);
    // wolken drijven langzaam heen en weer (geen sprongen)
    if (!reducedMotion) { this.t += dt; this.wolken.position.x = Math.sin(this.t * 0.012) * 30; }
  }
}
