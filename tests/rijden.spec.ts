import { test, expect } from '@playwright/test';
import { startGame, kiesPersonage, SHOTS } from './helpers';

type W = { ready: boolean; debugCam: (v: object) => void; straat: { update: (dt: number, t: number, rm: boolean) => void; rijden: { rijdt: boolean; snelheid: number; auto: { object: { position: { x: number; z: number } } } | null } } };
const w = () => (window as unknown as { __wijkwijs: W }).__wijkwijs;

test('instappen in een geparkeerde auto, rijden en weer uitstappen', async ({ page }) => {
  test.setTimeout(240_000);
  const fouten: string[] = [];
  await startGame(page, fouten, '/');
  await page.getByTestId('start').click();
  await kiesPersonage(page);
  await page.waitForFunction(() => (window as unknown as { __wijkwijs?: W }).__wijkwijs?.ready === true);
  // naast de geparkeerde sedan aan de overkant (x 1,5)
  await page.evaluate(() => (window as unknown as { __wijkwijs: W }).__wijkwijs.debugCam({ x: 1.5, z: 13.6, yaw: 0, pitch: 0.3, dist: 6, rot: Math.PI }));
  await expect(page.getByTestId('aanbellen')).toContainText('Instappen', { timeout: 45_000 });
  await page.keyboard.press('e');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __wijkwijs: W }).__wijkwijs.straat.rijden.rijdt)).toBe(true);
  await expect(page.getByTestId('aanbellen')).toContainText('Uitstappen', { timeout: 45_000 });
  // achteruit rijden (vaste tijdstappen; de testbrowser heeft geen GPU)
  const voor = await page.evaluate(() => ({ ...(window as unknown as { __wijkwijs: W }).__wijkwijs.straat.rijden.auto!.object.position }));
  await page.keyboard.down('s');
  await page.evaluate(() => { const s = (window as unknown as { __wijkwijs: W }).__wijkwijs.straat; for (let i = 0; i < 30; i++) s.update(0.05, i * 0.05, false); });
  await page.keyboard.up('s');
  const na = await page.evaluate(() => ({ ...(window as unknown as { __wijkwijs: W }).__wijkwijs.straat.rijden.auto!.object.position }));
  expect(Math.hypot(na.x - voor.x, na.z - voor.z)).toBeGreaterThan(1);
  await page.screenshot({ path: `${SHOTS}/95-rijden.png` });
  await page.keyboard.press('e');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __wijkwijs: W }).__wijkwijs.straat.rijden.rijdt)).toBe(false);
  void w;
  expect(fouten).toEqual([]);
});
