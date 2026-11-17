import { test, expect, type Page } from '@playwright/test';
import { SHOTS, scenarios, woning, loopNaar, speelHuurderfase, kiesPersonage, type Hook } from './helpers';

/**
 * Uitgebreide test van de verbeteringen:
 *  1. voortgang in de browser (zonder LMS), herstellen en opnieuw beginnen
 *  3. "Achter de schermen" (inhoud, voice-over, minder beweging, mobiel, toetsenbord)
 *  4. herkansing van gemiste Zig365-vragen (score blijft gelijk)
 *  7. leven bij geholpen woningen (tuin, nr 26, finale pas open na 1–6)
 *  8. het busje van Huis & Haard (rijdt, logo, stopt bij geholpen woningen)
 * Elke test controleert ook dat er geen JavaScript-fouten zijn.
 */

type H = Hook & {
  finaleOpen: () => boolean;
  markering: (id: string) => { zichtbaar: boolean; af: boolean };
};
const hook = <T>(page: Page, f: (h: H) => T) => page.evaluate(`(${f.toString()})(window.__wijkwijs)`) as Promise<T>;
const w1 = woning('w1');

/** Voortgang zoals de game hem bewaart (zelfde vorm als Progress.serialize). */
function voortgang(af: string[]): string {
  const o: Record<string, number[]> = {};
  for (const w of scenarios.woningen) {
    if (!af.includes(w.id)) continue;
    const hm = w.huurderfase ? w.huurderfase.dialoog.reduce((s, q) => s + Math.max(...q.opties.map((x) => x.score)), 0) : 0;
    const pm = w.corporatiefase.reduce((s, d) => s + d.stappen.length, 0);
    o[w.id] = [w.huurderfase ? hm : -1, hm, pm, pm, 1];
  }
  return JSON.stringify({ v: 1, w: o, p: 'v21020' });
}

async function open(page: Page, fouten: string[], opslag: Record<string, string> = {}) {
  page.on('pageerror', (e) => fouten.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) fouten.push(m.text()); });
  await page.addInitScript((o) => { for (const [k, v] of Object.entries(o)) if (!sessionStorage.getItem('gezet-' + k)) { localStorage.setItem(k, v); sessionStorage.setItem('gezet-' + k, '1'); } }, opslag);
  await page.goto('/');
  await page.getByTestId('start').click();
  if (await page.getByTestId('maker').isVisible().catch(() => false)) await kiesPersonage(page);
  await page.waitForFunction(() => (window as unknown as { __wijkwijs?: Hook }).__wijkwijs?.ready === true);
}

