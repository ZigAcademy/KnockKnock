import { LuchtLeven } from '../world/lucht';
import { omgevingsTijd } from '../render/detail';
import { laadOmgeving } from '../render/omgeving';
import { Geholpen } from '../world/geholpen';
import * as THREE from 'three';
import { buildStreet, HUISNUMMERS, type DoorInfo } from '../world/street';
import { Markers } from '../world/markers';
import { Character } from '../player/character';
import { PlayerController } from '../player/controller';
import type { Input } from '../player/input';
import { THEME, WORLD } from '../theme';
import { SPELER_LOOK, HUURDER_LOOK } from '../world/looks';
import { StraatLeven } from '../world/straatLeven';
import { geluid, type Ondergrond } from '../audio/geluid';
import { hits, type Collider } from '../world/collision';
import type { Scenarios, Woning } from '../content/types';
import type { Look } from '../player/character';
import { huisnummer } from '../content/load';

const BEL_AFSTAND = 1.7;

export interface DeurInRange { woning: Woning; deur: DoorInfo }

export class StreetScene {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly player: PlayerController;
  readonly markers = new Markers();
  readonly doors: Map<number, DoorInfo>;
  private woningPerNummer = new Map<number, Woning>();
  private deurScene: { deur: DoorInfo; open: number; doel: number; huurder: Character } | null = null;
  private huurders = new Map<string, Character>();
  private vlucht: { t: number; duur: number; van: THREE.Vector3; vanKijk: THREE.Vector3; naar: THREE.Vector3; naarKijk: THREE.Vector3; klaar: () => void } | null = null;
  /** Camera blijft staan waar hij is (na de vlucht), tot een nieuwe scène begint. */
  private camVast = false;
  private kantoorView = { pos: new THREE.Vector3(36, 3.2, 9), kijk: new THREE.Vector3(44, 3.4, 9) };
  private camGoal = { pos: new THREE.Vector3(), look: new THREE.Vector3(), lookNow: new THREE.Vector3() };
  private leven: StraatLeven;
  private lucht: LuchtLeven;
  /** Wordt door main aangeroepen met de renderer (nodig voor het omgevingslicht). */
  onRenderer: (r: THREE.WebGLRenderer) => void = () => {};
  private deurHuurder: string | null = null;
  private geholpen: Geholpen;
  private afWoningen = new Set<string>();
  private huurderLook: (id: string) => Partial<Look>;
  private colliders: Collider[];
  /** Mag je bij deze woning aanbellen? (de finale pas als de rest af is) */
  beschikbaar: (w: Woning) => boolean = () => true;
  private buren: Character[] = [];
  private sleutels: { mesh: THREE.Object3D; van: THREE.Vector3; naar: THREE.Vector3; t: number } | null = null;

