/**
 * Heg en gras (Sketchfab):
 *  - "Hedge" door 1-3D.com, CC BY-SA 4.0 (sketchfab.com/3d-models/hedge-f2006b1a3af9442987963da054283ad7).
 *    Let op: ShareAlike. Het aangepaste model (public/assets/modellen/groen.glb, knoop 'heg') valt ook onder CC BY-SA 4.0.
 *  - "Realtime Grass" door mfhscoobydoo, CC BY 4.0 (sketchfab.com/3d-models/realtime-grass-07d38555cae844f7abdeace9d19c4777).
 * Heg vereenvoudigd (de textuur draagt het detail), grasplukken zonder grondplaat; textures 1024 px WebP.
 * Uit: public/assets/modellen/groen.glb met knopen 'heg' (dichtbij), 'heg-ver' (grof, voor verre heggen) en 'gras-plak'. Gebruik: node tools/groen.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, join, flatten, meshopt, textureCompress, mergeDocuments, unpartition, simplify } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BRON = path.join(ROOT, 'tools/bron-assets/groen');
const UIT = path.join(ROOT, 'public/assets/modellen/groen.glb');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const tri = (doc) => doc.getRoot().listMeshes().reduce((s, m) => s + m.listPrimitives().reduce((t, p) => t + (p.getIndices()?.getCount() ?? 0) / 3, 0), 0);

async function laad(bestand, naam, { weg = [], slordig = 1, netjes = 1, kaartjes = 1 } = {}) {
  const doc = await io.read(path.join(BRON, bestand));
  const voor = tri(doc);
  for (const m of doc.getRoot().listMeshes()) for (const prim of m.listPrimitives()) if (weg.includes(prim.getMaterial()?.getName())) prim.dispose();
  await doc.transform(dedup(), flatten(), join({ keepNamed: false }), weld({ tolerance: 0.0001 }));
  // netjes: vereenvoudigen zonder gaten (dichtbij); slordig: grof, alleen voor ver weg
  if (netjes < 1) await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: netjes, error: 0.01, lockBorder: true }));
  if (slordig < 1) for (const m of doc.getRoot().listMeshes()) for (const prim of m.listPrimitives()) {
    const idx = prim.getIndices(), pos = prim.getAttribute('POSITION');
    const doel = Math.floor(idx.getCount() * slordig / 3) * 3;
    const [nieuw] = MeshoptSimplifier.simplifySloppy(new Uint32Array(idx.getArray()), new Float32Array(pos.getArray()), 3, null, doel, 0.08);
    idx.setArray(new Uint32Array(nieuw));
  }
  // grasplukken: van de kaartjes (vierhoeken van 2 driehoeken) alleen een deel houden, verspreid gekozen
  if (kaartjes < 1) for (const m of doc.getRoot().listMeshes()) for (const prim of m.listPrimitives()) {
    const idx = prim.getIndices().getArray(), houd = [];
    let zaad = 7;
    for (let i = 0; i + 6 <= idx.length; i += 6) { zaad = (zaad * 16807) % 2147483647; if (zaad / 2147483647 < kaartjes) houd.push(...idx.slice(i, i + 6)); }
    prim.getIndices().setArray(new Uint32Array(houd));
  }
  await doc.transform(prune());
  const scene = doc.getRoot().listScenes()[0];
  const wortel = doc.createNode(naam);
  for (const n of scene.listChildren()) { scene.removeChild(n); wortel.addChild(n); }
  scene.addChild(wortel);
  console.log(naam, voor, '→', tri(doc), 'driehoeken');
  return doc;
}
const doc = new Document();
const scene = doc.createScene('kit');
for (const d of [await laad('hedge.glb', 'heg', { netjes: 0.28 }), await laad('hedge.glb', 'heg-ver', { slordig: 0.15 }), await laad('realtime_grass.glb', 'gras-plak', { weg: ['Material'], kaartjes: 0.14 })]) {
  const map = mergeDocuments(doc, d);
  scene.addChild(map.get(d.getRoot().listScenes()[0].listChildren()[0]));
}
for (const s of doc.getRoot().listScenes()) if (s !== scene) s.dispose();
doc.getRoot().setDefaultScene(scene);
await doc.transform(dedup(), prune(), unpartition(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82 }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(UIT, doc);
console.log('groen.glb', Math.round(fs.statSync(UIT).size / 1024), 'kB');
