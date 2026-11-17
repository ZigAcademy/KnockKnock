/**
 * Kamersjabloon: maten, keukenblok en de controle op vrije zones.
 * Bewust zonder three.js, zodat de test (tests/inrichting.spec.ts) hem ook kan gebruiken.
 */

export const KAMER = { minX: -4, maxX: 4, minZ: -3, maxZ: 3, h: 2.8 };
export const AANRECHT = 0.9;
export const TAFEL = 0.75;

export type Wand = 'links' | 'rechts' | 'achter';
/** Deur of raam in een wand: pos = z (links/rechts) of x (achter). */
export interface Opening { wand: Wand; pos: number; breedte: number }

export interface MeubelPlaatsing {
  /** Kitmodel ('meubels' of 'eten'), of 'proc:<naam>' voor een object uit primitieven. */
  model: string;
  kit?: 'meubels' | 'eten';
  /** Midden (x, z). */
  pos: [number, number];
  /** Onderkant (standaard 0 = op de vloer). */
  y?: number;
  /** Draaiing om y (veelvouden van π/2 voor de zonecontrole). */
  rotY?: number;
  /** Maat vóór draaiing: breedte (x), hoogte, diepte (z). Het model wordt hierin gepast. */
  maat: [number, number, number];
  /** Kleur per materiaalnaam (overschrijft het standaardpalet). */
  kleur?: Record<string, string>;
  /** Warme lamp: zet er een lichtbron bij. */
  licht?: boolean;
}

export interface Keuken {
  /** Keukenblok langs de achterwand, van x0 tot x1. */
  x0: number; x1: number;
  /** Koelkast aan het begin (x0). */
  koelkast?: boolean;
  /** Spoelbak (met kraan of hotspot erboven) op x. */
  spoelbakX?: number;
  /** Fornuis op x. */
  ovenX?: number;
  /** Bovenkastjes boven deze x-posities. */
  bovenkast?: number[];
}

export interface Kamer {
  binnendeur: Opening;
  /** Ramen zonder hotspot (gewone ramen). */
  ramen: Opening[];
  /** Ramen die zelf een hotspot zijn (worden niet getekend, wel vrij gehouden). */
  hotspotRamen?: Opening[];
  kleuren: { muur: string; vloer: string; plint?: string; keuken?: string; stof?: string };
  licht: 'dag' | 'regen' | 'avond';
  keuken?: Keuken;
  /** Open verdieping achterin: overloop op hoogte y (m), diepte vanaf de achterwand, trap langs de linkerwand. */
  verdieping?: { y: number; diepte: number };
}

/** Hotspot-id uit scenarios.json → object in de kamer. */
export interface PropPlaatsing { prop: string; pos: [number, number, number]; rotY?: number }

export interface Inrichting {
  kamer: Kamer;
  meubels: MeubelPlaatsing[];
  hotspots: Record<string, PropPlaatsing>;
  /** Plek en kijkrichting van de huurder. */
  huurder: { pos: [number, number]; rotY: number };
}

// ------------------------------------------------------------------ geometrie

export interface Vak { minX: number; maxX: number; minZ: number; maxZ: number; top: number; naam: string }

/** Grondvlak (AABB) van een meubel, rekening houdend met de draaiing. */
export function vakVan(m: MeubelPlaatsing): Vak {
  const [w, h, d] = m.maat;
  const kwart = Math.round((m.rotY ?? 0) / (Math.PI / 2)) % 2 !== 0;
  const hw = (kwart ? d : w) / 2, hd = (kwart ? w : d) / 2;
  return { minX: m.pos[0] - hw, maxX: m.pos[0] + hw, minZ: m.pos[1] - hd, maxZ: m.pos[1] + hd, top: (m.y ?? 0) + h, naam: m.model };
}

export const KEUKEN_DIEPTE = 0.62;
const MODULE = 0.6;

