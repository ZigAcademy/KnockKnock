import * as THREE from 'three';
import { getTaal, opTaal } from '../i18n';

/**
 * Logo's van de (fictieve) corporatie op borden in de 3D-wereld.
 * NL: Huis & Haard, EN: Hearth & Home. Het icoon (huisje met vlam) is voor beide gelijk.
 * Wisselt de taal, dan wisselen de borden mee.
 */
const BESTAND = { nl: './assets/logo/huis-en-haard.png', en: './assets/logo/hearth-and-home.png' };
const ICOON = './assets/logo/huis-icoon.png';
/** In het bronbestand staat het woordmerk tussen 22% en 77% van de hoogte; de rest is witruimte. */
export const WOORDMERK_VERHOUDING = 2160 / (720 * 0.55);

const loader = new THREE.TextureLoader();
const cache = new Map<string, THREE.Texture>();
function laad(url: string, bijsnijden: boolean): THREE.Texture {
  const key = `${url}|${bijsnijden}`;
  let t = cache.get(key);
  if (!t) {
    t = loader.load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    if (bijsnijden) { t.repeat.set(1, 0.55); t.offset.set(0, 0.225); }
    cache.set(key, t);
  }
  return t;
}

const VERF = { nl: './assets/logo/huis-en-haard-verf.png', en: './assets/logo/hearth-and-home-verf.png' };
const woordmerken: THREE.MeshStandardMaterial[] = [];
const verfLogos: THREE.MeshStandardMaterial[] = [];
opTaal(() => {
  for (const m of woordmerken) { m.map = laad(BESTAND[getTaal()], true); m.needsUpdate = true; }
  for (const m of verfLogos) { m.map = laad(VERF[getTaal()], false); m.needsUpdate = true; }
});

/**
 * Woordmerk zonder achtergrond, alsof het op de lak geschilderd is (busje).
 * Zelfde belichting als de lak, geen eigen glans; ligt net boven het oppervlak.
 */
export function woordmerkVerfMateriaal(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({
    map: laad(VERF[getTaal()], false), transparent: true, alphaTest: 0.05, roughness: 0.85, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, depthWrite: false,
  });
  verfLogos.push(m);
  return m;
}

/** Materiaal met het woordmerk in de huidige taal (wisselt mee met de taal). */
export function woordmerkMateriaal(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ map: laad(BESTAND[getTaal()], true), roughness: 0.6, emissive: '#FFFFFF', emissiveIntensity: 0.08 });
  woordmerken.push(m);
  return m;
}

export function icoonMateriaal(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ map: laad(ICOON, false), roughness: 0.6, emissive: '#FFFFFF', emissiveIntensity: 0.08 });
}
