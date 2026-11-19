import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

/**
 * Lucht en omgevingslicht uit een HDRI (Poly Haven, CC0: "Kloofendal 48d Partly Cloudy (Pure Sky)",
 * Greg Zaal en Jarod Guest). Geeft materialen zacht omgevingslicht en reflecties (autoruiten, glas)
 * en vervangt de getekende lucht door een echte lucht met wolken. Mislukt het laden, dan blijft
 * de getekende lucht staan.
 */
export function laadOmgeving(renderer: THREE.WebGLRenderer, scene: THREE.Scene, opVervangen: () => void): void {
  new HDRLoader().load('./assets/omgeving/lucht.hdr', (hdr) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromEquirectangular(hdr).texture;
    pmrem.dispose();
    scene.environment = env;
    scene.environmentIntensity = 0.45;
    scene.background = hdr;
    scene.backgroundIntensity = 0.85;
    scene.backgroundBlurriness = 0.02;
    opVervangen();
  }, undefined, () => { /* geen HDRI: getekende lucht blijft */ });
}
