import { expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { Scenarios, Woning } from '../src/content/types';

export const scenarios = JSON.parse(readFileSync('public/content/scenarios.json', 'utf8')) as Scenarios;
export const SHOTS = 'tests/screenshots';

export type Hook = {
  ready: boolean;
  standPoint: (nr: number) => { x: number; y: number } | null;
  player: () => { x: number; z: number };
  drawCalls: () => number;
  scorm: () => boolean;
  huurdersInTuin: () => number;
  busje: () => { x: number; z: number };
  progress: () => Record<string, { huurder?: { score: number; max: number }; proces?: { score: number; max: number }; af: boolean }>;
};

export const hook = <T>(page: Page, fn: (h: Hook) => T) =>
  page.evaluate(fn as never, undefined) as Promise<T>;

export function woning(id: string): Woning { return scenarios.woningen.find((w) => w.id === id)!; }
export const nummerVan = (w: Woning) => Number(w.adres.match(/(\d+)\s*$/)![1]);

export async function startGame(page: Page, errors: string[], url = '/', kwaliteitVrij = false) {
  if (!kwaliteitVrij) await laagInTest(page);
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await expect(page.getByTestId('titelscherm')).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('#app canvas')).toBeVisible();
}

/** De testbrowser heeft geen GPU: beeldkwaliteit laag (zonder nabewerking), tenzij de test zelf iets instelt. */
export async function laagInTest(page: Page) {
  await page.addInitScript(() => { try { const k = 'wijkwijs-instellingen'; const s = JSON.parse(localStorage.getItem(k) ?? '{}'); if (!s.kwaliteit) localStorage.setItem(k, JSON.stringify({ ...s, kwaliteit: 'laag' })); } catch { /* */ } });
}

/** "Wie ben jij?": verschijnt bij de eerste start (zonder bewaarde keuze). */
export async function kiesPersonage(page: Page, tap = false) {
  const klaar = page.getByTestId('maker-klaar');
  await expect(page.getByTestId('maker')).toBeVisible();
  if (tap) await klaar.tap(); else await klaar.click();
  await expect(page.getByTestId('maker')).toBeHidden();
}

export async function begin(page: Page) {
  await page.getByTestId('start').click();
  await kiesPersonage(page);
  await page.waitForFunction(() => (window as unknown as { __wijkwijs?: Hook }).__wijkwijs?.ready === true);
}

/** Klik-om-te-lopen naar het tuinpad van een huisnummer en wacht op de aanbelknop. */
export async function loopNaar(page: Page, nr: number) {
  await page.waitForTimeout(1500); // camera terug achter de speler
  let p = await page.evaluate((n) => (window as unknown as { __wijkwijs: Hook }).__wijkwijs.standPoint(n), nr);
  expect(p).not.toBeNull();
  const vp = page.viewportSize()!;
  if (!(p!.x > 0 && p!.x < vp.width && p!.y > 0 && p!.y < vp.height)) {
    // tuinpad buiten beeld (camera kijkt de andere kant op): camera achter de speler, richting het tuinpad
    await page.evaluate((n) => {
      const w = (window as unknown as { __wijkwijs: { straat: { player: { position: { x: number; z: number } }; doors: Map<number, { stand: { x: number; z: number } }> }; debugCam: (v: object) => void } }).__wijkwijs;
      const pos = w.straat.player.position, s = w.straat.doors.get(n)!.stand;
      const rot = Math.atan2(s.x - pos.x, s.z - pos.z);
      w.debugCam({ x: pos.x, z: pos.z, yaw: rot + Math.PI, pitch: 0.42, dist: 7, rot });
    }, nr);
    await page.waitForTimeout(1500);
    p = await page.evaluate((n) => (window as unknown as { __wijkwijs: Hook }).__wijkwijs.standPoint(n), nr);
  }
  expect(p!.x > 0 && p!.x < vp.width && p!.y > 0 && p!.y < vp.height, `tuinpad ${nr} in beeld`).toBe(true);
  await page.mouse.click(p!.x, p!.y);
  const prompt = page.getByTestId('prompt');
  await expect(prompt).toContainText(`${nr}`, { timeout: 90_000 });
}