/** Kastjes van het keukenblok (ook gebruikt voor de controle). */
export function keukenVakken(k: Keuken): (Vak & { soort: 'koelkast' | 'spoelbak' | 'oven' | 'kast' })[] {
  const uit: (Vak & { soort: 'koelkast' | 'spoelbak' | 'oven' | 'kast' })[] = [];
  const z0 = KAMER.minZ, z1 = KAMER.minZ + KEUKEN_DIEPTE;
  let x = k.x0;
  if (k.koelkast) { uit.push({ minX: x, maxX: x + 0.7, minZ: z0, maxZ: z1 + 0.04, top: 1.95, naam: 'koelkast', soort: 'koelkast' }); x += 0.7; }
  const n = Math.max(1, Math.round((k.x1 - x) / MODULE));
  const w = (k.x1 - x) / n;
  for (let i = 0; i < n; i++) {
    const mx = x + w * (i + 0.5);
    const soort = k.spoelbakX !== undefined && Math.abs(mx - k.spoelbakX) < w / 2 ? 'spoelbak'
      : k.ovenX !== undefined && Math.abs(mx - k.ovenX) < w / 2 ? 'oven' : 'kast';
    uit.push({ minX: x + w * i, maxX: x + w * (i + 1), minZ: z0, maxZ: z1, top: AANRECHT, naam: soort, soort });
  }
  return uit;
}

export const TRAP = { breedte: 0.9, aantal: 13 };

/** Grondvlak van de trap (langs de linkerwand, komt boven uit bij de overloop). */
export function trapVak(v: { y: number; diepte: number }): Vak {
  const lengte = TRAP.aantal * 0.22;
  const z0 = KAMER.minZ + v.diepte;
  return { minX: KAMER.minX, maxX: KAMER.minX + TRAP.breedte, minZ: z0, maxZ: z0 + lengte, top: v.y, naam: 'trap' };
}

/** Vrije zones: vóór deuren, onder ramen, de huurder en een looproute. */
export function vrijeZones(inr: Inrichting): (Vak & { maxH: number })[] {
  const zones: (Vak & { maxH: number })[] = [];
  const { minX, maxX, minZ } = KAMER;
  const deur = inr.kamer.binnendeur;
  const hb = deur.breedte / 2 + 0.1;
  if (deur.wand === 'links') zones.push({ minX, maxX: minX + 1.0, minZ: deur.pos - hb, maxZ: deur.pos + hb, top: 0, maxH: 0.03, naam: 'vóór de binnendeur' });
  if (deur.wand === 'rechts') zones.push({ minX: maxX - 1.0, maxX, minZ: deur.pos - hb, maxZ: deur.pos + hb, top: 0, maxH: 0.03, naam: 'vóór de binnendeur' });
  if (deur.wand === 'achter') zones.push({ minX: deur.pos - hb, maxX: deur.pos + hb, minZ, maxZ: minZ + 1.0, top: 0, maxH: 0.03, naam: 'vóór de binnendeur' });
  for (const r of [...inr.kamer.ramen, ...(inr.kamer.hotspotRamen ?? [])]) {
    const h = r.breedte / 2;
    if (r.wand === 'achter') zones.push({ minX: r.pos - h, maxX: r.pos + h, minZ, maxZ: minZ + 0.7, top: 0, maxH: 0.92, naam: 'onder het raam' });
    if (r.wand === 'links') zones.push({ minX, maxX: minX + 0.7, minZ: r.pos - h, maxZ: r.pos + h, top: 0, maxH: 0.92, naam: 'onder het raam' });
    if (r.wand === 'rechts') zones.push({ minX: maxX - 0.7, maxX, minZ: r.pos - h, maxZ: r.pos + h, top: 0, maxH: 0.92, naam: 'onder het raam' });
  }
  // een muur-hotspot (bijv. de muur naar de buren) blijft helemaal vrij
  for (const p of Object.values(inr.hotspots)) {
    if (p.prop !== 'muur') continue;
    const [x, , z] = p.pos;
    if (x > maxX - 0.5) zones.push({ minX: maxX - 1.0, maxX, minZ: z - 0.9, maxZ: z + 0.9, top: 0, maxH: 0.03, naam: 'vóór de muur-hotspot' });
    else if (x < minX + 0.5) zones.push({ minX, maxX: minX + 1.0, minZ: z - 0.9, maxZ: z + 0.9, top: 0, maxH: 0.03, naam: 'vóór de muur-hotspot' });
  }
  const [hx, hz] = inr.huurder.pos;
  zones.push({ minX: hx - 0.35, maxX: hx + 0.35, minZ: hz - 0.35, maxZ: hz + 0.35, top: 0, maxH: 0.03, naam: 'plek van de huurder' });
  // looproute: van de deur 1 m de kamer in, dan naar de huurder (breedte 0.7 m)
  const binnen: [number, number] = deur.wand === 'links' ? [minX + 1.0, deur.pos] : deur.wand === 'rechts' ? [maxX - 1.0, deur.pos] : [deur.pos, minZ + 1.0];
  const stappen = 16;
  for (let i = 0; i <= stappen; i++) {
    const t = i / stappen;
    const x = binnen[0] + (hx - binnen[0]) * t, z = binnen[1] + (hz - binnen[1]) * t;
    zones.push({ minX: x - 0.3, maxX: x + 0.3, minZ: z - 0.3, maxZ: z + 0.3, top: 0, maxH: 0.03, naam: 'looproute deur → huurder' });
  }
  return zones;
}

