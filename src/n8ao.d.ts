/** Minimale typen voor n8ao (de bibliotheek levert geen .d.ts mee). */
declare module 'n8ao' {
  import type { Pass } from 'postprocessing';
  import type { Scene, Camera } from 'three';
  export class N8AOPostPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number);
    scene: Scene;
    camera: Camera;
    configuration: Record<string, unknown>;
    setSize(width: number, height: number): void;
  }
}
