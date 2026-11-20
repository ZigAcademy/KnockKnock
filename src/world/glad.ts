import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { kitMesh, type KitNaam, type Palet, type Plaatsing } from '../assets/modellen';

/**
 * Kitmodel (Kenney) glad weergegeven in plaats van facetachtig: normalen gemiddeld tot 40° (randen blijven
 * scherp) en een iets glanzender materiaal, zoals plastic. Voor objecten waar je dichtbij komt (kliko's).
 */
const mats = new Map<number, THREE.MeshStandardMaterial>();
const geoCache = new Map<string, THREE.BufferGeometry>();
/** sleutel: zelfde sleutel = zelfde kleuren, dan wordt de geometrie gedeeld (en kan hij gebundeld worden). */
export function gladModel(kit: KitNaam, naam: string, p: Plaatsing, palet?: Palet, ruwheid = 0.55, sleutel = ''): THREE.Mesh | null {
  let mat = mats.get(ruwheid);
  if (!mat) { mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: ruwheid, metalness: 0 }); mats.set(ruwheid, mat); }
  const ck = `${kit}/${naam}/${p.h ?? ''}/${p.w ?? ''}/${p.y ?? 0}/${sleutel}`;
  const m = kitMesh(kit, naam, { ...p, x: 0, z: 0, rotY: 0 }, palet, mat);
  if (!m) return null;
  const g = sleutel ? geoCache.get(ck) : undefined;
  if (g) m.geometry = g;
  else { m.geometry = toCreasedNormals(m.geometry, (40 * Math.PI) / 180); if (sleutel) geoCache.set(ck, m.geometry); }
  m.userData.bundel = true;
  m.position.set(p.x, 0, p.z); // de hoogte (p.y) zit al in de geometrie
  m.rotation.y = p.rotY ?? 0;
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
