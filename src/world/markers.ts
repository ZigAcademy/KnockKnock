import * as THREE from 'three';
import { checkTexture, markerTexture } from './labels';

export type MarkerState = 'open' | 'af';

/** Zwevende markeringen boven de deur: oranje = probleem, blauw vinkje = afgerond. */
export class Markers {
  readonly group = new THREE.Group();
  private items = new Map<string, { sprite: THREE.Sprite; baseY: number; phase: number }>();
  private openMat: THREE.SpriteMaterial;
  private doneMat: THREE.SpriteMaterial;

  constructor() {
    this.openMat = new THREE.SpriteMaterial({ map: markerTexture(), depthWrite: false });
    this.doneMat = new THREE.SpriteMaterial({ map: checkTexture(), depthWrite: false });
  }

  add(id: string, pos: THREE.Vector3, state: MarkerState = 'open'): void {
    const s = new THREE.Sprite(state === 'open' ? this.openMat : this.doneMat);
    s.scale.set(0.75, 0.75 * 1.3, 1);
    s.position.copy(pos);
    s.center.set(0.5, 0);
    s.name = `marker-${id}`;
    this.group.add(s);
    this.items.set(id, { sprite: s, baseY: pos.y, phase: this.items.size * 0.9 });
  }

  setState(id: string, state: MarkerState): void {
    const it = this.items.get(id);
    if (it) it.sprite.material = state === 'open' ? this.openMat : this.doneMat;
  }

  /** Markering tonen of verbergen (bijv. de finale tot de andere woningen af zijn). */
  setZichtbaar(id: string, zichtbaar: boolean): void {
    const it = this.items.get(id);
    if (it) it.sprite.visible = zichtbaar;
  }

  update(t: number, reducedMotion: boolean): void {
    for (const it of this.items.values()) {
      it.sprite.position.y = reducedMotion ? it.baseY : it.baseY + Math.sin(t * 2 + it.phase) * 0.12;
    }
  }
}
