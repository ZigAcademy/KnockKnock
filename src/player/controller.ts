import * as THREE from 'three';
import type { Character } from './character';
import type { Input } from './input';
import { moveWithCollision, rayDistance, type Collider } from '../world/collision';

export interface ControllerOptions {
  colliders: Collider[];
  heightAt: (x: number, z: number) => number;
  /** Zet een klikpunt om in een route (tussenpunten), bijv. via het tuinpad. */
  planRoute?: (from: THREE.Vector3, to: THREE.Vector3) => THREE.Vector3[];
  reducedMotion: () => boolean;
}

const RADIUS = 0.32;
const WALK = 3.4;
const RUN = 6.4;

/** Third-person besturing + camera die soepel volgt en niet door muren gaat. */
export class PlayerController {
  yaw = -Math.PI / 2 + 0.55;
  pitch = 0.42;
  distance = 7;
  speed = 0;
  private target: THREE.Vector3 | null = null;
  private route: THREE.Vector3[] = [];
  private stuckTime = 0;
  private camPos = new THREE.Vector3();
  private camInit = false;
  private raycaster = new THREE.Raycaster();
  private ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private ring: THREE.Mesh;

  constructor(
    private character: Character,
    private camera: THREE.PerspectiveCamera,
    private input: Input,
    private opts: ControllerOptions,
    scene: THREE.Scene,
    ringColor: string,
  ) {
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.28, 0.4, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.9, depthWrite: false }),
    );
    this.ring.visible = false;
    scene.add(this.ring);
  }

  get position(): THREE.Vector3 { return this.character.root.position; }

  /** Het personage zelf (voor animaties als aanbellen). */
  get figuur(): Character { return this.character; }

  /** Ander personage (na het kiezen van je uiterlijk); plek en richting blijven gelijk. */
  vervangFiguur(nieuw: Character): void {
    const oud = this.character;
    nieuw.root.position.copy(oud.root.position);
    nieuw.root.rotation.copy(oud.root.rotation);
    nieuw.onStap = oud.onStap;
    oud.root.parent?.add(nieuw.root);
    oud.root.removeFromParent();
    this.character = nieuw;
  }

  walkTo(p: THREE.Vector3): void {
    const route = this.opts.planRoute?.(this.position.clone(), p) ?? [p];
    const end = route[route.length - 1];
    this.route = route.slice(1).map((v) => v.clone());
    this.target = route[0].clone();
    this.stuckTime = 0;
    this.ring.position.set(end.x, this.opts.heightAt(end.x, end.z) + 0.03, end.z);
    this.ring.visible = true;
  }

  update(dt: number): void {
    const inp = this.input;
    const pos = this.position;

    // camera draaien / zoomen
    this.yaw -= inp.look.dx * 0.006;
    this.pitch = THREE.MathUtils.clamp(this.pitch + inp.look.dy * 0.004, 0.12, 1.15);
    inp.look.dx = 0; inp.look.dy = 0;
    if (inp.zoom) { this.distance = THREE.MathUtils.clamp(this.distance + inp.zoom * 0.8, 3.5, 13); inp.zoom = 0; }

    // klik-om-te-lopen
    for (const c of inp.clicks.splice(0)) {
      if (!inp.enabled) continue;
      const ndc = new THREE.Vector2((c.x / window.innerWidth) * 2 - 1, -(c.y / window.innerHeight) * 2 + 1);
      this.raycaster.setFromCamera(ndc, this.camera);
      const hit = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.ground, hit)) {
        this.walkTo(hit);
      }
    }

    const intent = inp.intent();
    this.yaw -= intent.turn * dt * 2.2;
    const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const move = new THREE.Vector3().addScaledVector(fwd, intent.forward).addScaledVector(right, intent.right);
    let maxSpeed = intent.run ? RUN : WALK;

    if (move.lengthSq() > 0.0001) {
      this.cancelTarget();
      if (move.length() > 1) move.normalize();
      maxSpeed *= Math.max(move.length(), 0.35);
      move.normalize();
    } else if (this.target) {
      move.set(this.target.x - pos.x, 0, this.target.z - pos.z);
      const d = move.length();
      const last = this.route.length === 0;
      if (d < (last ? 0.12 : 0.45)) {
        if (last) { this.cancelTarget(); move.set(0, 0, 0); }
        else { this.target = this.route.shift()!; move.divideScalar(d); }
      } else { move.divideScalar(d); maxSpeed = last ? Math.min(WALK, d * 4 + 0.6) : WALK; }
    }

    let actual = 0;
    if (move.lengthSq() > 0) {
      const step = maxSpeed * dt;
      const before = { x: pos.x, z: pos.z };
      const next = moveWithCollision(this.opts.colliders, pos.x, pos.z, move.x * step, move.z * step, RADIUS);
      pos.x = next.x; pos.z = next.z;
      actual = Math.hypot(pos.x - before.x, pos.z - before.z) / Math.max(dt, 1e-4);
      // draai het personage naar de looprichting
      const want = Math.atan2(move.x, move.z);
      let diff = want - this.character.root.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.character.root.rotation.y += diff * (1 - Math.exp(-dt * 14));
      if (this.target) {
        this.stuckTime = actual < 0.3 ? this.stuckTime + dt : 0;
        if (this.stuckTime > 0.6) this.cancelTarget();
      }
    }
    this.speed += (actual - this.speed) * (1 - Math.exp(-dt * 10));
    pos.y += (this.opts.heightAt(pos.x, pos.z) - pos.y) * (1 - Math.exp(-dt * 20));
    this.character.animate(dt, this.speed);
    if (this.ring.visible) this.ring.rotation.y += dt;

    this.updateCamera(dt);
  }

  /** Neem de huidige camerapositie over (na een tussenscène), zodat er niets springt. */
  syncCamera(): void { this.camPos.copy(this.camera.position); this.camInit = true; }

  /** Zet het personage op een plek met een kijkrichting. */
  setPose(p: THREE.Vector3, rotY: number): void {
    this.cancelTarget();
    this.position.set(p.x, this.opts.heightAt(p.x, p.z), p.z);
    this.character.root.rotation.y = rotY;
    this.speed = 0;
  }

  /** Camera terug naar de standaardstand achter het personage. */
  herstelCamera(): void {
    this.yaw = -Math.PI / 2 + 0.55; this.pitch = 0.42; this.distance = 7;
    this.camInit = false;
  }

  /** Alleen de loopanimatie bijwerken (tijdens een tussenscène). */
  idle(dt: number): void { this.speed *= 0.8; this.character.animate(dt, this.speed); }

  private cancelTarget(): void { this.target = null; this.route = []; this.ring.visible = false; }

  private updateCamera(dt: number): void {
    const p = this.position;
    const focus = new THREE.Vector3(p.x, p.y + 1.5, p.z);
    const dir = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    const hit = rayDistance(this.opts.colliders, focus.x, focus.y, focus.z, dir.x, dir.y, dir.z, this.distance);
    const dist = Math.max(1.2, Math.min(this.distance, hit - 0.35));
    const desired = focus.clone().addScaledVector(dir, dist);
    desired.y = Math.max(desired.y, 0.4);
    if (!this.camInit || this.opts.reducedMotion()) { this.camPos.copy(desired); this.camInit = true; }
    else {
      // dichterbij springen gaat snel (nooit door een muur), uitzoomen soepel
      const closer = desired.distanceTo(focus) < this.camPos.distanceTo(focus) - 0.05;
      this.camPos.lerp(desired, 1 - Math.exp(-dt * (closer ? 30 : 8)));
    }
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(focus);
  }

  /** Schermpositie (CSS-pixels) van een wereldpunt, voor tests en UI. */
  project(p: THREE.Vector3): { x: number; y: number } {
    const v = p.clone().project(this.camera);
    return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight };
  }
}
