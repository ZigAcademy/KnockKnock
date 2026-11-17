import { test, expect } from '@playwright/test';
import { SHOTS, kiesPersonage, loopNaar, woning, scenarios, type Hook } from './helpers';

// Engelse versie: taal kiezen op het titelscherm en woning 1 helemaal doorspelen met de en-teksten.
test('English: house 1 from door to Zig365, with English texts', async ({ page }) => {
  test.setTimeout(240_000);
  const fouten: string[] = [];
  page.on('pageerror', (e) => fouten.push(String(e)));
  await page.goto('/');
  await expect(page.getByTestId('titelscherm')).toBeVisible();
  await page.getByTestId('taal-en').click();
  await expect(page.getByTestId('taal-en')).toHaveAttribute('aria-checked', 'true');
  await page.screenshot({ path: `${SHOTS}/60-en-titel.png` });
  await page.getByTestId('start').click();
  await expect(page.getByTestId('maker')).toContainText('Who are you?');
  await kiesPersonage(page);
  await page.waitForFunction(() => (window as unknown as { __wijkwijs?: Hook }).__wijkwijs?.ready === true);
  await expect(page.getByTestId('help')).toContainText('ring the bell');
  await expect(page.getByTestId('meter-huurder')).toContainText('Tenant satisfaction');

  const w = woning('w1');
  const fase = w.huurderfase!;
  const huurder = scenarios.personages.huurders.find((h) => h.id === w.huurder)!;
  await loopNaar(page, 14);
  await expect(page.getByTestId('aanbellen')).toContainText('Ring the bell');
  await page.keyboard.press('e');
  const kaart = page.getByTestId('kaart');
  await expect(kaart).toContainText(fase.deur.en!);
  await expect(kaart).toContainText(huurder.naam_en!);
  await page.getByTestId('kaart-knop').click();
  for (const h of fase.hotspots) {
    await expect(page.getByTestId(`pin-${h.id}`)).toContainText(h.object_en!);
    await page.getByTestId(`pin-${h.id}`).click();
    await expect(kaart).toContainText(h.tekst.en!);
    await page.getByTestId('kaart-knop').click();
  }
  await expect(page.getByTestId('praat')).toContainText('Talk to');
  await page.screenshot({ path: `${SHOTS}/61-en-binnen.png` });
  await page.getByTestId('praat').click();
  for (const v of fase.dialoog) {
    await expect(kaart).toContainText(v.vraag.en!);
    await page.getByTestId('optie').first().click();
    await page.getByTestId('kaart-knop').click();
  }
  await expect(kaart).toContainText('Key takeaway');
  await expect(kaart).toContainText(fase.leerpunt.en!);
  await page.getByTestId('kaart-knop').click();

  // corporatiefase in het Engels: Hearth & Home, Engelse opties en volgorde
  await expect(page.getByTestId('wissel')).toContainText('Meanwhile at Hearth & Home');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/62-en-wissel.png` });
  for (const deel of w.corporatiefase) {
    await expect(kaart).toContainText(deel.intro.en!, { timeout: 15_000 });
    await page.getByTestId('kaart-knop').click();
    const z = page.getByTestId('zig365');
    for (const [i, stap] of deel.stappen.entries()) {
      await expect(z.locator('.z365-vraag')).toHaveText(stap.vraag.en!);
      if (stap.type === 'volgorde') {
        const items = stap.items_en!;
        for (let doel = 0; doel < items.length; doel++) {
          for (;;) {
            const teksten = await z.locator('.z365-item-tekst').allInnerTexts();
            if (teksten.indexOf(items[doel]) === doel) break;
            await z.getByRole('button', { name: `${items[doel]}: up` }).click();
          }
        }
        await page.getByTestId('z365-controleer').click();
      } else {
        await z.getByTestId('z365-optie').filter({ hasText: stap.opties_en![stap.goed] }).first().click();
      }
      const fb = z.getByTestId('z365-feedback');
      await expect(fb).toContainText('Correct!');
      await expect(fb).toContainText(stap.uitleg.en!);
      if (i === 0) await page.screenshot({ path: `${SHOTS}/63-en-zig365-${deel.medewerker}.png` });
      await page.getByTestId('z365-volgende').click();
    }
  }
  await expect(kaart).toContainText(w.afloop!.en!, { timeout: 15_000 });
  await expect(page.getByTestId('kaart-knop')).toHaveText('Back to the street');
  await page.getByTestId('kaart-knop').click();
  const prog = await page.evaluate(() => (window as unknown as { __wijkwijs: Hook }).__wijkwijs.progress());
  expect(prog.w1.proces).toEqual({ score: 7, max: 7 });
  expect(fouten).toEqual([]);
});
