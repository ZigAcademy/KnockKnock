/**
 * Fietsen en fietsenrek (Sketchfab, CC BY 4.0; zie public/assets/modellen/BRONNEN.md):
 *  - "Retro bike" door annzep, "Bike" door T-FLEX CAD ST (Free) en "Bike Rack #4" door aecoviz.
 * Te zware modellen worden samengevoegd per materiaal en vereenvoudigd (meshoptimizer), textures
 * naar 512 px WebP. Uit: public/assets/modellen/fietsen.glb met knopen 'fiets-retro', 'fiets-mtb' en 'fietsenrek'.
 * Gebruik: node tools/fietsen.mjs [ratio-retro] [ratio-cad]
 */
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, join, flatten, simplify, meshopt, textureCompress, center, mergeDocuments, unpartition } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BRON = path.join(ROOT, 'tools/bron-assets/fietsen');
const UIT = path.join(ROOT, 'public/assets/modellen/fietsen.glb');
const [rRetro = 0.02, rCad = 0.006] = process.argv.slice(2).map(Number);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await MeshoptEncoder.ready; await MeshoptSimplifier.ready;

const WEG = { 'fiets-retro': ['lambert7', 'lambert2', 'phong1', 'lambert3'] };
const tri = (doc) => doc.getRoot().listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((t, p) => t + (p.getIndices()?.getCount() ?? 0) / 3, 0), 0);
async function voorbereid(bestand, naam, ratio, slordig = 0.15, fout = 0.004) {
  const doc = await io.read(path.join(BRON, bestand));
  const voor = tri(doc);
  // grasheuvel (en bloemetjes) onder de retrofiets weg: alleen de fiets zelf
  const weg = WEG[naam] ?? [];
  for (const m of doc.getRoot().listMeshes()) for (const prim of m.listPrimitives()) if (weg.includes(prim.getMaterial()?.getName())) prim.dispose();
  await doc.transform(dedup(), flatten(), join({ keepNamed: false }), weld({ tolerance: 0.0001 }));
  if (ratio < 1) {
    await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.005, lockBorder: false }));
    // losse onderdelen (spaken, schakels, boutjes) laten zich niet samenvoegen: grover vereenvoudigen
    for (const m of doc.getRoot().listMeshes()) for (const prim of m.listPrimitives()) {
      const idx = prim.getIndices(), pos = prim.getAttribute('POSITION');
      if (!idx || !pos) continue;
      const doel = Math.max(300, Math.floor(idx.getCount() * slordig / 3) * 3);
      if (idx.getCount() <= doel) continue;
      const [nieuw] = MeshoptSimplifier.simplifySloppy(new Uint32Array(idx.getArray()), new Float32Array(pos.getArray()), 3, null, doel, fout);
      idx.setArray(new Uint32Array(nieuw));
    }
  }
  await doc.transform(prune());
  // één benoemde wortelknoop met alles erin
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];
  const wortel = doc.createNode(naam);
  for (const n of scene.listChildren()) { scene.removeChild(n); wortel.addChild(n); }
  scene.addChild(wortel);
  console.log(naam, Math.round(voor), '→', Math.round(tri(doc)), 'driehoeken');
  return doc;
}
const doelen = [
  ['retro__bike.glb', 'fiets-retro', rRetro, 0.06, 0.008],
  ['bike.glb', 'fiets-mtb', 0.05, 0.12, 0.03],
  ['bike_rack_4.glb', 'fietsenrek', 1],
];
const doc = new Document();
const scene = doc.createScene('kit');
for (const [b, n, r, sl, f] of doelen) {
  const d = await voorbereid(b, n, r, sl, f);
  const map = mergeDocuments(doc, d);
  const wortel = d.getRoot().listScenes()[0].listChildren()[0];
  scene.addChild(map.get(wortel));
}
for (const s of doc.getRoot().listScenes()) if (s !== scene) s.dispose();
doc.getRoot().setDefaultScene(scene);
await doc.transform(dedup(), prune(), unpartition(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512], quality: 82 }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(UIT, doc);
console.log('fietsen.glb', Math.round(fs.statSync(UIT).size / 1024), 'kB');
