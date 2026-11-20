import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { THEME, WORLD } from '../theme';
import { LAGE_RESOLUTIE } from '../game/versie';
import { MODELLEN, type Kapsel, type Mens, type Outfit } from '../assets/modellen';

/** Kledingdelen die je per personage een kleur geeft. */
export type Slot = 'huid' | 'haar' | 'shirt' | 'binnen' | 'das' | 'broek' | 'schoenen' | 'zool' | 'accent' | 'ogen';
export type Accessoire = 'snor' | 'sik' | 'baard' | 'hoofddoek' | 'sjaal' | 'bril';

export interface Look {
  shirt: string; skin: string; hair: string; trousers: string;
  /** Quaternius-outfit; zonder outfit (of zonder geladen model) een figuur uit primitieven. */
  outfit?: Outfit;
  /** Extra kleuren per kledingdeel (shirt/huid/haar/broek komen uit de velden hierboven). */
  kleuren?: Partial<Record<Slot, string>>;
  accessoires?: { soort: Accessoire; kleur: string }[];
  /** Lengte in meters. */
  lengte?: number;
  /** Ander kapsel: het hoofd van een ander model (zelfde skelet). */
  kapsel?: Kapsel;
  /** Realistisch personage (Rocketbox); gaat voor outfit, valt terug op outfit als het niet geladen is. */
  mens?: Mens;
}
const DEFAULT_LOOK: Look = { shirt: THEME.blue, skin: WORLD.skin[0], hair: THEME.navy, trousers: WORLD.trousers };

/**
 * Welk materiaal (eventueel per lichaamsdeel: "romp|been|voet|hoofd/Materiaal") bij welk kledingdeel hoort.
 * Afgeleid uit de modellen (tools/modellen.mjs); onbekende materialen houden hun kleur.
 */
const SLOTS: Record<Outfit, Record<string, Slot>> = {
  'man-casual': { Skin: 'huid', Skin_Darker: 'huid', Hair: 'haar', Eyebrows: 'haar', LightBrown: 'shirt', LightBlue: 'broek', Red_Dark: 'schoenen', White: 'zool', Eye: 'ogen' },
  'man-hoodie': { Skin: 'huid', Hair: 'haar', Eyebrows: 'haar', 'romp/Purple': 'shirt', 'voet/Purple': 'schoenen', White: 'zool', LightBlue: 'broek', Eye: 'ogen' },
  'man-suit': { Skin: 'huid', Hair: 'haar', Eyebrows: 'haar', 'romp/Suit': 'shirt', 'been/Suit': 'broek', White: 'binnen', Tie: 'das', Black: 'schoenen', Eye: 'ogen' },
  'vrouw-casual': { Skin: 'huid', Hair_Blond: 'haar', Hair_Brown: 'haar', White: 'shirt', Orange: 'broek', Grey: 'schoenen', Brown: 'ogen' },
  'vrouw-formal': { Skin: 'huid', 'hoofd/Red': 'haar', LimeGreen: 'shirt', Gold: 'accent', 'voet/Red': 'schoenen', Brown: 'ogen' },
  'vrouw-suit': { Skin: 'huid', Hair_Blond: 'haar', Hair_Brown: 'haar', 'romp/Black': 'shirt', 'been/Black': 'broek', 'voet/Black': 'schoenen', White: 'binnen', Brown: 'ogen' },
};

/** Haar- en gezichtsmaterialen van de losse hoofden (kapsels). */
const KAPSEL_SLOTS: Record<string, Slot> = {
  Hair: 'haar', Eyebrows: 'haar', Hair_Blond: 'haar', Hair_Brown: 'haar', Hair_Black: 'haar', Blue: 'haar', Red: 'haar',
  Skin: 'huid', Eye: 'ogen', Brown: 'ogen',
};

export type Basis = 'Idle' | 'Idle_Neutral';
export type Actie = 'Interact' | 'Wave';

/** Snelheden (m/s) waarbij de loop- en renanimatie zonder glijden passen. */
const WALK_ANIM = 1.9;
const RUN_ANIM = 5.6;

let _charMat: THREE.MeshStandardMaterial | null = null;
const charMat = () => _charMat ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });

interface Rig {
  mixer: THREE.AnimationMixer;
  acties: Map<string, THREE.AnimationAction>;
  bones: Map<string, THREE.Bone>;
  /** Voet-IK: de voetbotten hangen niet aan het onderbeen; bij zitten zetten we ze zelf. */
  voeten: { onder: THREE.Bone; voet: THREE.Bone; offset: THREE.Vector3 }[];
  /**
   * Schone waarden (uit de mixer) van de botten die we voor het zitten aanpassen.
   * De mixer schrijft een bot alleen als de animatiewaarde verandert; zonder terugzetten
   * zouden de aanpassingen zich bij een (bijna) stilstaande animatie opstapelen.
   */
  schoon: { bot: THREE.Bone; q: THREE.Quaternion; p: THREE.Vector3 }[];
  /** Loopsnelheid (m/s) waarbij de loop- en renanimatie zonder glijden passen. */
  tempo: { walk: number; run: number };
  /** Rocketbox: zitten en praten zijn echte animaties (geen houding in code). */
  mens: boolean;
}

