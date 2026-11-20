import * as THREE from 'three';
import { kitModel } from '../assets/modellen';

/**
 * Realistischere auto's uit de Generic passenger car pack (Comrade1280, CC-BY 4.0; tools/autos.mjs).
 * Elke auto is een groep met vier meshes (carrosserie, glas, lampen, wielen), voorkant naar +z,
 * echte maat in meters. Kopieën delen geometrie en materialen. Zonder kit (lage resolutie of
 * niet geladen) geeft voertuig() null en gebruikt de straat de oude Kenney-auto's.
 */

/** Oude Kenney-naam → auto in de nieuwe kit. */
export const VOERTUIG_VOOR: Record<string, string> = {
  sedan: 'sedan', van: 'minivan', suv: 'suv', bestelbus: 'compact', hatchback: 'hatchback', stationwagen: 'stationwagen',
};

const aangepast = new WeakSet<THREE.Material>();
/** Glas donker en glanzend (spiegelt de lucht), lak iets glanzender. */
function verfijn(m: THREE.Material): void {
  if (aangepast.has(m)) return;
  aangepast.add(m);
  const s = m as THREE.MeshStandardMaterial;
  if (/glass/i.test(m.name)) {
    s.map = null;
    s.color.set('#1E2833');
    s.roughness = 0.06; s.metalness = 0.85;
    s.envMapIntensity = 1.4;
    s.needsUpdate = true;
  } else if (/body/i.test(m.name)) {
    s.envMapIntensity = 1.2;
  }
}

export function voertuig(naam: string): THREE.Object3D | null {
  const bron = kitModel('voertuigen', naam);
  if (!bron) return null;
  const o = bron.clone(true);
  o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1);
  o.traverse((n) => {
    const m = n as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true; m.receiveShadow = true;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) verfijn(mat);
  });
  o.userData.bundel = true;
  return o;
}
