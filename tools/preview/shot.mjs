// node tools/preview/shot.mjs <kit> <uit.png> : screenshot van de preview (dev-server op 5199)
import { chromium } from '@playwright/test';
const [kit, uit] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
p.on('console', (m) => console.log(m.text()));
await p.goto(kit.startsWith("p:") ? `http://localhost:5199/tools/preview/personages.html?${kit.slice(2)}` : `http://localhost:5199/tools/preview/?kit=${kit}`);
await p.waitForFunction(() => window.klaar, null, { timeout: 60000 });
await p.screenshot({ path: uit });
await b.close();
