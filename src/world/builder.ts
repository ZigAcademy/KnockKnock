import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bakGeometrie, geplaatsteMaat, kitModel, plaatsMatrix, type KitNaam, type Palet, type Plaatsing } from '../assets/modellen';

/**
 * Verzamelt statische geometrie met vertexkleuren en voegt alles samen tot een
 * paar meshes. Zo blijft het aantal draw calls laag (hele straat ≈ 2 calls).
 */
export class StaticBuilder {
  private casters: THREE.BufferGeometry[] = [];
  private receivers: THREE.BufferGeometry[] = [];
  private tmpColor = new THREE.Color();

  add(geom: THREE.BufferGeometry, color: string, opts: { castShadow?: boolean } = {}): void {
    let g = geom.index ? geom.toNonIndexed() : geom;
    if (g !== geom) geom.dispose();
    g.deleteAttribute('uv');
    const n = g.getAttribute('position').count;
    const c = this.tmpColor.set(color);
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    (opts.castShadow === false ? this.receivers : this.casters).push(g);
  }

  /** Doos met het midden van de onderkant op (x, y, z). */
  box(w: number, h: number, d: number, x: number, y: number, z: number, color: string, opts?: { castShadow?: boolean; rotY?: number }): void {
    const g = new THREE.BoxGeometry(w, h, d);
    if (opts?.rotY) g.rotateY(opts.rotY);
    g.translate(x, y + h / 2, z);
    this.add(g, color, opts);
  }

  /**
   * Kitmodel ingebakken in de samengevoegde geometrie (kleuren via het palet).
   * Geeft de geplaatste maat terug, of null als het model niet geladen is.
   */
  model(kit: KitNaam, naam: string, p: Plaatsing, palet?: Palet, opts: { castShadow?: boolean; nabewerk?: (g: THREE.BufferGeometry) => void } = {}): THREE.Vector3 | null {
    const o = kitModel(kit, naam);
    if (!o) return null;
    for (const g of bakGeometrie(o, plaatsMatrix(o, p), palet)) {
      opts.nabewerk?.(g);
      (opts.castShadow === false ? this.receivers : this.casters).push(g);
    }
    return geplaatsteMaat(o, p);
  }

  /** Losse geometrie (lokaal) met een transformatie toevoegen. */
  addAt(geom: THREE.BufferGeometry, color: string, m: THREE.Matrix4, opts?: { castShadow?: boolean }): void {
    geom.applyMatrix4(m);
    this.add(geom, color, opts);
  }

  build(): THREE.Group {
    const group = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true });
    if (this.casters.length) {
      const m = new THREE.Mesh(mergeGeometries(this.casters), mat);
      m.castShadow = true; m.receiveShadow = true; m.name = 'static-casters';
      group.add(m);
    }
    if (this.receivers.length) {
      const m = new THREE.Mesh(mergeGeometries(this.receivers), mat);
      m.receiveShadow = true; m.name = 'static-ground';
      group.add(m);
    }
    this.casters.forEach((g) => g.dispose());
    this.receivers.forEach((g) => g.dispose());
    this.casters = []; this.receivers = [];
    return group;
  }
}
