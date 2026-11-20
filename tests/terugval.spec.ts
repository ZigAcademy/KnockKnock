import { test, expect } from '@playwright/test';
import { SHOTS, begin, loopNaar, speelHuurderfase, woning, type Hook } from './helpers';

// Ontbreken alle modellen (netwerkfout, oud pakket), dan vallen personages en decor
// terug op primitieven en blijft het spel speelbaar.
test('zonder modellen blijft het spel speelbaar (terugval)', async ({ page }) => {
  test.setTimeout(150_000);
  const fouten: string[] = [];
  page.on('pageerror', (e) => fouten.push(String(e)));
  await page.route('**/assets/modellen/**', (r) => r.abort());
  await page.goto('/');
  await expect(page.getByTestId('titelscherm')).toBeVisible({ timeout: 60_000 });
  await begin(page);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/50-terugval-straat.png` });
  expect(await page.evaluate(() => (window as unknown as { __wijkwijs: Hook }).__wijkwijs.drawCalls())).toBeGreaterThan(0);
  await loopNaar(page, 14);
  await speelHuurderfase(page, woning('w1'), async (naam) => {
    if (naam === 'binnen') await page.screenshot({ path: `${SHOTS}/51-terugval-binnen.png` });
  });
  await expect(page.getByTestId('wissel')).toHaveClass(/aan/);
  expect(fouten).toEqual([]);
});