test.describe('1. voortgang in de browser', () => {
  test('bewaarde voortgang wordt hersteld, finale blijft dicht, opnieuw beginnen wist alles', async ({ page }) => {
    const fouten: string[] = [];
    await open(page, fouten, { 'knockknock-voortgang': voortgang(['w1', 'w2']) });
    expect(await hook(page, (h) => h.scorm())).toBe(false);
    const p = await hook(page, (h) => h.progress());
    expect(p.w1.af && p.w2.af).toBe(true);
    expect(p.w3).toBeUndefined();
    await expect(page.getByTestId('meter-proces')).toContainText('13 / 38');
    expect(await hook(page, (h) => h.markering('w1'))).toEqual({ zichtbaar: true, af: true });
    expect(await hook(page, (h) => h.markering('w3'))).toEqual({ zichtbaar: true, af: false });
    expect(await hook(page, (h) => h.markering('finale')).then((m) => m.zichtbaar)).toBe(false);
    expect(await hook(page, (h) => h.finaleOpen())).toBe(false);
    expect(await hook(page, (h) => h.huurdersInTuin())).toBe(2);
    // uiterlijk kwam mee uit de opslag: geen "Wie ben jij?"
    await expect(page.getByTestId('maker')).toHaveCount(0);

    // opnieuw beginnen: eerste klik vraagt bevestiging, tweede wist alles
    await page.getByTestId('knop-instellingen').click();
    const knop = page.getByTestId('opnieuw');
    await expect(knop).toHaveText('Opnieuw beginnen');
    await page.screenshot({ path: `${SHOTS}/70-instellingen-opnieuw.png` });
    await knop.click();
    await expect(knop).toContainText('Zeker weten');
    await Promise.all([page.waitForEvent('load'), knop.click()]);
    await page.getByTestId('start').click();
    await page.waitForFunction(() => (window as unknown as { __wijkwijs?: Hook }).__wijkwijs?.ready === true);
    expect(await hook(page, (h) => Object.keys(h.progress()).length)).toBe(0);
    expect(await hook(page, (h) => h.huurdersInTuin())).toBe(0);
    await expect(page.getByTestId('meter-proces')).toContainText('0 / 38');
    expect(fouten).toEqual([]);
  });

  test('een gespeelde woning blijft na herladen bewaard', async ({ page }) => {
    test.setTimeout(240_000);
    const fouten: string[] = [];
    await open(page, fouten);
    await loopNaar(page, 14);
    await speelHuurderfase(page, w1);
    // corporatiefase in één keer goed
    await speelZig(page, w1, () => false);
    await expect(page.getByTestId('achter-de-schermen')).toBeVisible({ timeout: 15_000 });
    await page.getByTestId('ads-knop').click();
    const opgeslagen = await page.evaluate(() => localStorage.getItem('knockknock-voortgang'));
    expect(JSON.parse(opgeslagen!).w.w1[4]).toBe(1);
    await page.reload();
    await page.getByTestId('start').click();
    await page.waitForFunction(() => (window as unknown as { __wijkwijs?: Hook }).__wijkwijs?.ready === true);
    expect(await hook(page, (h) => h.progress().w1?.af)).toBe(true);
    expect(await hook(page, (h) => h.huurdersInTuin())).toBe(1);
    expect(fouten).toEqual([]);
  });
});

/** Speelt alle Zig365-stappen van een woning; fout(index) bepaalt welke stappen bewust fout gaan. */
async function speelZig(page: Page, w: typeof w1, fout: (nr: number) => boolean) {
  const kaart = page.getByTestId('kaart');
  const z = page.getByTestId('zig365');
  let nr = 0;
  for (const deel of w.corporatiefase) {
    await expect(kaart).toContainText(deel.intro.nl, { timeout: 15_000 });
    await page.getByTestId('kaart-knop').click();
    for (const stap of deel.stappen) {
      await expect(z.locator('.z365-vraag')).toHaveText(stap.vraag.nl);
      const fb = z.getByTestId('z365-feedback');
      if (stap.type === 'volgorde') {
        if (!fout(nr)) {
          for (let doel = 0; doel < stap.items.length; doel++) {
            for (;;) {
              const teksten = await z.locator('.z365-item-tekst').allInnerTexts();
              if (teksten.indexOf(stap.items[doel]) === doel) break;
              await z.getByRole('button', { name: `${stap.items[doel]}: omhoog` }).click();
            }
          }
        }
        await page.getByTestId('z365-controleer').click();
      } else {
        const keuze = fout(nr) ? stap.opties.find((_, i) => i !== stap.goed)! : stap.opties[stap.goed];
        await z.getByTestId('z365-optie').filter({ hasText: keuze }).first().click();
      }
      await expect(fb).toContainText(fout(nr) ? 'Niet helemaal.' : 'Goed!');
      await page.getByTestId('z365-volgende').click();
      nr++;
    }
  }
  if (w.afloop) {
    await expect(kaart).toContainText(w.afloop.nl, { timeout: 15_000 });
    await page.getByTestId('kaart-knop').click();
  }
}

