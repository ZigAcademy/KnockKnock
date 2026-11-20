/**
 * Realistischere auto's: Generic passenger car pack door Comrade1280 (Sketchfab, CC-BY 4.0).
 * Bron: tools/bron-assets/autos/generic_passenger_car_pack.glb. Omzetten in de browser
 * (tools/autos/omzet.html via de dev-server op 5173): auto's splitsen, overspuiten in de
 * gedempte straatkleuren, onderdelen per materiaal samenvoegen; daarna 512 px WebP + meshopt.
 * Uit: public/assets/modellen/voertuigen.glb (elke auto een benoemde knoop, voorkant +z).
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, meshopt, weld, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const UIT = path.join(ROOT, 'public/assets/modellen/voertuigen.glb');

// naam in het spel ← auto uit de pack, lakkleur (null = origineel), achterstevoren gemodelleerd?
export const AUTOS = [
  { naam: 'sedan', bron: 'sedan', lak: '#7D8A93', draai: true },
  { naam: 'minivan', bron: 'minivan', lak: '#A39A8C', draai: false },
  { naam: 'suv', bron: 'suv', lak: null, draai: true },
  { naam: 'stationwagen', bron: 'wagon', lak: '#8E6E68', draai: false },
  { naam: 'hatchback', bron: 'hatchback', lak: '#6B7A8C', draai: true },
  { naam: 'compact', bron: 'compact', lak: '#C9C6BE', draai: true },
  // pick-up van de corporatie: wit, met het logo op de portieren (dat komt in het spel)
  { naam: 'pickup-wit', bron: 'pickup', lak: '#F2F3F4', draai: false },
];

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await MeshoptEncoder.ready;
const b = await chromium.launch();
const p = await b.newPage();
p.on('console', (m) => { if (m.type() === 'error' || /^LAK/.test(m.text())) console.log(m.text()); });
await p.goto(`http://localhost:${process.env.PORT ?? 5173}/tools/autos/omzet.html`);
await p.waitForFunction(() => window.klaar);
const b64 = await p.evaluate(([l, m]) => window.bouw(l, m), [AUTOS, 512]);
await b.close();
const doc = await io.readBinary(Buffer.from(b64, 'base64'));
await doc.transform(dedup(), prune(), weld(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512], quality: 82 }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(UIT, doc);
console.log('voertuigen.glb', Math.round(fs.statSync(UIT).size / 1024), 'kB');
