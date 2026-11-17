import type { Product, Woning } from '../content/types';

/**
 * "Achter de schermen": welke onderdelen (portaal, CRM, Operations ...) spelen een rol in
 * deze casus? Afgeleid uit de teksten van de woning in scenarios.json: de goede antwoorden
 * van de huurder, en de vragen, goede antwoorden en uitleg van de corporatiefase.
 * Er wordt niets verzonnen: alleen onderdelen uit `producten` die in de casus genoemd worden.
 */
const HERKEN: Record<string, RegExp> = {
  huurdersportaal: /huurdersportaal|\bportaal\b/i,
  vraagboom: /vraagboom/i,
  customer: /\bCRM\b|\bCustomer\b/,
  operations: /\bOperations\b/,
  maintenance: /\bMaintenance\b/,
  matching: /\bMatching\b/,
  leveranciersportaal: /leveranciersportaal/i,
};

/** Teksten van de casus in de volgorde van het verhaal (alleen NL, voor het herkennen). */
export function casusTeksten(w: Woning): string[] {
  const uit: string[] = [];
  for (const v of w.huurderfase?.dialoog ?? []) {
    for (const o of v.opties) if (o.score > 0) uit.push(o.tekst.nl, o.feedback.nl);
  }
  if (w.huurderfase) uit.push(w.huurderfase.leerpunt.nl);
  for (const deel of w.corporatiefase) {
    uit.push(deel.intro.nl);
    for (const s of deel.stappen) {
      uit.push(s.vraag.nl);
      if (s.type === 'volgorde') uit.push(...s.items); else uit.push(s.opties[s.goed]);
      uit.push(s.uitleg.nl);
    }
  }
  // de titels van de bron-e-learnings (bijv. "01 Matching")
  uit.push(...w.bron);
  return uit;
}

/** Product-id's in de volgorde waarin ze in de casus voorkomen; het portaal (huurderskant) eerst. */
export function onderdelenVan(w: Woning, producten: Product[]): Product[] {
  const tekst = casusTeksten(w);
  const eerste = new Map<string, number>();
  tekst.forEach((t, i) => {
    for (const [id, re] of Object.entries(HERKEN)) {
      // "leveranciersportaal" is geen huurdersportaal
      if (id === 'huurdersportaal' && /leveranciersportaal/i.test(t) && !/huurdersportaal/i.test(t)) continue;
      if (re.test(t) && !eerste.has(id)) eerste.set(id, i);
    }
  });
  const ids = [...eerste.entries()].sort((a, b) => a[1] - b[1]).map(([id]) => id);
  const portaal = ids.indexOf('huurdersportaal');
  if (portaal > 0) { ids.splice(portaal, 1); ids.unshift('huurdersportaal'); }
  return ids.map((id) => producten.find((p) => p.id === id)).filter((p): p is Product => !!p);
}
