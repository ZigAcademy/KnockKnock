import { test, expect } from '@playwright/test';
import { scenarios } from './helpers';
import { onderdelenVan } from '../src/game/achterDeSchermen';

// "Achter de schermen" mag alleen onderdelen tonen die in de casus zelf genoemd worden.
const VERWACHT: Record<string, string[]> = {
  w1: ['huurdersportaal', 'vraagboom', 'customer', 'operations'],
  w2: ['huurdersportaal', 'customer', 'operations'],
  w3: ['huurdersportaal', 'customer', 'operations'],
  w4: ['huurdersportaal', 'customer', 'operations'],
  w5: ['huurdersportaal', 'customer'],
  w6: ['huurdersportaal'],
  finale: ['maintenance', 'operations', 'matching'],
};

for (const w of scenarios.woningen) {
  test(`achter de schermen ${w.id}`, () => {
    const ids = onderdelenVan(w, scenarios.producten).map((p) => p.id);
    console.log(w.id, ids.join(' → '));
    expect(ids).toEqual(VERWACHT[w.id]);
  });
}
