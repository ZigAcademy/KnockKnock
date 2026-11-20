/**
 * Buitenobjecten van Poly Haven (CC0, polyhaven.com): picknicktafel, tuinset, plantenbak, potten,
 * kratten, gieter, tuinstoel, emmer, vuilniszak.
 * Downloadt de 1k-glTF via de Poly Haven-API (geen account nodig), vereenvoudigt elk model tot
 * ±2500 driehoeken, textures naar 512 px WebP, en schrijft public/assets/modellen/props.glb
 * (elk object een benoemde knoop, op ware grootte, met de voet op y = 0). Gebruik: node tools/props.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, join, flatten, simplify, meshopt, textureCompress, mergeDocuments, unpartition, getBounds } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BRON = path.join(ROOT, 'tools/bron-assets/props');
const UIT = path.join(ROOT, 'public/assets/modellen/props.glb');
export const PROPS = {
  picknicktafel: 'wooden_picnic_table', tuinset: 'outdoor_table_chair_set_01', plantenbak: 'planter_box_01',
  'pot-klei': 'planter_pot_clay', kamerplant: 'potted_plant_04',
  krat: 'wooden_crate_01', 'krat-plastic': 'plastic_crate_02',
  gieter: 'watering_can_metal_01', tuinstoel: 'plastic_monobloc_chair_01',
  emmer: 'wooden_bucket_01', vuilniszak: 'trashbag',
};
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await MeshoptEncoder.ready; await MeshoptSimplifier.ready;

async function haal(id) {
  const dir = path.join(BRON, id);
  const gltf = path.join(dir, `${id}_1k.gltf`);
  if (fs.existsSync(gltf)) return gltf;
  fs.mkdirSync(dir, { recursive: true });
  const info = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();
  const g = info.gltf['1k'].gltf;
  const bestanden = [[g.url, `${id}_1k.gltf`], ...Object.entries(g.include ?? {}).map(([rel, v]) => [v.url, rel])];
  for (const [url, rel] of bestanden) {
    const doel = path.join(dir, rel);
    fs.mkdirSync(path.dirname(doel), { recursive: true });
    fs.writeFileSync(doel, Buffer.from(await (await fetch(url)).arrayBuffer()));
  }
  return gltf;
}
const tri = (doc) => doc.getRoot().listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((t, p) => t + (p.getIndices()?.getCount() ?? 0) / 3, 0), 0);

const doc = new Document();
const scene = doc.createScene('kit');
for (const [naam, id] of Object.entries(PROPS)) {
  const d = await io.read(await haal(id));
  const voor = tri(d);
  await d.transform(dedup(), flatten(), join({ keepNamed: false }), weld());
  const doelTri = { 'pot-klei': 500, kamerplant: 700, gieter: 700, emmer: 700, 'krat-plastic': 1000, tuinstoel: 1000, krat: 1200, vuilniszak: 900, plantenbak: 1500 }[naam] ?? 2500;
  if (voor > doelTri) await d.transform(simplify({ simplifier: MeshoptSimplifier, ratio: doelTri / voor, error: 0.01, lockBorder: false }));
  await d.transform(prune());
  const s = d.getRoot().listScenes()[0];
  const wortel = d.createNode(naam);
  for (const n of s.listChildren()) { s.removeChild(n); wortel.addChild(n); }
  s.addChild(wortel);
  const map = mergeDocuments(doc, d);
  scene.addChild(map.get(wortel));
  const b = getBounds(map.get(wortel));
  console.log(naam.padEnd(14), String(voor).padStart(6), '→', String(Math.round(tri(d))).padStart(5), 'maat', b.max.map((v, i) => (v - b.min[i]).toFixed(2)).join(' x '));
}
for (const s of doc.getRoot().listScenes()) if (s !== scene) s.dispose();
doc.getRoot().setDefaultScene(scene);
await doc.transform(dedup(), prune(), unpartition(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [512, 512], quality: 80 }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(UIT, doc);
console.log('props.glb', Math.round(fs.statSync(UIT).size / 1024), 'kB');