test.describe('3 + 4. herkansing en achter de schermen', () => {
  test('gemiste vragen oefenen zonder dat de score verandert; achter de schermen toont de route met voice-over', async ({ page }) => {
    test.setTimeout(300_000);
    const fouten: string[] = [];
    const stemmen: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/assets/stem/ads/')) stemmen.push(r.url().split('/').pop()!); });
    await open(page, fouten);
    await loopNaar(page, 14);
    await speelHuurderfase(page, w1);
    const kaart = page.getByTestId('kaart');
    const z = page.getByTestId('zig365');

    // stap 1 (keuze) en stap 7 (volgorde) bewust fout
    const totaal = w1.corporatiefase.reduce((s, d) => s + d.stappen.length, 0);
    const fout = (nr: number) => nr === 0 || nr === totaal - 1;
    let nr = 0;
    for (const deel of w1.corporatiefase) {
      await expect(kaart).toContainText(deel.intro.nl, { timeout: 15_000 });
      await page.getByTestId('kaart-knop').click();
      for (const stap of deel.stappen) {
        await expect(z.locator('.z365-vraag')).toHaveText(stap.vraag.nl);
        if (stap.type === 'volgorde') {
          await page.getByTestId('z365-controleer').click(); // geschudde volgorde = fout
        } else {
          const keuze = fout(nr) ? stap.opties.find((_, i) => i !== stap.goed)! : stap.opties[stap.goed];
          await z.getByTestId('z365-optie').filter({ hasText: keuze }).first().click();
        }
        await expect(z.getByTestId('z365-feedback')).toContainText(fout(nr) ? 'Niet helemaal.' : 'Goed!');
        await page.getByTestId('z365-volgende').click();
        nr++;
      }
    }

    // herkansing
    await expect(kaart).toContainText('Nog even oefenen?');
    await expect(kaart).toContainText(`2 van de ${totaal} vragen`);
    await page.screenshot({ path: `${SHOTS}/71-herkansing.png` });
    await page.getByTestId('kaart-ja').click();
    const gemist = [w1.corporatiefase[0].stappen[0], w1.corporatiefase[1].stappen[w1.corporatiefase[1].stappen.length - 1]];
    for (const [k, stap] of gemist.entries()) {
      await expect(z.locator('.z365-vraag')).toHaveText(stap.vraag.nl);
      await expect(z).toContainText(`Oefenvraag ${k + 1} van 2`);
      await expect(z.getByTestId('oefenmodus')).toContainText('telt niet mee');
      if (stap.type === 'volgorde') {
        for (let doel = 0; doel < stap.items.length; doel++) {
          for (;;) {
            const teksten = await z.locator('.z365-item-tekst').allInnerTexts();
            if (teksten.indexOf(stap.items[doel]) === doel) break;
            await z.getByRole('button', { name: `${stap.items[doel]}: omhoog` }).click();
          }
        }
        await page.getByTestId('z365-controleer').click();
      } else {
        await z.getByTestId('z365-optie').filter({ hasText: stap.opties[stap.goed] }).first().click();
      }
      await expect(z.getByTestId('z365-feedback')).toContainText('Goed!');
      if (k === 0) await page.screenshot({ path: `${SHOTS}/72-oefenvraag.png` });
      await expect(page.getByTestId('z365-volgende')).toHaveText(k === 1 ? 'Klaar met oefenen' : 'Volgende');
      await page.getByTestId('z365-volgende').click();
    }

    // afloop, dan achter de schermen
    await expect(kaart).toContainText(w1.afloop!.nl, { timeout: 15_000 });
    await page.getByTestId('kaart-knop').click();
    const ads = page.getByTestId('achter-de-schermen');
    await expect(ads).toBeVisible();
    for (const naam of ['de heer Farouk', 'Huurdersportaal', 'Vraagboom', 'Zig365 | Customer (CRM)', 'Zig365 | Operations', 'Anna Kowalska', 'Fatima El Amrani']) {
      await expect(ads).toContainText(naam);
    }
    // beschrijvingen komen letterlijk uit producten in scenarios.json
    await expect(ads).toContainText(scenarios.producten.find((p) => p.id === 'vraagboom')!.kort);
    await expect(page.getByTestId('ads-knop')).toBeFocused();
    // voice-over: de fragmenten worden opgehaald (geluid en voice-over staan standaard aan)
    await expect.poll(() => stemmen.length, { timeout: 10_000 }).toBeGreaterThan(1);
    expect(stemmen).toContain('nl-intro.mp3');
    await page.waitForTimeout(3800);
    // alle stappen in beeld en binnen het paneel (geen afgesneden kaart)
    expect(await ads.locator('.ads-stap.zichtbaar').count()).toBe(7);
    const past = await page.evaluate(() => { const r = document.querySelector('.ads-route')!; return r.scrollWidth <= r.clientWidth + 1; });
    expect(past).toBe(true);
    await page.screenshot({ path: `${SHOTS}/73-achter-de-schermen.png` });
    await page.keyboard.press('Enter');
    await expect(ads).toBeHidden();

    // score: 5 van 7 (de oefenvragen tellen niet mee)
    expect(await hook(page, (h) => h.progress().w1.proces)).toEqual({ score: totaal - 2, max: totaal });
    expect(fouten).toEqual([]);
  });

  test('achter de schermen op een telefoon, met minder beweging en zonder voice-over', async ({ browser }) => {
    test.setTimeout(240_000);
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const fouten: string[] = [];
    const stemmen: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/assets/stem/ads/')) stemmen.push(r.url()); });
    await page.addInitScript(() => localStorage.setItem('wijkwijs-instellingen', JSON.stringify({ geluid: true, voiceOver: false, minderBeweging: true, taal: 'nl' })));
    await open(page, fouten, { 'knockknock-voortgang': voortgang(['w1', 'w2', 'w3', 'w4', 'w5']) });
    // speel woning 6 (de kamer met de trap) via de testhaak naar de deur
    const d = await page.evaluate(() => (window as unknown as { __wijkwijs: { straat: { doors: Map<number, { stand: { x: number; z: number } }> } } }).__wijkwijs.straat.doors.get(24)!.stand);
    await page.evaluate((s) => (window as unknown as { __wijkwijs: { debugCam: (v: object) => void } }).__wijkwijs.debugCam({ x: s.x, z: s.z, yaw: 0, pitch: 0.4, dist: 6, rot: Math.PI }), d);
    await expect(page.getByTestId('prompt')).toContainText('24', { timeout: 10_000 });
    await page.getByTestId('aanbellen').tap();
    const w6 = woning('w6');
    const kaart = page.getByTestId('kaart');
    await expect(kaart).toContainText(w6.huurderfase!.deur.nl);
    await page.getByTestId('kaart-knop').tap();
    for (const h of w6.huurderfase!.hotspots) {
      await page.getByTestId(`pin-${h.id}`).tap();
      await expect(kaart).toContainText(h.tekst.nl);
      await page.getByTestId('kaart-knop').tap();
    }
    await page.getByTestId('praat').tap();
    for (let k = 0; k < w6.huurderfase!.dialoog.length; k++) {
      await page.getByTestId('optie').first().tap();
      await page.getByTestId('kaart-knop').tap();
    }
    await page.getByTestId('kaart-knop').tap(); // leerpunt
    await speelZig(page, w6, () => false);
    const ads = page.getByTestId('achter-de-schermen');
    await expect(ads).toBeVisible();
    // minder beweging: alle stappen staan direct in beeld
    const zichtbaar = await ads.locator('.ads-stap.zichtbaar').count();
    expect(zichtbaar).toBe(await ads.locator('.ads-stap').count());
    // geen voice-over opgehaald
    expect(stemmen).toEqual([]);
    // past op een smal scherm (geen horizontale scroll)
    const breed = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(breed).toBe(true);
    await page.screenshot({ path: `${SHOTS}/74-achter-de-schermen-mobiel.png` });
    await page.getByTestId('ads-knop').tap();
    // woning 1–6 af: de finale gaat open
    expect(await page.evaluate(() => (window as unknown as { __wijkwijs: H }).__wijkwijs.finaleOpen())).toBe(true);
    expect(fouten).toEqual([]);
    await ctx.close();
  });
});

