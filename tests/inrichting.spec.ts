import { test, expect } from '@playwright/test';
import { INRICHTING } from '../src/world/interiors';
import { controleerInrichting } from '../src/world/vrijeZones';

// Deuren, ramen, looproutes en hotspots moeten vrij blijven (zie docs/INRICHTING.md).
for (const [id, inr] of Object.entries(INRICHTING)) {
  test(`inrichting ${id}: vrije zones`, () => {
    expect(controleerInrichting(inr)).toEqual([]);
  });
}

test('controle vangt de oude fout: bank vóór de binnendeur', () => {
  const w1 = INRICHTING.w1;
  // het oude sjabloon: bank tegen de linkerwand op z 0–1,8, deur op z 1,15–2,05
  const fout = { ...w1, meubels: [...w1.meubels, { model: 'bank', pos: [-3.5, 0.9] as [number, number], maat: [0.8, 0.64, 1.8] as [number, number, number] }] };
  expect(controleerInrichting(fout).join(' ')).toContain('vóór de binnendeur');
});

test('controle vangt een verborgen hotspot', () => {
  const w1 = INRICHTING.w1;
  const kast = { model: 'kast', pos: [0.5, 1.4] as [number, number], maat: [1.0, 1.9, 0.5] as [number, number, number] };
  expect(controleerInrichting({ ...w1, meubels: [...w1.meubels, kast] }).join(' ')).toContain('hotspot telefoon');
});
