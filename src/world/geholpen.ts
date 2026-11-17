import * as THREE from 'three';
import { Character, type Look } from '../player/character';
import type { DoorInfo } from './street';
import { boxCollider, type Collider } from './collision';
import { WORLD } from '../theme';

/**
 * Zichtbaar verschil in de straat na het helpen van een woning:
 * - de huurder staat in de voortuin en zwaait als je langsloopt;
 * - nr 16: de dakgoot lekt zichtbaar tot de woning af is (casus: lekkende dakgoot);
 * - de lamp bij de fietsenstalling (tegenover nr 18) hangt eerst scheef en uit, daarna recht en aan;
 * - nr 26: na de finale zijn de ramen ingericht en staat mevrouw Yilmaz in de tuin.
 * Alleen beeld uit de casusteksten in scenarios.json; geen nieuwe inhoud.
 */

interface TuinHuurder { char: Character; id: string; wachtTot: number; deur: DoorInfo }

export class Geholpen {
  private tuin = new Map<string, TuinHuurder>();
  private druppels: THREE.Mesh[] = [];
  private plas: THREE.Mesh;
  private lekAan = true;
  private lamp: THREE.Group;
  private lampKop: THREE.Mesh;
  private lichtbundel: THREE.Mesh;
  private t = 0;

  constructor(private scene: THREE.Scene, private colliders: Collider[], doors: Map<number, DoorInfo>, private bewoon26: () => void) {
    // --- lekkende dakgoot bij nr 16 (dakrand op y 5.6, overstek tot z 0.35)
    const d16 = doors.get(16);
    const water = new THREE.MeshStandardMaterial({ color: WORLD.water, transparent: true, opacity: 0.85, roughness: 0.1 });
    const x = (d16?.door.x ?? 7.5) - 2.6;
    const goot = new THREE.Mesh(new THREE.BoxGeometry(6, 0.14, 0.16), new THREE.MeshStandardMaterial({ color: '#4A4E55', roughness: 0.6 }));
    goot.position.set((d16?.door.x ?? 7.5) - 1.5, 5.55, 0.45);
    goot.name = 'dakgoot-16';
    scene.add(goot);
    for (let i = 0; i < 6; i++) {
      const dr = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4).scale(1, 1.8, 1), water);
      dr.position.set(x + (i % 2) * 0.05, 5.4 - i * 0.9, 0.5);
      dr.name = 'druppel-16';
      scene.add(dr);
      this.druppels.push(dr);
    }
    this.plas = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16).rotateX(-Math.PI / 2), water);
    this.plas.position.set(x, 0.1, 0.55);
    scene.add(this.plas);

    // --- lamp bij de fietsenstalling (tegenover nr 18: x 12, z 17.2; dak op 2.3 m)
    this.lamp = new THREE.Group();
    this.lamp.position.set(12, 2.25, 16.15);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.06), new THREE.MeshStandardMaterial({ color: WORLD.metal }));
    arm.position.y = -0.2;
    this.lampKop = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.22, 0.16, 12), new THREE.MeshStandardMaterial({ color: '#3B4350', emissive: '#FFD9A6', emissiveIntensity: 0 }));
    this.lampKop.position.y = -0.45;
    this.lichtbundel = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.7, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#FFE2B0', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }));
    this.lichtbundel.position.y = -1.35;
    this.lichtbundel.visible = false;
    this.lamp.add(arm, this.lampKop, this.lichtbundel);
    this.lamp.rotation.x = 0.55; // scheef
    this.lamp.name = 'stallinglamp';
    scene.add(this.lamp);
  }

  /** Woning is af: zet het verschil in de straat. */
  af(woningId: string, huurderId: string, look: Partial<Look>, deur: DoorInfo | undefined): void {
    if (woningId === 'w2') { this.lekAan = false; for (const d of this.druppels) d.visible = false; this.plas.visible = false; }
    if (woningId === 'w3') {
      this.lamp.rotation.x = 0;
      (this.lampKop.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.4;
      this.lichtbundel.visible = true;
    }
    if (woningId === 'finale') this.bewoon26();
    if (!deur || this.tuin.has(huurderId)) return;
    const c = new Character(look);
    c.setBasis('Idle');
    c.root.position.set(deur.door.x - 1.7, 0.07, 2.2);
    c.root.name = `tuin-${huurderId}`;
    this.scene.add(c.root);
    this.colliders.push(boxCollider(deur.door.x - 2.0, deur.door.x - 1.4, 1.9, 2.5, 1.8, false));
    this.tuin.set(huurderId, { char: c, id: huurderId, wachtTot: 0, deur });
  }

  /** Tijdens de deurscène van die woning staat de huurder in de deur, niet in de tuin. */
  verberg(huurderId: string | null): void {
    for (const h of this.tuin.values()) h.char.root.visible = h.id !== huurderId;
  }

  get aantalInTuin(): number { return this.tuin.size; }

  update(dt: number, speler: THREE.Vector3, camera: THREE.Camera, reducedMotion: boolean): void {
    this.t += dt;
    if (this.lekAan && !reducedMotion) {
      this.druppels.forEach((d, i) => {
        const f = ((this.t * 0.9 + i / this.druppels.length) % 1);
        d.position.y = 5.4 - f * 5.25;
      });
    }
    for (const h of this.tuin.values()) {
      const r = h.char.root;
      if (!r.visible) continue;
      const afstand = r.position.distanceTo(speler);
      // alleen animeren als hij in de buurt van de camera is (prestatie)
      if (r.position.distanceTo(camera.position) > 40) continue;
      // kijk naar de speler als die dichtbij is, anders naar de straat
      const doel = afstand < 7 ? Math.atan2(speler.x - r.position.x, speler.z - r.position.z) : 0;
      let diff = doel - r.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      r.rotation.y += diff * (1 - Math.exp(-dt * 4));
      if (afstand < 5 && this.t > h.wachtTot) { void h.char.speel('Wave'); h.wachtTot = this.t + 9; }
      h.char.animate(dt, 0);
    }
  }
}
