// node tools/preview/straat.mjs <uit-prefix> : screenshots van de straat via de dev-server (5199)
import { chromium } from '@playwright/test';
const [uit] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
p.on('console', (m) => { const t = m.text(); if (!/GL Driver|vite/.test(t)) console.log(t); });
p.on('pageerror', (e) => console.log('PAGEERROR', e));
await p.goto(process.env.URL ?? 'http://localhost:5199/');
await p.evaluate(() => localStorage.setItem('wijkwijs-speler', 'm11000'));
await p.reload();
await p.getByTestId('start').click({ timeout: 60000 });
await p.waitForFunction(() => window.__wijkwijs?.ready, null, { timeout: 60000 });
await p.waitForTimeout(1500);
await p.screenshot({ path: `${uit}-start.png` });
console.log('draw calls', await p.evaluate(() => window.__wijkwijs.drawCalls()));
const views = JSON.parse(process.argv[3] ?? '[]');
for (const [i, v] of views.entries()) {
  await p.evaluate((v) => window.__wijkwijs.debugCam?.(v), v);
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${uit}-${i}.png` });
}
await b.close();
