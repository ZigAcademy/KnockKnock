import type { Scenarios, Woning, Huurder } from './types';

export async function loadScenarios(): Promise<Scenarios> {
  const res = await fetch('./content/scenarios.json');
  if (!res.ok) throw new Error(`scenarios.json niet geladen (${res.status})`);
  return (await res.json()) as Scenarios;
}

/** Huisnummer uit een adres als "Lindelaan 14". */
export function huisnummer(adres: string): number | null {
  const m = adres.match(/(\d+)\s*$/);
  return m ? Number(m[1]) : null;
}

export function huurderVan(s: Scenarios, w: Woning): Huurder | undefined {
  return s.personages.huurders.find((h) => h.id === w.huurder);
}

/** Naam zonder de toevoeging "(fictief)" uit de meta. */
export function zonderFictief(naam: string | { nl: string; en?: string }): string {
  const n = typeof naam === 'string' ? naam : naam.nl;
  return n.replace(/\s*\((fictief|fictional)\)\s*$/i, '').trim();
}

export function portretUrl(portret: string): string {
  return `./assets/portretten/${portret}.webp`;
}
