import { test, expect } from '@playwright/test';
import { scenarios, SHOTS, startGame, speelCorporatiefase, kiesPersonage, type Hook } from './helpers';

test('straat + huurderfase woning 1 (Lindelaan 14)', async ({ page }) => {
  test.setTimeout(240_000);
  const errors: string[] = [];
  await startGame(page, errors);
  await page.screenshot({ path: `${SHOTS}/01-titelscherm.png` });

  await page.getByTestId('start').click();
  // Wie ben jij? kies een ander personage (vrouw, het vierde realistische figuur) en ga verder
  await expect(page.getByTestId('maker')).toBeVisible();
  await page.locator('.maker input[name="figuur"][value="1"]').check();
  await page.locator('.maker input[name="mens"][value="3"]').check();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/01b-wie-ben-jij.png` });
  await kiesPersonage(page);
  expect(await page.evaluate(() => localStorage.getItem('wijkwijs-speler'))).toBe('v11000r3');
  await page.waitForFunction(() => (window as unknown as { __wijkwijs?: Hook }).__wijkwijs?.ready === true);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/02-straat.png` });

  const calls = await page.evaluate(() => (window as unknown as { __wijkwijs: Hook }).__wijkwijs.drawCalls());
  console.log('draw calls:', calls);
  expect(calls).toBeLessThan(80);

  // klik-om-te-lopen naar het tuinpad van nr 14
  const p = await page.evaluate(() => (window as unknown as { __wijkwijs: Hook }).__wijkwijs.standPoint(14));
  expect(p).not.toBeNull();
  await page.mouse.click(p!.x, p!.y);
  await page.screenshot({ path: `${SHOTS}/03-onderweg.png` });

  const prompt = page.getByTestId('prompt');
  await expect(prompt).toBeVisible({ timeout: 90_000 });
  await expect(prompt).toContainText('Lindelaan 14');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SHOTS}/04-bij-de-deur.png` });

  // ---- Fase 2: huurderfase woning 1 ----
  const w1 = scenarios.woningen.find((w) => w.id === 'w1')!;
  const fase = w1.huurderfase!;
  const kaart = page.getByTestId('kaart');
  const knop = page.getByTestId('kaart-knop');

  await page.keyboard.press('e');
  await expect(kaart).toBeVisible();
  await expect(kaart).toContainText('de heer Farouk');
  await expect(kaart).toContainText(fase.deur.nl);
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${SHOTS}/05-deur.png` });

  await knop.click();
  for (const h of fase.hotspots) await expect(page.getByTestId(`pin-${h.id}`)).toBeVisible();
  const praat = page.getByTestId('praat');
  await expect(praat).toBeHidden();
  await page.waitForTimeout(500);
  await page.getByTestId('pin-laptop').hover();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/06-binnen-hover.png` });

  // niet-kernhotspot met de muis: gesprek blijft op slot
  await page.getByTestId('pin-telefoon').click();
  const telefoon = fase.hotspots.find((h) => h.id === 'telefoon')!;
  await expect(kaart).toContainText(telefoon.tekst.nl);
  await page.screenshot({ path: `${SHOTS}/07-hotspot.png` });
  await knop.click();
  await expect(praat).toBeHidden();

  // kernhotspot met het toetsenbord (focus staat op de volgende pin)
  await expect(page.getByTestId('pin-kraan')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(kaart).toContainText(fase.hotspots.find((h) => h.id === 'kraan')!.tekst.nl);
  await page.keyboard.press('Enter');
  await expect(praat).toBeVisible();
  await expect(praat).toBeFocused();
  await page.screenshot({ path: `${SHOTS}/08-gesprek-open.png` });

  // gesprek, volledig met het toetsenbord
  await page.keyboard.press('Enter');
  for (const [i, v] of fase.dialoog.entries()) {
    await expect(kaart).toContainText(v.vraag.nl);
    await expect(page.getByTestId('optie')).toHaveCount(v.opties.length);
    if (i === 0) await page.screenshot({ path: `${SHOTS}/09-vraag.png` });
    await page.keyboard.press('1');
    const fb = await page.getByTestId('feedback').innerText();
    expect(v.opties.map((o) => o.feedback.nl)).toContain(fb.trim());
    if (i === 0) await page.screenshot({ path: `${SHOTS}/10-feedback.png` });
    await page.keyboard.press('Enter');
  }
  await expect(kaart).toContainText('Dit neem je mee');
  await expect(kaart).toContainText(fase.leerpunt.nl);
  await page.screenshot({ path: `${SHOTS}/11-leerpunt.png` });
  await page.keyboard.press('Enter');

  // ---- Fase 3: perspectiefwissel, corporatiefase, afloop ----
  let n = 12;
  await speelCorporatiefase(page, w1, async (naam) => {
    await page.waitForTimeout(naam === 'wissel' ? 500 : 250);
    await page.screenshot({ path: `${SHOTS}/${n++}-${naam}.png` });
  });

  await expect(prompt).toBeVisible();
  const prog = await page.evaluate(() => (window as unknown as { __wijkwijs: Hook }).__wijkwijs.progress());
  expect(prog.w1.af).toBe(true);
  expect(prog.w1.huurder!.max).toBe(fase.dialoog.reduce((s, v) => s + Math.max(...v.opties.map((o) => o.score)), 0));
  expect(prog.w1.proces).toEqual({ score: 7, max: 7 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/${n++}-vinkje.png` });

  // toetsenbord: loop terug de straat op
  // (houd S ingedrukt tot je van de deur weg bent; de software-renderer van de test is soms traag)
  await page.keyboard.down('s');
  await expect(prompt).toBeHidden({ timeout: 10_000 });
  await page.keyboard.up('s');
  await page.screenshot({ path: `${SHOTS}/30-toetsenbord.png` });

  expect(errors).toEqual([]);
});

test.describe('touch', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test('joystick zichtbaar en lopen met joystick', async ({ page }) => {
    const errors: string[] = [];
    await startGame(page, errors);
    await page.getByTestId('start').tap();
    await kiesPersonage(page, true);
    await page.waitForFunction(() => (window as unknown as { __wijkwijs?: Hook }).__wijkwijs?.ready === true);
    const joy = page.locator('.joystick');
    await expect(joy).toBeVisible();

    const before = await page.evaluate(() => (window as unknown as { __wijkwijs: Hook }).__wijkwijs.player());
    const box = (await joy.boundingBox())!;
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    // pointer-events via CDP-touch: houd de knop naar boven
    await page.dispatchEvent('.joystick', 'pointerdown', { pointerId: 7, clientX: cx, clientY: cy, pointerType: 'touch', isPrimary: true });
    await page.dispatchEvent('.joystick', 'pointermove', { pointerId: 7, clientX: cx, clientY: cy - 60, pointerType: 'touch', isPrimary: true });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SHOTS}/31-touch.png` });
    await page.dispatchEvent('.joystick', 'pointerup', { pointerId: 7, clientX: cx, clientY: cy - 60, pointerType: 'touch', isPrimary: true });
    const after = await page.evaluate(() => (window as unknown as { __wijkwijs: Hook }).__wijkwijs.player());
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(1);
    expect(errors).toEqual([]);
  });
});