/**
 * Personage: een Quaternius-model (gedeeld skelet, animaties één keer geladen) of,
 * als terugval, een figuur uit primitieven met een loopanimatie in code.
 * De API (root, animate, zit) is voor beide gelijk.
 */
export class Character {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private rig: Rig | null = null;
  private basis: Basis = 'Idle';
  private eenmalig: { naam: Actie; t: number; duur: number; loop: boolean } | null = null;
  private legL!: THREE.Object3D; private legR!: THREE.Object3D;
  private armL!: THREE.Object3D; private armR!: THREE.Object3D;
  private phase = 0;
  /** Praat (gebaren) in plaats van stil staan; alleen bij Rocketbox-personages. */
  praat = false;
  /** Zittend aan een bureau (benen naar voren, handen op het toetsenbord). */
  zit = false;
  /** Punt (wereld) waar het hoofd naar kijkt, of null. Het hoofd draait zacht mee, binnen grenzen. */
  kijkNaar: THREE.Vector3 | null = null;
  private kijk = { yaw: 0, pitch: 0 };
  /** Wordt aangeroepen bij elke voetstap (voor het geluid). */
  onStap: ((ren: boolean) => void) | null = null;
  private stapFase = 0;

  constructor(look: Partial<Look> = {}) {
    const l: Look = { ...DEFAULT_LOOK, ...look };
    this.root.add(this.body);
    if (l.mens && this.bouwMens(l)) return;
    if (!(l.outfit && this.bouwModel(l))) this.bouwPrimitief(l);
  }

  /** Heeft dit personage een echt model (geen terugval)? */
  get isModel(): boolean { return this.rig !== null; }

  /** Rustanimatie: buiten 'Idle', binnen 'Idle_Neutral'. */
  setBasis(b: Basis): void { this.basis = b; }

  /** Speel een korte actie (aanbellen, zwaaien). Resolvet als hij klaar is. */
  speel(naam: Actie, opties: { loop?: boolean; keer?: number } = {}): Promise<void> {
    const a = this.rig?.acties.get(naam);
    if (!a) return Promise.resolve();
    a.reset().play();
    a.setLoop(THREE.LoopRepeat, Infinity);
    const duur = a.getClip().duration * (opties.keer ?? 1);
    this.eenmalig = { naam, t: 0, duur, loop: !!opties.loop };
    return new Promise((r) => setTimeout(r, duur * 1000));
  }

  stopActie(): void { if (this.eenmalig) this.eenmalig.loop = false; }

  /** speed in m/s; 0 = stilstaan. */
  animate(dt: number, speed: number): void {
    if (this.rig) { this.animeerModel(dt, speed); return; }
    this.animeerPrimitief(dt, speed);
  }

  // ---------------- Quaternius-model ----------------

