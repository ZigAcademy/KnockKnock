import { test, expect, type Page } from '@playwright/test';
import { scenarios, SHOTS, startGame, begin, loopNaar, nummerVan, speelHuurderfase, speelCorporatiefase, type Hook } from './helpers';

/** Nagebootste SCORM 2004-API (zoals een LMS die aanbiedt). */
function mockLms(page: Page, start: Record<string, string> = {}) {
  return page.addInitScript((begin) => {
    const store: Record<string, string> = { 'cmi.completion_status': 'not attempted', 'cmi.suspend_data': '', ...begin };
    const log: string[] = [];
    (window as unknown as Record<string, unknown>).__lms = { store, log };
    (window as unknown as Record<string, unknown>).API_1484_11 = {
      Initialize: () => { log.push('Initialize'); return 'true'; },
      Terminate: () => { log.push('Terminate'); return 'true'; },
      GetValue: (k: string) => store[k] ?? '',
      SetValue: (k: string, v: string) => { store[k] = v; return 'true'; },
      Commit: () => { log.push('Commit'); return 'true'; },
      GetLastError: () => '0',
    };
  }, start);
}

const lms = (page: Page) => page.evaluate(() => (window as unknown as { __lms: { store: Record<string, string>; log: string[] } }).__lms);

test('alle woningen en de finale, eindscherm en SCORM', async ({ page }) => {
  test.setTimeout(720_000);
  const errors: string[] = [];
  await mockLms(page);
  await startGame(page, errors);
  await begin(page);
  expect(await page.evaluate(() => (window as unknown as { __wijkwijs: Hook }).__wijkwijs.scorm())).toBe(true);
  expect((await lms(page)).store['cmi.completion_status']).toBe('incomplete');
  await expect(page.getByTestId('meter-proces')).toContainText('0 / ');

  const mvp = scenarios.woningen.filter((w) => w.mvp);
  const woningen = mvp.filter((w) => w.huurderfase);
  const finale = mvp.find((w) => !w.huurderfase)!;
  const prompt = page.getByTestId('prompt');
  for (const w of woningen) {
    const nr = nummerVan(w);
    if (w === woningen[woningen.length - 1]) {
      // de finale is nog dicht zolang niet alle andere woningen af zijn
      const d = await page.evaluate((n) => (window as unknown as { __wijkwijs: { straat: { doors: Map<number, { stand: { x: number; z: number } }> } } }).__wijkwijs.straat.doors.get(n)!.stand, nummerVan(finale));
      await page.evaluate((s) => (window as unknown as { __wijkwijs: { debugCam: (v: object) => void } }).__wijkwijs.debugCam({ x: s.x, z: s.z, yaw: -1, pitch: 0.42, dist: 7 }), d);
      await page.waitForTimeout(600);
      await expect(prompt).toBeHidden();
      await page.screenshot({ path: `${SHOTS}/45-finale-dicht.png` });
      // terug de stoep op, met de camera richting de volgende woning
      await page.evaluate(() => (window as unknown as { __wijkwijs: { debugCam: (v: object) => void } }).__wijkwijs.debugCam({ x: 20, z: 4.5, yaw: -Math.PI / 2 + 0.55, pitch: 0.42, dist: 7, rot: Math.PI / 2 }));
    }
    await loopNaar(page, nr);
    await speelHuurderfase(page, w, async (naam) => {
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SHOTS}/40-${w.id}-${naam}.png` });
    });
    await speelCorporatiefase(page, w, ['w3', 'w4', 'w5', 'w6'].includes(w.id) ? async (naam) => {
      if (naam.startsWith('stap') || naam.startsWith('intro') || naam === 'afloop') await page.screenshot({ path: `${SHOTS}/41-${w.id}-${naam}.png` });
    } : undefined);
    const prog = await page.evaluate(() => (window as unknown as { __wijkwijs: Hook }).__wijkwijs.progress());
    expect(prog[w.id].af).toBe(true);
    expect((await lms(page)).store['cmi.completion_status']).toBe('incomplete');
  }

  // finale: Lindelaan 26 (geen huurderfase): intro, Bram en Sanne, dan de sleutels
  await loopNaar(page, nummerVan(finale));
  await page.screenshot({ path: `${SHOTS}/46-finale-open.png` });
  await page.keyboard.press('e');
  const kaart = page.getByTestId('kaart');
  await expect(kaart).toContainText(finale.intro!.nl);
  await page.screenshot({ path: `${SHOTS}/47-finale-intro.png` });
  await page.getByTestId('kaart-knop').click();
  await speelCorporatiefase(page, finale, async (naam) => {
    if (naam !== 'wissel') await page.waitForTimeout(naam === 'afloop' ? 1200 : 250);
    await page.screenshot({ path: `${SHOTS}/48-finale-${naam}.png` });
  });

  // eindscherm na de laatste MVP-woning
  const eind = page.getByTestId('eindscherm');
  await expect(eind).toBeVisible();
  await expect(eind).toContainText('De straat is compleet!');
  for (const w of woningen) await expect(eind).toContainText(w.huurderfase!.leerpunt.nl);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOTS}/42-eindscherm.png` });

  const procesMax = mvp.reduce((s, w) => s + w.corporatiefase.reduce((a, d) => a + d.stappen.length, 0), 0);
  const { store } = await lms(page);
  expect(store['cmi.completion_status']).toBe('completed');
  expect(store['cmi.success_status']).toBe('passed');
  expect(store['cmi.score.scaled']).toBe('1.0000');
  expect(store['cmi.score.max']).toBe(String(procesMax));
  expect(store['cmi.suspend_data'].length).toBeLessThan(4000);
  const suspend = JSON.parse(store['cmi.suspend_data']);
  expect(Object.keys(suspend.w).sort()).toEqual(mvp.map((w) => w.id).sort());

  await page.keyboard.press('Escape');
  await expect(eind).toBeHidden();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/43-straat-compleet.png` });

  // instellingen
  await page.getByTestId('knop-instellingen').click();
  await expect(page.getByTestId('instellingen')).toBeVisible();
  await page.getByLabel('Minder beweging').check();
  await expect(page.locator('body')).toHaveClass(/minder-beweging/);
  await page.screenshot({ path: `${SHOTS}/44-instellingen.png` });
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);

  // hervatten: nieuwe sessie met dezelfde suspend_data
  expect(JSON.parse(store['cmi.suspend_data']).p).toMatch(/^[mv]\d{5}$/);
  const page2 = await page.context().newPage();
  // uiterlijk moet uit SCORM komen, niet uit de browser: "Wie ben jij?" wordt overgeslagen
  await page2.addInitScript(() => localStorage.removeItem('wijkwijs-speler'));
  await mockLms(page2, { 'cmi.suspend_data': store['cmi.suspend_data'], 'cmi.completion_status': 'completed' });
  await page2.goto('/');
  await page2.getByTestId('start').click();
  await page2.waitForFunction(() => (window as unknown as { __wijkwijs?: Hook }).__wijkwijs?.ready === true);
  await expect(page2.getByTestId('maker')).toHaveCount(0);
  const prog2 = await page2.evaluate(() => (window as unknown as { __wijkwijs: Hook }).__wijkwijs.progress());
  for (const w of mvp) expect(prog2[w.id].af).toBe(true);
  await expect(page2.getByTestId('meter-proces')).toContainText(`${procesMax} / ${procesMax}`);
});

test('zonder LMS blijft het spel speelbaar', async ({ page }) => {
  const errors: string[] = [];
  await startGame(page, errors);
  await begin(page);
  expect(await page.evaluate(() => (window as unknown as { __wijkwijs: Hook }).__wijkwijs.scorm())).toBe(false);
  await expect(page.getByTestId('meter-huurder')).toBeVisible();
  expect(errors).toEqual([]);
});
