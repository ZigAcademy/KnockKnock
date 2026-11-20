import * as THREE from 'three';
import type { Input } from './input';
import { moveWithCollision, type Collider } from '../world/collision';

/**
 * Gimmick: instappen in een geparkeerde auto en zelf een rondje rijden (standaardversie).
 * Arcadebesturing: W/pijl omhoog gas, S/pijl omlaag remmen en achteruit, A/D of pijl links/rechts sturen
 * (touch: joystick). De auto botst als een cirkel tegen dezelfde vakken als de speler.
 * Een achtervolgcamera hangt achter de auto. Uitstappen zet de speler naast het bestuurdersportier
 * en de auto blijft staan waar hij is (met een nieuw botsvak).
 */
const MAX = 13, ACHTERUIT = 4, GAS = 5.5, REM = 11, RUW = 3;
const STRAAL = 0.95;

export interface Rijdbaar { object: THREE.Object3D; collider: Collider }

export class Rijden {
  auto: Rijdbaar | null = null;
  private v = 0;
  private koers = 0;
  private camPos = new THREE.Vector3();
  private stuur = 0;

  constructor(private colliders: Collider[], private camera: THREE.PerspectiveCamera, private input: Input) {}

  get rijdt(): boolean { return this.auto !== null; }
  get snelheid(): number { return Math.abs(this.v); }

  instappen(a: Rijdbaar): void {
    this.auto = a;
    // het eigen botsvak tijdelijk weg (anders bots je tegen jezelf)
    const i = this.colliders.indexOf(a.collider);
    if (i >= 0) this.colliders.splice(i, 1);
    this.koers = a.object.rotation.y;
    this.v = 0; this.stuur = 0;
    this.camPos.copy(this.camera.position);
  }

  /** Uitstappen: geeft de plek naast het bestuurdersportier (links) terug. */
  uitstappen(): THREE.Vector3 {
    const a = this.auto!;
    const p = a.object.position, d = this.richting;
    const lengte = 2.3, breed = 1.0;
    a.collider.minX = p.x - (Math.abs(d.x) * lengte + Math.abs(d.z) * breed);
    a.collider.maxX = p.x + (Math.abs(d.x) * lengte + Math.abs(d.z) * breed);
    a.collider.minZ = p.z - (Math.abs(d.z) * lengte + Math.abs(d.x) * breed);
    a.collider.maxZ = p.z + (Math.abs(d.z) * lengte + Math.abs(d.x) * breed);
    this.colliders.push(a.collider);
    this.auto = null;
    this.v = 0;
    // links van de auto (bestuurderskant), anders rechts als daar iets staat
    const links = new THREE.Vector3(d.z, 0, -d.x);
    for (const kant of [1, -1]) {
      const q = p.clone().addScaledVector(links, kant * 1.55);
      const vrij = !this.colliders.some((c) => q.x > c.minX - 0.35 && q.x < c.maxX + 0.35 && q.z > c.minZ - 0.35 && q.z < c.maxZ + 0.35);
      if (vrij) return q;
    }
    return p.clone().addScaledVector(d, -3);
  }

  get richting(): THREE.Vector3 { return new THREE.Vector3(Math.sin(this.koers), 0, Math.cos(this.koers)); }

  update(dt: number): void {
    const a = this.auto;
    if (!a) return;
    const intent = this.input.intent();
    const gas = this.input.enabled ? intent.forward : 0;
    const stuurIn = this.input.enabled ? THREE.MathUtils.clamp(intent.right + intent.turn, -1, 1) : 0;
    // snelheid
    if (gas > 0.05) this.v += (this.v < 0 ? REM : GAS) * gas * dt;
    else if (gas < -0.05) this.v -= (this.v > 0 ? REM : GAS * 0.7) * -gas * dt;
    else this.v -= Math.sign(this.v) * Math.min(Math.abs(this.v), RUW * dt);
    this.v = THREE.MathUtils.clamp(this.v, -ACHTERUIT, MAX);
    // sturen: zacht naar de stuurstand, draaien hangt af van de snelheid
    this.stuur += (stuurIn - this.stuur) * (1 - Math.exp(-dt * 8));
    const draai = this.stuur * THREE.MathUtils.clamp(this.v / 2.5, -1, 1) * 1.5;
    this.koers -= draai * dt;
    // bewegen met botsing (tegen een muur: snelheid weg)
    const d = this.richting, p = a.object.position;
    const stap = this.v * dt;
    const n = moveWithCollision(this.colliders, p.x, p.z, d.x * stap, d.z * stap, STRAAL);
    const gehaald = Math.hypot(n.x - p.x, n.z - p.z);
    if (Math.abs(stap) > 0.001 && gehaald < Math.abs(stap) * 0.5) this.v *= 0.3;
    p.x = n.x; p.z = n.z;
    a.object.rotation.y = this.koers;
    // lichte helling bij optrekken en remmen
    a.object.rotation.x = THREE.MathUtils.clamp(-gas * 0.015, -0.02, 0.02);
    // achtervolgcamera
    const doel = p.clone().addScaledVector(d, -7.5).setY(3.4);
    this.camPos.lerp(doel, 1 - Math.exp(-dt * 4));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(p.x + d.x * 3, 1.2, p.z + d.z * 3);
  }
}