  private bouwModel(l: Look): boolean {
    const gltf = MODELLEN.personages.get(l.outfit!);
    if (!gltf || !MODELLEN.clips.size) return false;
    try {
      const scene = SkeletonUtils.clone(gltf.scene) as THREE.Object3D;
      scene.updateMatrixWorld(true);
      let skinned: THREE.SkinnedMesh[] = [];
      scene.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) skinned.push(o as THREE.SkinnedMesh); });
      if (!skinned.length) return false;
      // ander kapsel: hoofd van het outfit eruit, los hoofd erin
      const hoofdModel = l.kapsel ? MODELLEN.hoofden.get(l.kapsel) : undefined;
      if (hoofdModel) {
        const hs = SkeletonUtils.clone(hoofdModel.scene) as THREE.Object3D;
        hs.updateMatrixWorld(true);
        const nieuw: THREE.SkinnedMesh[] = [];
        hs.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) nieuw.push(o as THREE.SkinnedMesh); });
        if (nieuw.length) {
          const romp = skinned.filter((m) => regioVanMesh(m) !== 'hoofd');
          for (const m of skinned) if (!romp.includes(m)) m.removeFromParent();
          skinned = [...romp, ...nieuw];
        }
      }
      const kleuren = this.slotKleuren(l);
      const slots = SLOTS[l.outfit!];
      const merged = samenvoegen(skinned, (deel, mat) => {
        const slot = slots[`${deel}/${mat}`] ?? (hoofdModel && deel === 'hoofd' ? KAPSEL_SLOTS[mat] : undefined) ?? slots[mat];
        return slot ? kleuren[slot] : undefined;
      }, l.accessoires ?? []);
      if (!merged) return false;
      for (const s of skinned) s.removeFromParent();
      if (hoofdModel) scene.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh && o !== merged) o.visible = false; });
      scene.add(merged);
      merged.castShadow = true;
      merged.frustumCulled = false;
      // schalen naar de gewenste lengte
      // lengte in rustpose (echte maat): bind-ruimte → wereld via het eerste bot
      scene.updateMatrixWorld(true);
      const sk = merged.skeleton;
      const naarWereld = sk.bones[0].matrixWorld.clone().multiply(sk.boneInverses[0]);
      const pos = merged.geometry.getAttribute('position');
      const v = new THREE.Vector3();
      const ys = Array.from({ length: pos.count }, (_, i) => v.fromBufferAttribute(pos, i).applyMatrix4(naarWereld).y).sort((x, y) => x - y);
      const h = ys[Math.floor(ys.length * 0.999)] - ys[Math.floor(ys.length * 0.001)];
      const lengte = l.lengte ?? (l.outfit!.startsWith('vrouw') ? 1.7 : 1.8);
      scene.scale.multiplyScalar(lengte / h);
      this.body.add(scene);

      const mixer = new THREE.AnimationMixer(scene);
      const acties = new Map<string, THREE.AnimationAction>();
      for (const [naam, clip] of MODELLEN.clips) {
        const a = mixer.clipAction(clip);
        a.enabled = true;
        a.setEffectiveWeight(0);
        a.play();
        acties.set(naam, a);
      }
      const bones = new Map<string, THREE.Bone>();
      scene.traverse((o) => { if ((o as THREE.Bone).isBone) bones.set(o.name, o as THREE.Bone); });
      scene.updateMatrixWorld(true);
      const voeten: Rig['voeten'] = [];
      for (const k of ['L', 'R']) {
        const onder = bones.get(`LowerLeg${k}`), voet = bones.get(`Foot${k}`);
        if (onder && voet) voeten.push({ onder, voet, offset: onder.worldToLocal(voet.getWorldPosition(new THREE.Vector3())) });
      }
      // iedereen een eigen startmoment, zodat groepjes niet synchroon ademen
      mixer.setTime(Math.random() * 3);
      const schoon = [...ZIT.map(([n]) => bones.get(n)), ...voeten.map((v) => v.voet), bones.get('Head')]
        .filter((b): b is THREE.Bone => !!b)
        .map((bot) => ({ bot, q: bot.quaternion.clone(), p: bot.position.clone() }));
      this.rig = { mixer, acties, bones, voeten, schoon, tempo: { walk: WALK_ANIM, run: RUN_ANIM }, mens: false };
      return true;
    } catch (e) {
      console.warn('Personage valt terug op primitieven', e);
      return false;
    }
  }

  // ---------------- Rocketbox (realistisch) ----------------

  private bouwMens(l: Look): boolean {
    const gltf = MODELLEN.mensen.get(l.mens!);
    const clips = MODELLEN.mensClips.get(l.mens!.startsWith('f') ? 'f' : 'm');
    if (!gltf || !clips?.size) return false;
    try {
      const scene = SkeletonUtils.clone(gltf.scene) as THREE.Object3D;
      scene.traverse((o) => {
        const m = o as THREE.SkinnedMesh;
        if (m.isSkinnedMesh) { m.castShadow = true; m.frustumCulled = false; }
      });
      scene.updateMatrixWorld(true);
      // lengte zonder haar: het hoofdbot ligt ~10 cm onder de kruin
      const bones = new Map<string, THREE.Bone>();
      scene.traverse((o) => { if ((o as THREE.Bone).isBone) bones.set(o.name, o as THREE.Bone); });
      const hoofd = [...bones.values()].find((b) => /Head$/.test(b.name));
      if (hoofd) bones.set('Head', hoofd);
      const box = new THREE.Box3().setFromObject(scene);
      const h = box.max.y - box.min.y;
      const lengte = l.lengte ?? (l.mens!.startsWith('f') ? 1.7 : 1.8);
      scene.scale.multiplyScalar(lengte / h);
      this.body.add(scene);
      const mixer = new THREE.AnimationMixer(scene);
      const acties = new Map<string, THREE.AnimationAction>();
      const voeg = (naam: string, clip: THREE.AnimationClip | undefined) => {
        if (!clip) return;
        const a = mixer.clipAction(clip);
        a.enabled = true; a.setEffectiveWeight(0); a.play();
        acties.set(naam, a);
      };
      for (const [naam, clip] of clips) voeg(naam, clip);
      // binnen dezelfde rustanimatie (een eigen kopie, anders deelt hij de actie)
      const idle = clips.get('Idle');
      if (idle) { const c = idle.clone(); c.name = 'Idle_Neutral'; voeg('Idle_Neutral', c); }
      mixer.setTime(Math.random() * 3);
      const schoon = hoofd ? [{ bot: hoofd, q: hoofd.quaternion.clone(), p: hoofd.position.clone() }] : [];
      this.rig = { mixer, acties, bones, voeten: [], schoon, tempo: l.mens!.startsWith('f') ? { walk: 1.22, run: 2.75 } : { walk: 1.01, run: 2.89 }, mens: true };
      return true;
    } catch (e) {
      console.warn('Rocketbox-personage valt terug', e);
      return false;
    }
  }

  private slotKleuren(l: Look): Record<Slot, THREE.Color | undefined> {
    const k = l.kleuren ?? {};
    const c = (v?: string) => (v ? new THREE.Color(v) : undefined);
    const haar = c(k.haar ?? l.hair);
    return {
      huid: c(k.huid ?? l.skin), haar, shirt: c(k.shirt ?? l.shirt), broek: c(k.broek ?? l.trousers),
      binnen: c(k.binnen), das: c(k.das), schoenen: c(k.schoenen ?? '#2E2C2A'), zool: c(k.zool ?? '#C9C5BE'),
      accent: c(k.accent), ogen: c(k.ogen ?? '#2A2420'),
    };
  }

  private animeerModel(dt: number, speed: number): void {
    const { mixer, acties, bones } = this.rig!;
    const w = (n: string, v: number) => acties.get(n)?.setEffectiveWeight(v);
    // eenmalige actie met in- en uitfaden
    let e = 0;
    const em = this.eenmalig;
    if (em) {
      em.t += dt;
      if (em.loop && em.t > em.duur - 0.3) em.t -= em.duur - 0.6;
      e = Math.min(1, em.t / 0.25, Math.max(0, (em.duur - em.t) / 0.3));
      if (em.t >= em.duur) { w(em.naam, 0); this.eenmalig = null; e = 0; }
    }
    const zit = this.zit;
    const loop = zit ? 0 : THREE.MathUtils.smoothstep(speed, 0.15, 1.0);
    // Rocketbox loopt op echte snelheid (±1,1 m/s): daarboven jogt hij; Quaternius loopt snel
    const ren = this.rig!.mens ? THREE.MathUtils.smoothstep(speed, 1.7, 2.6) : THREE.MathUtils.smoothstep(speed, 3.8, 5.8);
    const rest = 1 - loop;
    for (const n of ['Idle', 'Idle_Neutral', 'Walk', 'Run', 'Wave', 'Interact', 'Sit', 'Talk']) w(n, 0);
    const mensZit = zit && this.rig!.mens && acties.has('Sit');
    w(mensZit ? 'Sit' : this.praat && acties.has('Talk') ? 'Talk' : this.basis, rest * (1 - e));
    w('Walk', loop * (1 - ren) * (1 - e));
    w('Run', loop * ren * (1 - e));
    if (em && this.eenmalig) w(em.naam, e);
    const walk = acties.get('Walk'), run = acties.get('Run');
    if (walk && run) {
      walk.timeScale = THREE.MathUtils.clamp(speed / this.rig!.tempo.walk, 0.7, 2.1);
      run.timeScale = THREE.MathUtils.clamp(speed / this.rig!.tempo.run, 0.8, this.rig!.mens ? 2.1 : 1.5);
      // zelfde fase, zodat overvloeien niet hapert
      if (ren > 0.5) walk.time = (run.time / run.getClip().duration) * walk.getClip().duration;
      else run.time = (walk.time / walk.getClip().duration) * run.getClip().duration;
      // voetstappen op twee momenten per loopcyclus
      const f = (walk.time / walk.getClip().duration) % 1;
      const half = Math.floor(f * 2);
      if (loop > 0.5 && half !== this.stapFase) this.onStap?.(ren > 0.5);
      this.stapFase = half;
    }
    // eerst de schone mixerwaarden terug, dan de mixer, dan pas de zithouding
    for (const s of this.rig!.schoon) { s.bot.quaternion.copy(s.q); s.bot.position.copy(s.p); }
    mixer.update(dt);
    for (const s of this.rig!.schoon) { s.q.copy(s.bot.quaternion); s.p.copy(s.bot.position); }
    this.body.position.y = zit && !mensZit ? ZIT_HOOGTE : zit ? MENS_ZIT.y : 0;
    this.body.position.z = mensZit ? MENS_ZIT.z : 0;
    this.hoofdDraaien(dt, bones.get('Head'));
    if (zit && !mensZit) {
      zitHouding(bones, this.root, (this.phase += dt));
      // voeten aan het eind van het (gedraaide) onderbeen zetten
      for (const { onder, voet, offset } of this.rig!.voeten) {
        onder.updateWorldMatrix(true, false);
        const doel = offset.clone().applyMatrix4(onder.matrixWorld);
        voet.parent!.updateWorldMatrix(true, false);
        voet.position.copy(voet.parent!.worldToLocal(doel));
      }
    }
  }

  /** Hoofd zacht naar het kijkpunt draaien (bovenop de animatie), max ±60° opzij en ±20° op/neer. */
  private hoofdDraaien(dt: number, hoofd: THREE.Bone | undefined): void {
    if (!hoofd) return;
    let doelYaw = 0, doelPitch = 0;
    if (this.kijkNaar) {
      const lokaal = this.root.worldToLocal(this.kijkNaar.clone());
      const hoogte = 1.6 * this.root.scale.y;
      doelYaw = THREE.MathUtils.clamp(Math.atan2(lokaal.x, lokaal.z), -1.05, 1.05);
      // achter je kijken kan niet: dan weer recht vooruit
      if (lokaal.z < -0.3) doelYaw = 0;
      doelPitch = THREE.MathUtils.clamp(-Math.atan2(lokaal.y - hoogte, Math.hypot(lokaal.x, lokaal.z)), -0.35, 0.35);
    }
    const k = 1 - Math.exp(-dt * 5);
    this.kijk.yaw += (doelYaw - this.kijk.yaw) * k;
    this.kijk.pitch += (doelPitch - this.kijk.pitch) * k;
    if (Math.abs(this.kijk.yaw) < 1e-3 && Math.abs(this.kijk.pitch) < 1e-3) return;
    // draaien om de as van het lichaam (wereld-y) en de zijas, omgezet naar de ruimte van het bot
    const pq = hoofd.parent!.getWorldQuaternion(new THREE.Quaternion()).invert();
    const rq = this.root.getWorldQuaternion(new THREE.Quaternion());
    const op = new THREE.Vector3(0, 1, 0).applyQuaternion(rq).applyQuaternion(pq);
    const zij = new THREE.Vector3(1, 0, 0).applyQuaternion(rq).applyQuaternion(pq);
    hoofd.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(op, this.kijk.yaw));
    hoofd.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(zij, this.kijk.pitch));
  }

  // ---------------- terugval: primitieven ----------------

  private bouwPrimitief(l: Look): void {
    const mat = (c: string) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true });
    const shirtM = mat(l.shirt), skinM = mat(l.skin), legM = mat(l.trousers), shoeM = mat(WORLD.shoes);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.5, 3, 8), shirtM);
    torso.position.y = 1.12;
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.21, 1), skinM);
    head.position.y = 1.68;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.215, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.45), mat(l.hair));
    hair.position.y = 1.7; hair.rotation.x = -0.25;
    const limb = (len: number, r: number, m: THREE.Material, foot?: THREE.Material) => {
      const pivot = new THREE.Group();
      const seg = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 2, 6), m);
      seg.position.y = -len / 2 - r;
      pivot.add(seg);
      if (foot) {
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.26), foot);
        f.position.set(0, -len - r * 2 + 0.03, 0.05);
        pivot.add(f);
      }
      return pivot;
    };
    this.legL = limb(0.5, 0.09, legM, shoeM); this.legL.position.set(-0.12, 0.78, 0);
    this.legR = limb(0.5, 0.09, legM, shoeM); this.legR.position.set(0.12, 0.78, 0);
    this.armL = limb(0.42, 0.07, shirtM); this.armL.position.set(-0.34, 1.4, 0);
    this.armR = limb(0.42, 0.07, shirtM); this.armR.position.set(0.34, 1.4, 0);
    this.body.add(torso, head, hair, this.legL, this.legR, this.armL, this.armR);
    this.body.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; } });
  }

  private animeerPrimitief(dt: number, speed: number): void {
    if (this.zit) {
      this.phase += dt;
      const k = 1 - Math.exp(-dt * 12);
      const typ = Math.sin(this.phase * 9) * 0.06;
      this.legL.rotation.x += (-1.5 - this.legL.rotation.x) * k;
      this.legR.rotation.x += (-1.5 - this.legR.rotation.x) * k;
      this.armL.rotation.x += (-1.1 + typ - this.armL.rotation.x) * k;
      this.armR.rotation.x += (-1.1 - typ - this.armR.rotation.x) * k;
      this.body.position.y = -0.32;
      return;
    }
    const moving = speed > 0.1;
    const oud = Math.floor(this.phase / Math.PI);
    if (moving) this.phase += dt * speed * 2.4;
    if (moving && Math.floor(this.phase / Math.PI) !== oud) this.onStap?.(speed > 5);
    const amp = moving ? Math.min(0.7, speed * 0.16) : 0;
    const s = Math.sin(this.phase);
    const k = 1 - Math.exp(-dt * 12);
    const lerp = (o: THREE.Object3D, target: number) => { o.rotation.x += (target - o.rotation.x) * k; };
    lerp(this.legL, s * amp); lerp(this.legR, -s * amp);
    lerp(this.armL, -s * amp * 0.8); lerp(this.armR, s * amp * 0.8);
    this.body.position.y = moving ? Math.abs(Math.cos(this.phase)) * 0.05 : this.body.position.y * (1 - k);
  }
}