const overlap = (a: Vak, b: Vak) => a.minX < b.maxX - 1e-3 && a.maxX > b.minX + 1e-3 && a.minZ < b.maxZ - 1e-3 && a.maxZ > b.minZ + 1e-3;

/** Hoogte van een hotspot-anker (globaal, voor de zichtcontrole). */
function hotspotHoogte(p: PropPlaatsing): number {
  if (p.prop === 'muur') return 1.6;
  if (p.prop.startsWith('raam')) return p.pos[1] + 0.6;
  return p.pos[1] + 0.1;
}

/**
 * Controleert een inrichting. Geeft een lijst met problemen (leeg = in orde):
 * meubels in een vrije zone, meubels buiten de kamer, en hotspots die achter een meubel verdwijnen.
 */
export function controleerInrichting(inr: Inrichting): string[] {
  const fouten: string[] = [];
  const vakken: Vak[] = inr.meubels.filter((m) => (m.y ?? 0) < 0.05).map(vakVan);
  if (inr.kamer.keuken) vakken.push(...keukenVakken(inr.kamer.keuken));
  if (inr.kamer.verdieping) vakken.push(trapVak(inr.kamer.verdieping));
  for (const v of vakken) {
    if (v.minX < KAMER.minX - 0.01 || v.maxX > KAMER.maxX + 0.01 || v.minZ < KAMER.minZ - 0.01 || v.maxZ > KAMER.maxZ + 0.01) fouten.push(`${v.naam} staat buiten de kamer`);
    for (const z of vrijeZones(inr)) if (v.top > z.maxH && overlap(v, z)) { fouten.push(`${v.naam} staat in de vrije zone ${z.naam}`); break; }
  }
  // hotspots moeten zichtbaar blijven vanuit de camera (die kijkt van voren, schuin van boven)
  const alles: Vak[] = [...vakken, ...inr.meubels.filter((m) => (m.y ?? 0) >= 0.05).map(vakVan)];
  for (const [id, p] of Object.entries(inr.hotspots)) {
    const [hx, , hz] = p.pos, hy = hotspotHoogte(p);
    for (const v of alles) {
      if (v.minZ <= hz + 0.05) continue;
      if (hx < v.minX - 0.15 || hx > v.maxX + 0.15) continue;
      const afstand = v.minZ - hz;
      if (v.top > hy + afstand * 0.62) { fouten.push(`hotspot ${id} wordt verborgen door ${v.naam}`); break; }
    }
  }
  return fouten;
}
