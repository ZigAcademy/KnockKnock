import { test, expect } from '@playwright/test';
import { startGame, kiesPersonage, SHOTS } from './helpers';

type Hook = { ready: boolean; versie: string; beeldModus: () => string; modellen: { mensen: Map<string, unknown>; kits: Map<string, unknown> } };
const hook = <T>(page: import('@playwright/test').Page, f: (h: Hook) => T) =>
  page.evaluate((src) => new Function('h', `return (${src})(h)`)((window as unknown as { __wijkwijs: Hook }).__wijkwijs), f.toString()) as Promise<T>;

test('lage resolutie: het eerdere beeld (geen Rocketbox, geen nieuwe planten, geen nabewerking) en wisselen via instellingen', async ({ page }) => {
  test.setTimeout(240_000);
  const fouten: string[] = [];
  await startGame(page, fouten, '/');
  await page.getByTestId('start').click();
  await kiesPersonage(page);
  await page.waitForFunction(() => (window as unknown as { __wijkwijs?: Hook }).__wijkwijs?.ready === true);
  expect(await hook(page, (h) => h.versie)).toBe('standaard');
  expect(await hook(page, (h) => h.modellen.mensen.size)).toBeGreaterThan(10);

  // naar lage resolutie: zonder LMS laadt het spel direct opnieuw
  await page.getByTestId('knop-instellingen').click();
  await Promise.all([page.waitForEvent('load'), page.getByTestId('versie').selectOption('laag')]);
  await expect(page.getByTestId('titelscherm')).toBeVisible({ timeout: 60_000 });
  await page.getByTestId('start').click();
  await page.waitForFunction(() => (window as unknown as { __wijkwijs?: Hook }).__wijkwijs?.ready === true);
  expect(await hook(page, (h) => h.versie)).toBe('laag');
  expect(await hook(page, (h) => h.modellen.mensen.size)).toBe(0);
  expect(await hook(page, (h) => h.modellen.kits.has('planten'))).toBe(false);
  expect(await hook(page, (h) => h.beeldModus())).toBe('laag');
  await page.screenshot({ path: `${SHOTS}/90-lage-resolutie.png` });
  expect(fouten).toEqual([]);
});