// ---------------- zittende houding (er is geen zitanimatie) ----------------

/**
 * Draai de botten naar een zithouding met typende handen, bovenop Idle_Neutral.
 * Elke draaiing is om de zijas (x) van het personage zelf, zodat links en rechts gelijk werken.
 */
function zitHouding(bones: Map<string, THREE.Bone>, root: THREE.Object3D, t: number): void {
  const rq = root.getWorldQuaternion(new THREE.Quaternion());
  const as = new THREE.Vector3(1, 0, 0).applyQuaternion(rq);
  const pq = new THREE.Quaternion();
  const draai = (n: string, hoek: number) => {
    const b = bones.get(n);
    if (!b?.parent) return;
    b.parent.updateWorldMatrix(true, false);
    b.parent.getWorldQuaternion(pq);
    const lokaal = as.clone().applyQuaternion(pq.invert());
    b.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(lokaal, hoek));
    b.updateWorldMatrix(false, false);
  };
  const typ = Math.sin(t * 9) * 0.06;
  for (const [n, hoek] of ZIT) draai(n, hoek + (n === 'LowerArmL' ? typ : n === 'LowerArmR' ? -typ : 0));
}

/** Zithouding: [bot, draaiing om de zijas in radialen], van romp naar ledematen. */
export const ZIT: [string, number][] = [
  ['UpperLegL', -1.5], ['UpperLegR', -1.5],
  ['LowerLegL', 1.5], ['LowerLegR', 1.5],
  ['UpperArmL', -0.45], ['UpperArmR', -0.45],
  ['LowerArmL', -1.1], ['LowerArmR', -1.1],
];