/** Huurderfase met muis (alle pins), daarna gesprek met optie 1. */
export async function speelHuurderfase(page: Page, w: Woning, shot?: (naam: string) => Promise<void>) {
  const fase = w.huurderfase!;
  const kaart = page.getByTestId('kaart');
  await page.keyboard.press('e');
  await expect(kaart).toContainText(fase.deur.nl);
  await page.getByTestId('kaart-knop').click();
  await expect(page.getByTestId(`pin-${fase.hotspots[0].id}`)).toBeVisible();
  await shot?.('binnen');
  for (const h of fase.hotspots) {
    await page.getByTestId(`pin-${h.id}`).click();
    await expect(kaart).toContainText(h.tekst.nl);
    await page.getByTestId('kaart-knop').click();
  }
  await page.getByTestId('praat').click();
  for (const v of fase.dialoog) {
    await expect(kaart).toContainText(v.vraag.nl);
    await page.getByTestId('optie').first().click();
    await page.getByTestId('kaart-knop').click();
  }
  await expect(kaart).toContainText(fase.leerpunt.nl);
  await page.getByTestId('kaart-knop').click();
}

/** Corporatiefase: kiest steeds het goede antwoord en zet volgordes goed met de ↑-knoppen. */
export async function speelCorporatiefase(page: Page, w: Woning, shot?: (naam: string) => Promise<void>) {
  const kaart = page.getByTestId('kaart');
  await expect(page.getByTestId('wissel')).toHaveClass(/aan/);
  await shot?.('wissel');
  for (const deel of w.corporatiefase) {
    const m = scenarios.personages.medewerkers.find((x) => x.id === deel.medewerker)!;
    await expect(kaart).toContainText(deel.intro.nl, { timeout: 45_000 });
    await expect(kaart).toContainText(m.naam);
    await shot?.(`intro-${m.id}`);
    await page.getByTestId('kaart-knop').click();
    const z = page.getByTestId('zig365');
    await expect(z).toBeVisible();
    for (const [i, stap] of deel.stappen.entries()) {
      await expect(z.locator('.z365-vraag')).toHaveText(stap.vraag.nl);
      if (stap.type === 'volgorde') {
        for (let doel = 0; doel < stap.items.length; doel++) {
          for (;;) {
            const teksten = await z.locator('.z365-item-tekst').allInnerTexts();
            const pos = teksten.indexOf(stap.items[doel]);
            if (pos === doel) break;
            await z.getByRole('button', { name: `${stap.items[doel]}: omhoog` }).click();
          }
        }
        await shot?.(`volgorde-${m.id}`);
        await page.getByTestId('z365-controleer').click();
      } else {
        if (i === 0) await shot?.(`stap-${m.id}`);
        await z.getByTestId('z365-optie').filter({ hasText: stap.opties[stap.goed] }).first().click();
      }
      const fb = z.getByTestId('z365-feedback');
      await expect(fb).toContainText(stap.uitleg.nl);
      await expect(fb).toContainText('Goed!');
      if (i === 0) await shot?.(`feedback-${m.id}`);
      await page.getByTestId('z365-volgende').click();
    }
  }
  if (w.afloop) {
    await expect(kaart).toContainText(w.afloop.nl, { timeout: 45_000 });
    await shot?.('afloop');
    await page.getByTestId('kaart-knop').click();
  }
  // achter de schermen: de route van de vraag door Zig365
  const ads = page.getByTestId('achter-de-schermen');
  await expect(ads).toBeVisible({ timeout: 45_000 });
  await expect(ads).toContainText('Achter de schermen');
  await page.waitForTimeout(400);
  await shot?.('achter-de-schermen');
  await page.getByTestId('ads-knop').click();
  await expect(ads).toBeHidden();
  await expect(kaart).toBeHidden();
}
