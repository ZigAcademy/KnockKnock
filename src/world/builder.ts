import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { detailVoorKleur, metDetail } from '../render/detail';
import type { Beplanting } from './beplanting';
import { WORLD } from '../theme';
import { bakGeometrie, geplaatsteMaat, kitModel, plaatsMatrix, type KitNaam, type Palet, type Plaatsing } from '../assets/modellen';

/**
 * Verzamelt statische geometrie met vertexkleuren en voegt alles samen tot een
 * paar meshes. Zo blijft het aantal draw calls laag (hele straat ≈ 2 calls).
 */
export class StaticBuilder {
  private casters: THREE.BufferGeometry[] = [];
  private receivers: THREE.BufferGeometry[] = [];
  private tmpColor = new THREE.Color();
  /** Heggen en gazons (buitenmaten), voor de losse blaadjes en graspollen erop. */
  readonly heggen: THREE.Box3[] = [];
  readonly gazons: THREE.Box3[] = [];
  /** Paden en stoepjes: daar komt geen gras. */
  readonly paden: THREE.Box3[] = [];
  /** Plantenbakken en dergelijke: daar komt ook geen gras doorheen. */
  readonly obstakels: THREE.Box3[] = [];

  /** buiten: wind in bomen en planten, wolkenschaduw (alleen voor de straat). */
  /** hegZonderKern: deze heg wordt door een echt heg-model vervangen, dus geen doos eronder (die schemert anders door). */
  constructor(private opties: { buiten?: boolean; beplanting?: Beplanting; hegZonderKern?: (b: THREE.Box3) => boolean } = {}) {}

  add(geom: THREE.BufferGeometry, color: string, opts: { castShadow?: boolean } = {}): void {
    let g = geom.index ? geom.toNonIndexed() : geom;
    if (g !== geom) geom.dispose();
    g.deleteAttribute('uv');
    const n = g.getAttribute('position').count;
    const c = this.tmpColor.set(color);
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    const det = detailVoorKleur(color);
    const kl = color.toLowerCase();
    if (kl === WORLD.hedge.toLowerCase()) {
      g.computeBoundingBox(); this.heggen.push(g.boundingBox!.clone());
      if (this.opties.hegZonderKern?.(g.boundingBox!)) { g.dispose(); return; }
    }
    else if (kl === WORLD.grassDark.toLowerCase()) { g.computeBoundingBox(); this.gazons.push(g.boundingBox!.clone()); }
    else if (kl === WORLD.path.toLowerCase() || kl === WORLD.sidewalk.toLowerCase()) { g.computeBoundingBox(); this.paden.push(g.boundingBox!.clone()); }
    else if (kl === '#7a6656' || kl === '#5a4a3e') { g.computeBoundingBox(); this.obstakels.push(g.boundingBox!.clone()); }
    if (det) g.setAttribute('aDetail', new THREE.BufferAttribute(new Float32Array(n).fill(det), 1));
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
  model(kit: KitNaam, naam: string, p: Plaatsing, palet?: Palet, opts: { castShadow?: boolean; nabewerk?: (g: THREE.BufferGeometry) => void; detail?: number } = {}): THREE.Vector3 | null {
    // bomen, struiken, bloemen en gras: mooiere planten (instanced) als die er zijn
    if (kit === 'natuur' && this.opties.beplanting?.neemOver(naam, p)) {
      const oud = kitModel(kit, naam);
      return oud ? geplaatsteMaat(oud, p) : new THREE.Vector3(1, 1, 1);
    }
    const o = kitModel(kit, naam);
    if (!o) return null;
    const geos = bakGeometrie(o, plaatsMatrix(o, p), palet);
    // natuur wiegt in de wind: hoe hoger in het model, hoe meer (de voet staat stil)
    if (kit === 'natuur' && this.opties.buiten) {
      let y0 = Infinity, y1 = -Infinity;
      for (const g of geos) { const a = g.getAttribute('position'); for (let i = 0; i < a.count; i++) { y0 = Math.min(y0, a.getY(i)); y1 = Math.max(y1, a.getY(i)); } }
      const h = Math.max(0.01, y1 - y0), schaal = Math.min(1.6, 0.4 + h * 0.2);
      for (const g of geos) {
        const a = g.getAttribute('position'), w = new Float32Array(a.count);
        for (let i = 0; i < a.count; i++) { const f = (a.getY(i) - y0) / h; w[i] = f * f * schaal; }
        g.setAttribute('aWind', new THREE.BufferAttribute(w, 1));
      }
    }
    for (const g of geos) {
      opts.nabewerk?.(g);
      // oppervlaktedetail voor het hele model (bijv. houtnerf op een hek)
      if (opts.detail) g.setAttribute('aDetail', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count).fill(opts.detail), 1));
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
    const mat = metDetail(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, flatShading: true }), { buiten: this.opties.buiten });
    // samenvoegen vraagt dezelfde attributen overal: aDetail = 0 waar het ontbreekt
    for (const g of [...this.casters, ...this.receivers]) {
      if (!g.getAttribute('aDetail')) g.setAttribute('aDetail', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count), 1));
      if (!g.getAttribute('aWind')) g.setAttribute('aWind', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count), 1));
      if (g.getAttribute('uv')) g.deleteAttribute('uv');
    }
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
