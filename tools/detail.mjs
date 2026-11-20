#!/usr/bin/env node
/**
 * Maakt public/assets/omgeving/detail.jpg: CC0-texturen als grijswaarde-detail in een atlas van 3×3:
 * klinkers, asfalt, baksteen, dakpannen, gras, houten planken (Poly Haven) en heg (tools/heg.mjs, bladeren
 * uit de Stylized Nature MegaKit). De shader vermenigvuldigt de
 * bestaande kleur ermee, zodat de low-poly kleuren blijven en er alleen structuur bijkomt.
 * Elke tegel is genormaliseerd naar gemiddeld 50% grijs. Kopieert ook de HDRI.
 * Bron: tools/bron-assets/polyhaven/*.png (512 px, gemaakt met sips uit de 1k-jpg's).
 * Gebruik: node tools/detail.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PNG } from 'pngjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BRON = path.join(ROOT, 'tools/bron-assets/polyhaven');
const UIT = path.join(ROOT, 'public/assets/omgeving');
const TEGELS = ['brick_pavement_03', 'asphalt_02', 'brick_wall_001', 'ceramic_roof_01', 'leafy_grass', 'wood_planks', 'heg_tegel'];
const K = 3; // tegels per rij
const N = 512;

fs.mkdirSync(UIT, { recursive: true });
const atlas = new PNG({ width: N * K, height: N * K });
atlas.data.fill(128);
TEGELS.forEach((naam, i) => {
  const p = PNG.sync.read(fs.readFileSync(path.join(BRON, `${naam}.png`)));
  if (p.width !== N || p.height !== N) throw new Error(`${naam}: verwacht ${N}px`);
  const L = new Float32Array(N * N);
  let som = 0;
  for (let k = 0; k < N * N; k++) {
    const r = p.data[k * 4], g = p.data[k * 4 + 1], b = p.data[k * 4 + 2];
    L[k] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    som += L[k];
  }
  const gem = som / (N * N);
  let v = 0;
  for (let k = 0; k < N * N; k++) v += (L[k] - gem) ** 2;
  const sd = Math.sqrt(v / (N * N));
  const ox = (i % K) * N, oy = Math.floor(i / K) * N;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const k = y * N + x;
    // gemiddeld 128, spreiding ±45 (zelfde "kracht" voor elke textuur)
    const w = Math.max(0, Math.min(255, Math.round(128 + ((L[k] - gem) / (sd || 1)) * 45)));
    const d = ((oy + y) * N * K + ox + x) * 4;
    atlas.data[d] = atlas.data[d + 1] = atlas.data[d + 2] = w; atlas.data[d + 3] = 255;
  }
  console.log(naam, 'gemiddeld', gem.toFixed(0), 'spreiding', sd.toFixed(0));
});
const png = path.join(UIT, 'detail.png');
fs.writeFileSync(png, PNG.sync.write(atlas));
execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', png, '--out', path.join(UIT, 'detail.jpg')]);
fs.unlinkSync(png);
fs.copyFileSync(path.join(BRON, 'lucht_1k.hdr'), path.join(UIT, 'lucht.hdr'));
for (const f of fs.readdirSync(UIT)) console.log(f, (fs.statSync(path.join(UIT, f)).size / 1024).toFixed(0), 'kB');
