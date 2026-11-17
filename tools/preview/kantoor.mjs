// node tools/preview/kantoor.mjs <uit-prefix> : screenshot van het kantoor per medewerker (dev-server 5199)
import { chromium } from '@playwright/test';
const [uit, bw = '1280', bh = '800'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +bw, height: +bh } });
p.on('console', (m) => { const t = m.text(); if (!/GL Driver|vite|toNonIndexed/.test(t)) console.log(t); });
p.on('pageerror', (e) => console.log('PAGEERROR', e));
await p.goto(process.env.URL ?? 'http://localhost:5199/');
await p.evaluate(() => localStorage.setItem('wijkwijs-speler', 'm11000'));
await p.reload();
await p.getByTestId('start').click({ timeout: 60000 });
await p.waitForFunction(() => window.__wijkwijs?.ready, null, { timeout: 60000 });
for (const id of (process.env.IDS ?? 'anna,fatima').split(',')) {
  await p.evaluate((id) => window.__wijkwijs.debugKantoor(id), id);
  await p.waitForTimeout(1500);
  console.log(id, 'draw calls', await p.evaluate(() => window.__wijkwijs.drawCalls()));
  await p.screenshot({ path: `${uit}-${id}.png` });
}
await b.close();
