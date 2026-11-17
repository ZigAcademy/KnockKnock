import * as THREE from 'three';
import type { Palet } from '../assets/modellen';
import { WORLD } from '../theme';

/**
 * Kleuren voor de modellen uit de packs: gedempt, zodat Zig-blauw en -oranje
 * (markeringen, hotspots, call-to-action) blijven opvallen. Oranje komt hier nooit voor.
 */
const map = (m: Record<string, string>, rest?: string): Palet => (naam) => m[naam] ?? rest;

/** Bomen, struiken en bloemen uit de Nature Kit. */
export const natuurPalet = (blad: string = WORLD.leaves[0]): Palet => map({
  leafsGreen: blad, woodBark: WORLD.trunk, grass: '#6E8C58', colorRed: '#B06A62', colorYellow: '#CDB06A',
  colorPurple: '#8E80A8', wood: '#9A7B5F', woodDark: '#7E6249', stone: '#B9B4AA', woodBarkDark: '#6B5443', _defaultMat: '#7E8A70',
});

export const lantaarnPalet: Palet = () => '#3D4046';
export const klikoPalet = (deksel = '#4E6247', bak = '#4E6247'): Palet => map({ DarkGreen: bak, Black: '#2E3033' }, deksel);
export const prullenbakPalet: Palet = map({ LightMetal: '#4D5A50' });
export const deurmatPalet = (kleur: string): Palet => () => kleur;

/** Achtergrondgebouwen: eigen gevelkleur, lichte kozijnen, glas dat de lucht spiegelt, donker dak. */
export const gebouwPalet = (muur: string): Palet => {
  const c = new THREE.Color(muur);
  const accent = `#${c.clone().multiplyScalar(0.78).getHexString()}`;
  const licht = `#${c.clone().lerp(new THREE.Color('#FFFFFF'), 0.35).getHexString()}`;
  return map({ Glass: '#BCD0EA', Windows: '#F1EFEA', White: '#F1EFEA', Black: '#4A4E55', Dark: accent, Light: licht, Wood: '#8A6E55', DarkWood: '#6E5644', Main: muur, Bricks: accent }, muur);
};

/**
 * Autolak herkleuren: vertexkleuren met duidelijke kleur (de lak) worden de
 * gedempte doelkleur; ramen, banden en lampen blijven zoals ze zijn.
 */
export function herkleurLak(geo: THREE.BufferGeometry, lak: string): void {
  const col = geo.getAttribute('color') as THREE.BufferAttribute;
  if (!col) return;
  const doel = new THREE.Color(lak);
  const c = new THREE.Color();
  const hsl = { h: 0, s: 0, l: 0 };
  for (let i = 0; i < col.count; i++) {
    c.setRGB(col.getX(i), col.getY(i), col.getZ(i));
    c.getHSL(hsl);
    const geel = hsl.h > 0.1 && hsl.h < 0.18;
    if (hsl.s > 0.3 && !geel) {
      const k = THREE.MathUtils.clamp(hsl.l / 0.45, 0.6, 1.15);
      c.copy(doel).multiplyScalar(k);
    } else if (geel) {
      c.lerp(new THREE.Color('#D8CFA8'), 0.6);
    }
    col.setXYZ(i, c.r, c.g, c.b);
  }
  col.needsUpdate = true;
}