  constructor(content: Scenarios, input: Input, reducedMotion: () => boolean) {
    const s = this.scene;
    s.background = new THREE.Color(WORLD.sky);
    s.fog = new THREE.Fog(WORLD.fog, 45, 110);

    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

    const hemi = new THREE.HemisphereLight('#EEF3FF', '#7C8A6A', 1.4);
    s.add(hemi);
    const sun = new THREE.DirectionalLight('#FFF6E8', 2.1);
    sun.position.set(-18, 32, 24);
    sun.target.position.set(20, 0, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -44; sc.right = 44; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 110;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 3;
    s.add(sun, sun.target);

    const street = buildStreet();
    s.add(street.group);
    this.doors = street.doors;

    // Markeringen: alleen woningen die in scenarios.json staan
    for (const w of content.woningen) {
      const nr = huisnummer(w.adres);
      const deur = nr !== null ? street.doors.get(nr) : undefined;
      if (!deur || nr === null) continue;
      this.woningPerNummer.set(nr, w);
      this.markers.add(w.id, new THREE.Vector3(deur.door.x, 2.95, deur.door.z + 0.55));
    }
    s.add(this.markers.group);

    const character = new Character(SPELER_LOOK);
    character.root.position.copy(street.spawn);
    character.root.rotation.y = Math.PI / 2;
    s.add(character.root);

    this.player = new PlayerController(character, this.camera, input, {
      colliders: street.colliders,
      heightAt: street.heightAt,
      reducedMotion,
      planRoute: (from, to) => this.planRoute(from, to),
    }, s, THEME.blue);

    this.colliders = street.colliders;
    this.leven = new StraatLeven(s, street.colliders);
    // rook uit de schoorstenen van nr 18, 22 en 26 (schoorsteen op x = huis - 1.6, z = -5.2, top op 8.6 m)
    this.lucht = new LuchtLeven(s, [2, 4, 6].map((i) => new THREE.Vector3(i * 6 - 1.6, 8.7, -5.2)));
    this.lucht.resize(window.innerHeight);
    this.onRenderer = (r) => laadOmgeving(r, s, () => { this.leven.echteLucht(); hemi.intensity = 1.05; });
    this.geholpen = new Geholpen(s, street.colliders, street.doors, street.bewoon26);
    this.huurderLook = (id) => HUURDER_LOOK[id] ?? {};
    // het busje stopt even voor woningen die geholpen zijn
    this.leven.busje.stopPlekken = () => [...this.afWoningen].map((id) => { const w = content.woningen.find((x) => x.id === id); const nr = w ? huisnummer(w.adres) : null; return nr !== null ? this.doors.get(nr)?.door.x ?? NaN : NaN; }).filter((x) => !Number.isNaN(x));
    character.onStap = (ren) => geluid.stap(this.ondergrond(this.player.position), ren ? 0.6 : 0.45);
  }

  /** Woning is af: blauw vinkje en het verschil in de straat (huurder in de tuin, enz.). */
  woningAf(w: Woning): void {
    this.markers.setState(w.id, 'af');
    this.afWoningen.add(w.id);
    const nr = huisnummer(w.adres);
    this.geholpen.af(w.id, w.huurder, this.huurderLook(w.huurder), nr !== null ? this.doors.get(nr) : undefined);
    this.geholpen.verberg(this.deurScene ? this.deurHuurder : null);
  }

  /** Voor tests: hoeveel huurders staan er in hun voortuin? */
  get huurdersInTuin(): number { return this.geholpen.aantalInTuin; }

  /** Uiterlijk van de speler aanpassen (na "Wie ben jij?"). */
  setSpelerLook(look: Partial<Look>): void { this.player.vervangFiguur(new Character(look)); }

  /**
   * Personage terugzetten (als het ergens vastzit): naar de dichtstbijzijnde vrije plek
   * op de stoep, camera terug achter je. De voortgang blijft gewoon staan.
   */
  resetSpeler(): void {
    const p = this.player.position;
    const x0 = THREE.MathUtils.clamp(p.x, -12, 40);
    const kandidaten: THREE.Vector3[] = [];
    for (const dx of [0, 1.5, -1.5, 3, -3, 5, -5]) for (const z of [4.5, 4.0, 5.0]) kandidaten.push(new THREE.Vector3(THREE.MathUtils.clamp(x0 + dx, -12, 40), 0, z));
    const vrij = kandidaten.find((k) => !hits(this.colliders, k.x, k.z, 0.45)) ?? new THREE.Vector3(-11, 0, 4.5);
    this.player.setPose(vrij, Math.PI / 2);
    this.player.herstelCamera();
  }

  /** Waar loopt de speler op? (voor de voetstappen) */
  private ondergrond(p: THREE.Vector3): Ondergrond {
    if (p.z > 14.6) return 'gras';
    if (p.z >= 0 && p.z <= 3.4) {
      const tuin = this.tuinBij(p);
      return tuin && Math.abs(p.x - tuin.stand.x) <= 0.6 ? 'steen' : 'gras';
    }
    if (p.z < 3.4 && p.x < -3.4) return 'gras';
    return 'steen';
  }

  /** Voortuin (deur) waarin een punt ligt, of null. */
  private tuinBij(p: THREE.Vector3): DoorInfo | null {
    if (p.z < -0.5 || p.z > 3.3) return null;
    for (const nr of HUISNUMMERS) {
      const d = this.doors.get(nr)!;
      if (Math.abs(p.x - (d.door.x - 1.5)) <= 3) return d;
    }
    return null;
  }

  /**
   * Eenvoudige route voor klik-om-te-lopen: een klik op een gevel of voortuin
   * wordt het tuinpad; tuinen in en uit via het pad en de stoep.
   */
  private planRoute(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] {
    const doelTuin = this.tuinBij(to);
    const doel = doelTuin ? doelTuin.stand.clone() : to.clone();
    const vanTuin = this.tuinBij(from);
    if (vanTuin === doelTuin) return [doel];
    const stoepZ = 4.4;
    const route: THREE.Vector3[] = [];
    if (vanTuin) route.push(new THREE.Vector3(vanTuin.stand.x, 0, vanTuin.stand.z + 0.3), new THREE.Vector3(vanTuin.stand.x, 0, stoepZ));
    if (doelTuin) route.push(new THREE.Vector3(doelTuin.stand.x, 0, stoepZ));
    route.push(doel);
    return route;
  }

  /** Woning waarvan de deur binnen bereik is (en in de JSON staat). */
  deurInRange(): DeurInRange | null {
    const p = this.player.position;
    for (const [nr, w] of this.woningPerNummer) {
      if (!this.beschikbaar(w)) continue;
      const d = this.doors.get(nr)!;
      if (Math.hypot(p.x - d.stand.x, p.z - d.stand.z) < BEL_AFSTAND && p.z < d.stand.z + 1.6) return { woning: w, deur: d };
    }
    return null;
  }

  /** Is de deurscène bezig (camera en speler staan vast)? */
  get inDeurScene(): boolean { return this.deurScene !== null; }

  /**
   * Deurscène: de speler staat op het tuinpad, de deur gaat open en de huurder
   * verschijnt in de deuropening. Resolvet als de deur open is.
   */
  openDeur(deur: DoorInfo, huurderId: string, look: Partial<Look>, reducedMotion: boolean): Promise<void> {
    let h = this.huurders.get(huurderId);
    if (!h) { h = new Character(look); h.root.name = `huurder-${huurderId}`; this.huurders.set(huurderId, h); this.scene.add(h.root); }
    h.setBasis('Idle');
    this.deurHuurder = huurderId;
    this.geholpen.verberg(huurderId);
    h.root.position.set(deur.door.x, 0.14, 0.32);
    h.root.rotation.y = 0;
    h.root.visible = false;
    this.player.setPose(deur.stand.clone().setZ(deur.stand.z + 0.35), Math.PI);
    // aanbellen: korte handbeweging naar de bel, ding-dong, de deur gaat open
    void this.player.figuur.speel('Interact');
    geluid.deurbel();
    setTimeout(() => geluid.deur(true), reducedMotion ? 0 : 450);
    this.camGoal.pos.set(deur.door.x + 1.7, 2.2, deur.stand.z + 4.0);
    this.camGoal.look.set(deur.door.x - 0.2, 1.2, 0.6);
    this.camGoal.lookNow.copy(this.player.position).setY(1.5);
    this.camVast = false;
    this.deurScene = { deur, open: reducedMotion ? 1 : 0, doel: 1, huurder: h };
    this.markers.group.visible = false;
    if (reducedMotion) { this.camera.position.copy(this.camGoal.pos); this.camGoal.lookNow.copy(this.camGoal.look); }
    return new Promise((r) => setTimeout(r, reducedMotion ? 50 : 1100));
  }

  /**
   * Finale: de buren staan in hun voortuin en zwaaien, de camera kijkt schuin langs de rij.
   * Gebruik na openDeur(); sluitDeur() ruimt alles weer op.
   */
  burenZwaaien(buren: { deur: DoorInfo; look: Partial<Look> }[], deur: DoorInfo, reducedMotion: boolean): void {
    for (const b of buren) {
      const c = new Character(b.look);
      c.root.position.set(b.deur.stand.x, 0.08, b.deur.stand.z + 0.4);
      c.root.rotation.y = 0.25;
      c.setBasis('Idle');
      this.scene.add(c.root);
      void c.speel('Wave', { loop: true, keer: 1 });
      this.buren.push(c);
    }
    // breed shot langs de rij, zodat alle zwaaiende buren in beeld zijn
    this.camGoal.pos.set(deur.door.x + 4, 6, 11);
    this.camGoal.look.set(deur.door.x - 6, 0.8, 0.5);
    if (reducedMotion) { this.camera.position.copy(this.camGoal.pos); this.camGoal.lookNow.copy(this.camGoal.look); }
  }

  /** Finale: de speler geeft de sleutels aan de nieuwe huurder. */
  geefSleutels(deur: DoorInfo): Promise<void> {
    const h = this.deurScene?.huurder;
    const g = new THREE.Group();
    const goud = new THREE.MeshStandardMaterial({ color: '#C9A86A', roughness: 0.4, metalness: 0.5 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 14), goud);
    const baard = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.09, 0.006), goud); baard.position.y = -0.075;
    const baard2 = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.08, 0.006), goud); baard2.position.set(0.02, -0.07, 0.006); baard2.rotation.z = 0.3;
    g.add(ring, baard, baard2);
    g.name = 'sleutels';
    const van = this.player.position.clone().add(new THREE.Vector3(0, 1.0, -0.35));
    const naar = new THREE.Vector3(deur.door.x, 1.0, 0.65);
    g.position.copy(van);
    this.scene.add(g);
    this.sleutels = { mesh: g, van, naar, t: 0 };
    void this.player.figuur.speel('Interact');
    return new Promise((r) => setTimeout(() => { void h?.speel('Wave', { keer: 1 }); r(); }, 1300));
  }

  /** De huurder in de deuropening zwaait (afloop). */
  zwaai(huurderId: string): void { void this.huurders.get(huurderId)?.speel('Wave', { keer: 2 }); }

  /** Deur dicht, huurder weg, camera terug naar de speler. */
  sluitDeur(): void {
    const d = this.deurScene;
    if (!d) return;
    d.deur.deur.rotation.y = 0;
    d.deur.opening.visible = false;
    geluid.deur(false);
    d.huurder.root.visible = false;
    for (const b of this.buren) b.root.removeFromParent();
    this.buren = [];
    if (this.sleutels) { this.sleutels.mesh.removeFromParent(); this.sleutels = null; }
    this.deurScene = null;
    this.geholpen.verberg(null);
    this.camVast = false;
    this.markers.group.visible = true;
    this.player.syncCamera();
  }

  /**
   * Camera vliegt in een boog van de huidige plek naar de entree van het kantoor.
   * Bij "minder beweging" springt de camera direct.
   */
  vliegNaarKantoor(reducedMotion: boolean): Promise<void> {
    const kijkNu = new THREE.Vector3();
    this.camera.getWorldDirection(kijkNu);
    kijkNu.multiplyScalar(5).add(this.camera.position);
    this.camVast = true;
    return new Promise((klaar) => {
      if (reducedMotion) {
        this.camera.position.copy(this.kantoorView.pos);
        this.camera.lookAt(this.kantoorView.kijk);
        klaar();
        return;
      }
      this.vlucht = { t: 0, duur: 2.6, van: this.camera.position.clone(), vanKijk: kijkNu, naar: this.kantoorView.pos.clone(), naarKijk: this.kantoorView.kijk.clone(), klaar };
    });
  }

  update(dt: number, t: number, reducedMotion: boolean): void {
    this.markers.update(t, reducedMotion);
    if (!reducedMotion) omgevingsTijd.value += dt;
    this.leven.update(dt, this.camera, this.player.position, reducedMotion);
    this.lucht.update(dt, t, reducedMotion);
    this.geholpen.update(dt, this.player.position, this.camera, reducedMotion);
    const v = this.vlucht;
    if (v) {
      v.t = Math.min(1, v.t + dt / v.duur);
      const e = v.t < 0.5 ? 4 * v.t ** 3 : 1 - (-2 * v.t + 2) ** 3 / 2;
      this.camera.position.lerpVectors(v.van, v.naar, e);
      this.camera.position.y += Math.sin(Math.PI * e) * 14;
      const kijk = new THREE.Vector3().lerpVectors(v.vanKijk, v.naarKijk, e);
      this.camera.lookAt(kijk);
      this.player.idle(dt);
      if (v.t >= 1) { this.vlucht = null; v.klaar(); }
      return;
    }
    const d = this.deurScene;
    if (!d && this.camVast) { this.player.idle(dt); return; }
    if (!d) { this.player.update(dt); return; }
    this.player.idle(dt);
    d.open = Math.min(d.doel, d.open + dt * 1.4);
    const e = d.open * d.open * (3 - 2 * d.open);
    d.deur.deur.rotation.y = e * 1.75;
    d.deur.opening.visible = d.open > 0.02;
    d.huurder.root.visible = d.open > 0.45;
    d.huurder.kijkNaar = this.camera.position.clone();
    d.huurder.animate(dt, 0);
    for (const b of this.buren) b.animate(dt, 0);
    const s = this.sleutels;
    if (s && s.t < 1) {
      s.t = Math.min(1, s.t + dt / 1.1);
      const e = s.t * s.t * (3 - 2 * s.t);
      s.mesh.position.lerpVectors(s.van, s.naar, e);
      s.mesh.position.y += Math.sin(Math.PI * e) * 0.25;
      s.mesh.rotation.y += dt * 4;
    }
    const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 3.5);
    this.camera.position.lerp(this.camGoal.pos, k);
    this.camGoal.lookNow.lerp(this.camGoal.look, k);
    this.camera.lookAt(this.camGoal.lookNow);
  }

  resize(w: number, h: number): void {
    this.lucht.resize(h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