test.describe('7 + 8. leven in de straat', () => {
  test('na de finale: alle huurders in hun tuin, nr 26 bewoond, busje stopt bij geholpen woningen', async ({ page }) => {
    test.setTimeout(240_000);
    const fouten: string[] = [];
    await open(page, fouten, { 'knockknock-voortgang': voortgang(scenarios.woningen.map((w) => w.id)) });
    expect(await hook(page, (h) => h.huurdersInTuin())).toBe(7);
    expect(await hook(page, (h) => h.markering('finale'))).toEqual({ zichtbaar: true, af: true });

    // het busje rijdt en heeft het logo op beide zijkanten
    const logos = await page.evaluate(() => { let n = 0; (window as unknown as { __wijkwijs: { straat: { scene: { traverse: (f: (o: { name: string }) => void) => void } } } }).__wijkwijs.straat.scene.traverse((o) => { if (o.name === 'busje-logo') n++; }); return n; });
    expect(logos).toBe(2);
    // (het kan net stilstaan voor een woning; binnen 8 s rijdt het weer)
    const a = await hook(page, (h) => h.busje());
    let verst = 0;
    for (let i = 0; i < 16; i++) {
      await page.waitForTimeout(500);
      const b = await hook(page, (h) => h.busje());
      verst = Math.max(verst, Math.hypot(b.x - a.x, b.z - a.z));
    }
    expect(verst).toBeGreaterThan(1);

    // het busje staat ergens even stil voor een geholpen woning (westwaarts, langs de huizen)
    const deurX = await page.evaluate(() => [14, 16, 18, 20, 22, 24, 26].map((n) => (window as unknown as { __wijkwijs: { straat: { doors: Map<number, { door: { x: number } }> } } }).__wijkwijs.straat.doors.get(n)!.door.x));
    let gestopt = false;
    for (let i = 0; i < 120 && !gestopt; i++) {
      const p1 = await hook(page, (h) => h.busje());
      await page.waitForTimeout(700);
      const p2 = await hook(page, (h) => h.busje());
      if (Math.hypot(p2.x - p1.x, p2.z - p1.z) < 0.05 && p2.z < 8 && deurX.some((x) => Math.abs(x - p2.x) < 0.6)) gestopt = true;
    }
    expect(gestopt).toBe(true);
    // in beeld: busje voor de huizen, huurders in de tuin
    await page.evaluate((x) => {
      const w = (window as unknown as { __wijkwijs: { debugCam: (v: object) => void; busje: () => { x: number } } }).__wijkwijs;
      w.debugCam({ x: w.busje().x + 4, z: 11, yaw: -0.5, pitch: 0.35, dist: 8 });
      void x;
    }, 0);
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SHOTS}/75-busje-en-tuinen.png` });
    // nr 26 en de verlichte stalling
    await page.evaluate(() => (window as unknown as { __wijkwijs: { debugCam: (v: object) => void } }).__wijkwijs.debugCam({ x: 33, z: 5, yaw: -0.3, pitch: 0.3, dist: 7 }));
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${SHOTS}/76-nr26-bewoond.png` });
    expect(fouten).toEqual([]);
  });

  test('vóór de finale: de dakgoot van nr 16 lekt en de stallinglamp is uit; daarna niet meer', async ({ page }) => {
    const fouten: string[] = [];
    await open(page, fouten);
    const staat = () => page.evaluate(() => {
      let lek = false, lamp = 0;
      (window as unknown as { __wijkwijs: { straat: { scene: { traverse: (f: (o: { name: string; visible: boolean; rotation: { x: number } }) => void) => void } } } }).__wijkwijs.straat.scene.traverse((o) => {
        if (o.name === 'druppel-16' && o.visible) lek = true;
        if (o.name === 'stallinglamp') lamp = o.rotation.x;
      });
      return { lek, scheef: Math.abs(lamp) > 0.1 };
    });
    expect(await staat()).toEqual({ lek: true, scheef: true });
    await page.evaluate((v) => { localStorage.setItem('knockknock-voortgang', v); }, voortgang(['w2', 'w3']));
    await page.reload();
    await page.getByTestId('start').click();
    await page.waitForFunction(() => (window as unknown as { __wijkwijs?: Hook }).__wijkwijs?.ready === true);
    expect(await staat()).toEqual({ lek: false, scheef: false });
    expect(fouten).toEqual([]);
  });
});