/** Zo veel zakt het lichaam (m) als het personage zit. */
export const ZIT_HOOGTE = -0.3;
/** Rocketbox-zitanimatie: verschuiving van het lichaam zodat het zitvlak op de stoel valt. */
export const MENS_ZIT = { y: 0, z: 0 };

// ---------------- samenvoegen tot één SkinnedMesh ----------------

const regioVanBot = (b: string) => (b === 'Head' || b === 'Neck' ? 'hoofd' : b.startsWith('Foot') || b.startsWith('PT') ? 'voet'
  : b.startsWith('UpperLeg') || b.startsWith('LowerLeg') ? 'been' : 'romp');

/** Lichaamsdeel van een hele (deel)mesh: het gebied met de meeste vertices. */
function regioVanMesh(m: THREE.SkinnedMesh): string {
  const si = m.geometry.getAttribute('skinIndex');
  const tel = new Map<string, number>();
  for (let i = 0; i < si.count; i += 3) { const r = regioVanBot(m.skeleton.bones[si.getX(i)].name); tel.set(r, (tel.get(r) ?? 0) + 1); }
  return [...tel.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'romp';
}

type KleurVan = (deel: string, materiaal: string) => THREE.Color | undefined;

/**
 * Voegt alle SkinnedMeshes van één personage samen tot één mesh met vertexkleuren
 * (één draw call). Accessoires (snor, hoofddoek ...) worden als extra geometrie
 * aan het hoofd- of nekbot gehangen. Geeft null als de skeletten niet gelijk zijn.
 */
function samenvoegen(meshes: THREE.SkinnedMesh[], kleurVan: KleurVan, acc: { soort: Accessoire; kleur: string }[]): THREE.SkinnedMesh | null {
  const skel = meshes[0].skeleton;
  // botten op naam koppelen: een los hoofd heeft eigen (gekloonde) botten met dezelfde namen
  const naamIndex = new Map(skel.bones.map((b, i) => [b.name, i]));
  const boneIndex = { get: (b: THREE.Bone) => naamIndex.get(b.name) };
  // Elke deelmesh heeft een eigen bind-ruimte: T = inv(boneInv_ref) · boneInv_m (gelijk voor alle botten).
  const transf = new Map<THREE.SkinnedMesh, THREE.Matrix4>();
  for (const m of meshes) {
    const j0 = boneIndex.get(m.skeleton.bones[0]);
    if (j0 === undefined) return null;
    const T = skel.boneInverses[j0].clone().invert().multiply(m.skeleton.boneInverses[0]).multiply(m.bindMatrix);
    // controle op een paar andere botten
    for (const i of [3, 7, 20, 50]) {
      const j = boneIndex.get(m.skeleton.bones[i]);
      if (j === undefined) return null;
      const T2 = skel.boneInverses[j].clone().invert().multiply(m.skeleton.boneInverses[i]).multiply(m.bindMatrix);
      if (T2.elements.some((v, k) => Math.abs(v - T.elements[k]) > 1e-3)) return null;
    }
    transf.set(m, T);
  }
  const regio = (b: string) => (b === 'Head' || b === 'Neck' ? 'hoofd' : b.startsWith('Foot') || b.startsWith('PT') ? 'voet'
    : b.startsWith('UpperLeg') || b.startsWith('LowerLeg') ? 'been' : 'romp');
  const P: number[] = [], N: number[] = [], C: number[] = [], SI: number[] = [], SW: number[] = [];
  const v = new THREE.Vector3(), n = new THREE.Vector3();
  for (const m of meshes) {
    const g = m.geometry;
    const pos = g.getAttribute('position'), nor = g.getAttribute('normal');
    const si = g.getAttribute('skinIndex'), sw = g.getAttribute('skinWeight');
    const vc = g.getAttribute('color');
    const T = transf.get(m)!;
    const nm = new THREE.Matrix3().getNormalMatrix(T);
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const groups = g.groups.length ? g.groups : [{ start: 0, count: g.index ? g.index.count : pos.count, materialIndex: 0 }];
    const remap = m.skeleton.bones.map((b) => boneIndex.get(b)!);
    for (const gr of groups) {
      const mat = mats[gr.materialIndex ?? 0] as THREE.MeshStandardMaterial;
      // lichaamsdeel van deze groep: het bot met het meeste gewicht
      const telling = new Map<string, number>();
      for (let k = 0; k < gr.count; k += 3) {
        const i = g.index ? g.index.getX(gr.start + k) : gr.start + k;
        const r = regio(m.skeleton.bones[si.getX(i)].name);
        telling.set(r, (telling.get(r) ?? 0) + 1);
      }
      const deel = [...telling.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'romp';
      const gekozen = kleurVan(deel, mat.name);
      const kleur = gekozen ?? mat.color;
      for (let k = 0; k < gr.count; k++) {
        const i = g.index ? g.index.getX(gr.start + k) : gr.start + k;
        v.fromBufferAttribute(pos, i).applyMatrix4(T);
        P.push(v.x, v.y, v.z);
        if (nor) { n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); N.push(n.x, n.y, n.z); } else N.push(0, 1, 0);
        const c = kleur.clone();
        if (vc && !gekozen) c.multiply(new THREE.Color(vc.getX(i), vc.getY(i), vc.getZ(i)));
        C.push(c.r, c.g, c.b);
        SI.push(remap[si.getX(i)], remap[si.getY(i)], remap[si.getZ(i)], remap[si.getW(i)]);
        SW.push(sw.getX(i), sw.getY(i), sw.getZ(i), sw.getW(i));
      }
    }
  }
  if (!LAGE_RESOLUTIE) zachteNormalen(P, N, 60);
  if (acc.length) voegAccessoiresToe(acc, skel, { P, N, C, SI, SW });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(SI, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(SW, 4));
  const mesh = new THREE.SkinnedMesh(geo, charMat());
  mesh.name = 'personage';
  mesh.bind(skel, new THREE.Matrix4());
  return mesh;
}

interface Buf { P: number[]; N: number[]; C: number[]; SI: number[]; SW: number[] }

/**
 * Zachtere personages: de Quaternius-modellen hebben platte vlakken (facetten). Normalen van
 * vertices op dezelfde plek worden gemiddeld als ze minder dan `hoek` graden verschillen;
 * scherpe randen (kraag, schoenzool, haarlok) blijven scherp. Geen extra driehoeken.
 */
function zachteNormalen(P: number[], N: number[], hoek: number): void {
  const grens = Math.cos((hoek * Math.PI) / 180);
  const q = (x: number) => Math.round(x * 2000);
  const plek = new Map<string, number[]>();
  for (let i = 0; i < P.length / 3; i++) {
    const k = `${q(P[i * 3])},${q(P[i * 3 + 1])},${q(P[i * 3 + 2])}`;
    const l = plek.get(k);
    if (l) l.push(i); else plek.set(k, [i]);
  }
  const uit = N.slice();
  for (const l of plek.values()) {
    if (l.length < 2) continue;
    for (const i of l) {
      let x = 0, y = 0, z = 0;
      for (const j of l) {
        const d = N[i * 3] * N[j * 3] + N[i * 3 + 1] * N[j * 3 + 1] + N[i * 3 + 2] * N[j * 3 + 2];
        if (d >= grens) { x += N[j * 3]; y += N[j * 3 + 1]; z += N[j * 3 + 2]; }
      }
      const len = Math.hypot(x, y, z) || 1;
      uit[i * 3] = x / len; uit[i * 3 + 1] = y / len; uit[i * 3 + 2] = z / len;
    }
  }
  for (let i = 0; i < N.length; i++) N[i] = uit[i];
}

/**
 * Accessoires in bind-ruimte. Maten zijn afgeleid van de hoofdvertices
 * (alles wat vooral aan het Head-bot hangt), zodat ze bij elk model passen.
 */
function voegAccessoiresToe(acc: { soort: Accessoire; kleur: string }[], skel: THREE.Skeleton, buf: Buf): void {
  const head = skel.bones.findIndex((b) => b.name === 'Head');
  const neck = skel.bones.findIndex((b) => b.name === 'Neck');
  const chest = skel.bones.findIndex((b) => b.name === 'Chest');
  if (head < 0) return;
  // hoofdbox uit de vertices die vooral aan het hoofd hangen
  const box = new THREE.Box3();
  for (let i = 0; i < buf.SI.length / 4; i++) {
    if (buf.SI[i * 4] === head && buf.SW[i * 4] > 0.6) box.expandByPoint(new THREE.Vector3(buf.P[i * 3], buf.P[i * 3 + 1], buf.P[i * 3 + 2]));
  }
  if (box.isEmpty()) return;
  const s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const add = (g: THREE.BufferGeometry, kleur: string, bot: number, filter?: (cx: number, cy: number, cz: number) => boolean) => {
    const geo = g.index ? g.toNonIndexed() : g;
    geo.computeVertexNormals();
    const p = geo.getAttribute('position'), nn = geo.getAttribute('normal');
    const col = new THREE.Color(kleur);
    for (let i = 0; i < p.count; i += 3) {
      if (filter) {
        const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
        if (!filter(cx, cy, cz)) continue;
      }
      for (let k = i; k < i + 3; k++) {
        buf.P.push(p.getX(k), p.getY(k), p.getZ(k));
        buf.N.push(nn.getX(k), nn.getY(k), nn.getZ(k));
        buf.C.push(col.r, col.g, col.b);
        buf.SI.push(bot < 0 ? head : bot, 0, 0, 0);
        buf.SW.push(1, 0, 0, 0);
      }
    }
  };
  // assen: x = breedte, y = hoogte, z = voorkant (+z)
  const front = box.max.z, y0 = box.min.y, W = s.x, H = s.y, D = s.z;
  // voorkant van het gezicht op hoogte y (rond x), gemeten aan de hoofdvertices
  const hoofdV: THREE.Vector3[] = [];
  for (let i = 0; i < buf.SI.length / 4; i++) if (buf.SI[i * 4] === head && buf.SW[i * 4] > 0.6) hoofdV.push(new THREE.Vector3(buf.P[i * 3], buf.P[i * 3 + 1], buf.P[i * 3 + 2]));
  const zAt = (y: number, x = c.x, bx = 0.14) => {
    let z = -Infinity;
    for (const p of hoofdV) if (p.z > c.z && Math.abs(p.y - y) < H * 0.035 && Math.abs(p.x - x) < W * bx) z = Math.max(z, p.z);
    return Number.isFinite(z) ? z : front - D * 0.15;
  };
  const snorY = y0 + H * 0.185, kinY = y0 + H * 0.06;
  const snor = (b: number) => add(new THREE.BoxGeometry(W * b, H * 0.05, D * 0.07).translate(c.x, snorY, zAt(snorY) + D * 0.01), kleurVan(), head);
  let huidig = '';
  const kleurVan = () => huidig;
  for (const { soort, kleur } of acc) {
    huidig = kleur;
    if (soort === 'snor') {
      snor(0.4);
    } else if (soort === 'sik') {
      add(new THREE.BoxGeometry(W * 0.2, H * 0.1, D * 0.08).translate(c.x, kinY, zAt(kinY) - D * 0.015), kleur, head);
      snor(0.26);
    } else if (soort === 'baard') {
      // kin en kaaklijn als blokjes op het gezicht, plus een snor
      add(new THREE.BoxGeometry(W * 0.4, H * 0.12, D * 0.1).translate(c.x, kinY, zAt(kinY) - D * 0.02), kleur, head);
      for (const sx of [-1, 1]) {
        const x = c.x + sx * W * 0.21, y = y0 + H * 0.13;
        add(new THREE.BoxGeometry(W * 0.12, H * 0.17, D * 0.22).rotateY(sx * 0.6).translate(x, y, zAt(y, x, 0.05) - D * 0.09), kleur, head);
      }
      snor(0.3);
    } else if (soort === 'hoofddoek') {
      // kap om het hoofd met een opening voor het gezicht, plus een kraag tot op de schouders
      const kap = new THREE.SphereGeometry(0.5, 14, 10);
      kap.scale(W * 1.12, H * 1.06, D * 1.1).translate(c.x, c.y + H * 0.03, c.z - D * 0.02);
      const gezichtY0 = y0 + H * 0.12, gezichtY1 = y0 + H * 0.78;
      add(kap, kleur, head, (x, y, z) => !(z > c.z + D * 0.18 && y > gezichtY0 && y < gezichtY1 && Math.abs(x - c.x) < W * 0.36));
      const kraag = new THREE.CylinderGeometry(W * 0.5, W * 0.95, H * 0.5, 14, 1, true);
      kraag.translate(c.x, y0 - H * 0.08, c.z - D * 0.04);
      add(kraag, kleur, neck >= 0 ? neck : head);
    } else if (soort === 'sjaal') {
      const ring = new THREE.TorusGeometry(W * 0.34, W * 0.11, 6, 14).rotateX(Math.PI / 2);
      ring.scale(1, 1, 0.95).translate(c.x, y0 - H * 0.12, c.z - D * 0.02);
      add(ring, kleur, neck >= 0 ? neck : head);
      add(new THREE.BoxGeometry(W * 0.16, H * 0.5, D * 0.07).rotateZ(0.12).translate(c.x + W * 0.1, y0 - H * 0.45, front - D * 0.12), kleur, chest >= 0 ? chest : head);
    } else if (soort === 'bril') {
      const y = y0 + H * 0.52;
      for (const dx of [-0.17, 0.17]) add(new THREE.TorusGeometry(W * 0.09, W * 0.015, 4, 10).translate(c.x + W * dx, y, front - D * 0.08), kleur, head);
      add(new THREE.BoxGeometry(W * 0.14, W * 0.02, W * 0.02).translate(c.x, y, front - D * 0.08), kleur, head);
    }
  }
}
