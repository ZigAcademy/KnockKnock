// node tools/preview/beeld.mjs <uit.png> '<js na start>' [kwaliteit] : screenshot met een bepaalde beeldkwaliteit (dev-server op 5173)
import { chromium } from '@playwright/test';
const [uit, code = '', kwaliteit = 'hoog'] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
p.on('console', (m) => { const t = m.text(); if (!/GL Driver|vite|toNonIndexed|Failed to load/.test(t)) console.log(t); });
p.on('pageerror', (e) => console.log('PAGEERROR', e));
await p.addInitScript((k) => { localStorage.setItem('wijkwijs-instellingen', JSON.stringify({ geluid: false, voiceOver: false, minderBeweging: false, taal: 'nl', kwaliteit: k })); localStorage.setItem('wijkwijs-speler', 'm11000'); }, kwaliteit);
await p.goto(process.env.URL ?? 'http://localhost:5173/');
await p.getByTestId('start').click({ timeout: 60000 });
await p.waitForFunction(() => window.__wijkwijs?.ready, null, { timeout: 60000 });
if (code) console.log(JSON.stringify(await p.evaluate(`(async () => { const w = window.__wijkwijs; ${code} })()`)));
await p.waitForTimeout(2500);
console.log('modus', await p.evaluate(() => window.__wijkwijs.beeldModus()));
await p.screenshot({ path: uit });
await b.close();
