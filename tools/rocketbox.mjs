/**
 * Realistische personages: Microsoft Rocketbox (MIT, github.com/microsoft/Microsoft-Rocketbox).
 * Bronbestanden in tools/bron-assets/rocketbox/ (FBX + TGA→PNG). Omzetten gebeurt in de browser
 * (tools/rocketbox/omzet.html via de dev-server op 5173), daarna meshopt via gltf-transform.
 * Uit: public/assets/modellen/mensen/<id>.glb en anim-f.glb / anim-m.glb.
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, meshopt, weld, resample, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';
import { MeshoptEncoder } from 'meshoptimizer';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BRON = '/tools/bron-assets/rocketbox';
const UIT = path.join(ROOT, 'public/assets/modellen/mensen');
fs.mkdirSync(UIT, { recursive: true });

// id → bronmap (Adults of Professions). Eerste letter van het id = sekse van de animaties.
// id → bronmap (Adults of Professions). Eerste letter van het id = sekse van de animaties.
const BRONNEN = {
  f01: 'Adults/Female_Adult_01', f03: 'Adults/Female_Adult_03', f06: 'Adults/Female_Adult_06', f08: 'Adults/Female_Adult_08',
  f09: 'Adults/Female_Adult_09', f11: 'Adults/Female_Adult_11', f13: 'Adults/Female_Adult_13', f15: 'Adults/Female_Adult_15',
  fb1: 'Professions/Business_Female_01', fb2: 'Professions/Business_Female_02',
  m03: 'Adults/Male_Adult_03', m04: 'Adults/Male_Adult_04', m05: 'Adults/Male_Adult_05', m06: 'Adults/Male_Adult_06',
  m08: 'Adults/Male_Adult_08', m09: 'Adults/Male_Adult_09', m12: 'Adults/Male_Adult_12', m13: 'Adults/Male_Adult_13',
  m16: 'Adults/Male_Adult_16', mb2: 'Professions/Business_Male_02', mb5: 'Professions/Business_Male_05', mm3: 'Professions/Medical_Male_03',
};
// Kleding afstemmen op de portretten (marineblauw en lichtblauw uit looks.ts). Tint in graden, sat/licht 0–1.
const MARINE = '#2C3850', LICHTBLAUW = '#B8CBE2';
const VERF = {
  mm3: [{ tex: 'body', sat: [0, 0.2], licht: [0.62, 1], naar: MARINE }], // witte doktersjas → marineblauw colbert (Farouk)
  mb5: [{ tex: 'body', tint: [255, 325], sat: [0.2, 1], naar: LICHTBLAUW }, { tex: 'head', sat: [0, 0.45], licht: [0, 0.11], naar: '#9A9893' }], // paars overhemd → lichtblauw, haar grijs (Mensah)
  fb2: [{ tex: 'body', tint: [335, 15], sat: [0.25, 1], licht: [0, 0.55], naar: MARINE }], // rood jasje → marineblauw (Hansen; haar blijft lichtgrijs-blond: het zit in twee texturen)
  m06: [{ tex: 'body', tint: [340, 12], sat: [0.4, 1], naar: MARINE }], // rode trui → marineblauw (Mulder)
  m03: [{ tex: 'body', tint: [330, 15], sat: [0.25, 1], licht: [0, 0.5], naar: LICHTBLAUW }], // bordeaux overhemd → lichtblauw (Volkov)
  f06: [{ tex: 'head', sat: [0, 0.25], licht: [0.45, 1], naar: '#232C3F', behalve: [[0, 0.68, 0.14, 0.9], [0.2, 0.87, 0.35, 1]] }, { tex: 'opacity', sat: [0, 0.25], licht: [0.45, 1], naar: '#232C3F' }, { tex: 'body', sat: [0, 0.2], licht: [0.6, 1], naar: '#232C3F' }], // witte hoofddoek → marine, niet de ogen en tanden (Fatima)
};
export const MENSEN = Object.entries(BRONNEN).map(([id, bron]) => ({ id, map: bron.split('/')[1], sekse: id[0], verf: VERF[id] ?? [] }));
const ANIMS = (s) => [
  { pad: `${BRON}/anim/${s}_idle_neutral_01.fbx`, naam: 'Idle' },
  { pad: `${BRON}/anim/${s}_walk_neutral_01.fbx`, naam: 'Walk' },
  { pad: `${BRON}/anim/${s}_run_neutral_01.fbx`, naam: 'Run' },
  { pad: `${BRON}/anim/${s}_wave_01.fbx`, naam: 'Wave' },
  { pad: `${BRON}/anim/${s}_knock_door.fbx`, naam: 'Interact' },
  { pad: `${BRON}/anim/${s}_sit_table_idle_neutral_01.fbx`, naam: 'Sit' },
];

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await MeshoptEncoder.ready;
async function schrijf(b64, naam) {
  const doc = await io.readBinary(Buffer.from(b64, 'base64'));
  await doc.transform(dedup(), prune(), weld(), resample(), textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 82 }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(path.join(UIT, naam), doc);
  console.log(naam, Math.round(fs.statSync(path.join(UIT, naam)).size / 1024), 'kB');
}

const b = await chromium.launch();
const p = await b.newPage();
p.on('console', (m) => { if (m.type() === 'error' || m.text().startsWith('MAT')) console.log(m.type() === 'error' ? 'ERR' : '', m.text()); });
await p.goto(`http://localhost:${process.env.PORT ?? 5173}/tools/rocketbox/omzet.html`);
await p.waitForFunction(() => window.klaar);
const maat = Number(process.env.MAAT ?? 512);
const alleen = process.argv.slice(2);
for (const m of MENSEN) {
  if (alleen.length && !alleen.includes(m.id) && !alleen.includes('alles')) continue;
  const dir = path.join(ROOT, 'tools/bron-assets/rocketbox', m.map);
  const pngs = fs.readdirSync(dir).filter((f) => f.endsWith('_color.png')).map((f) => `${BRON}/${m.map}/${f}`);
  await schrijf(await p.evaluate(([a, b, c, d]) => window.karakter(a, b, c, d), [`${BRON}/${m.map}/${m.map}.fbx`, pngs, maat, m.verf]), `${m.id}.glb`);
}
if (!alleen.length || alleen.includes('anim') || alleen.includes('alles'))
for (const s of ['f', 'm']) {
  // alle botten die bij een van de modellen van deze sekse voorkomen
  const botten = new Set();
  for (const m of MENSEN.filter((x) => x.sekse === s)) for (const bt of await p.evaluate((a) => window.botten(a), `${BRON}/${m.map}/${m.map}.fbx`)) botten.add(bt);
  await schrijf(await p.evaluate(([l, bt]) => window.animaties(l, bt), [ANIMS(s), [...botten]]), `anim-${s}.glb`);
}
await b.close();
