/**
 * Maakt het heg-materiaal uit bladeren van de Stylized Nature MegaKit (CC0):
 *  - tools/bron-assets/polyhaven/heg_tegel.png: naadloze tegel (512 px) vol kleine bladeren, voor de detail-atlas;
 *  - public/assets/omgeving/heg_blad.png: losse bladtak met alfa (256 px) voor de uitstekende blaadjes langs de heg.
 * Componeren gebeurt op een canvas in een headless browser. Gebruik: node tools/heg.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const bron = fs.readFileSync(path.join(ROOT, 'tools/bron-assets/naturemegakit/Textures/Leaves.png')).toString('base64');
const b = await chromium.launch();
const p = await b.newPage();
const [tegel, blad] = await p.evaluate(async (src) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + src; await img.decode();
  // bladvormen in de bron (2048 px): ovaal blad rechtsboven, hartvormig blad daaronder
  const vormen = [[1600, 80, 360, 480], [1580, 640, 380, 510]];
  let zaad = 7; const rnd = () => ((zaad = (zaad * 16807) % 2147483647) / 2147483647);
  const stempel = (ctx, x, y, s, hoek, licht, w) => {
    const [sx, sy, sw, sh] = vormen[Math.floor(rnd() * vormen.length)];
    for (const dx of [-w, 0, w]) for (const dy of [-w, 0, w]) {
      if (!w && (dx || dy)) continue;
      ctx.save(); ctx.translate(x + dx, y + dy); ctx.rotate(hoek);
      ctx.filter = `brightness(${licht}) saturate(0.85)`;
      ctx.drawImage(img, sx, sy, sw, sh, -s * 0.37, -s / 2, s * 0.75, s);
      ctx.restore();
    }
  };
  // tegel: donkere ondergrond, lagen bladeren van diep (donker) naar buiten (licht)
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#16210f'; ctx.fillRect(0, 0, N, N);
  for (let laag = 0; laag < 4; laag++) for (let i = 0; i < 700; i++)
    stempel(ctx, rnd() * N, rnd() * N, 22 + rnd() * 16, rnd() * Math.PI * 2, 0.35 + laag * 0.2 + rnd() * 0.2, N);
  // los takje met alfa voor de rand
  const M = 256, c2 = document.createElement('canvas'); c2.width = c2.height = M;
  const k2 = c2.getContext('2d');
  for (let i = 0; i < 26; i++) { const a = rnd() * Math.PI * 2, r = rnd() * 80; stempel(k2, M / 2 + Math.cos(a) * r, M / 2 + Math.sin(a) * r, 46 + rnd() * 20, rnd() * Math.PI * 2, 0.7 + rnd() * 0.45, 0); }
  return [c.toDataURL('image/png').split(',')[1], c2.toDataURL('image/png').split(',')[1]];
}, bron);
await b.close();
fs.writeFileSync(path.join(ROOT, 'tools/bron-assets/polyhaven/heg_tegel.png'), Buffer.from(tegel, 'base64'));
fs.writeFileSync(path.join(ROOT, 'public/assets/omgeving/heg_blad.png'), Buffer.from(blad, 'base64'));
console.log('heg_tegel.png en heg_blad.png gemaakt');
