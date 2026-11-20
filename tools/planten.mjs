#!/usr/bin/env node
/**
 * Planten-kit uit Quaternius "Stylized Nature MegaKit" (CC0, OpenGameArt-spiegel van de gratis Standard-versie),
 * uitgepakt in tools/bron-assets/naturemegakit/. Selecteert een paar bomen, struiken, bloemen, gras en planten,
 * verkleint de texturen (bast 512 px jpg, bladeren 512 px png met alfa), laat normal maps weg en schrijft
 * public/assets/modellen/planten.glb (meshopt). Elk model is een benoemde knoop.
 * Gebruik: node tools/planten.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, meshopt, mergeDocuments, unpartition, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BRON = path.join(ROOT, 'tools/bron-assets/naturemegakit/glTF');
const TMP = path.join(ROOT, 'tools/bron-assets/naturemegakit/_klein');
const UIT = path.join(ROOT, 'public/assets/modellen/planten.glb');

const MODELLEN = [
  ['boom-1', 'CommonTree_1'], ['boom-2', 'CommonTree_3'], ['boom-3', 'CommonTree_5'],
  ['struik', 'Bush_Common'], ['struik-bloem', 'Bush_Common_Flowers'],
  ['bloemen-1', 'Flower_3_Group'], ['bloemen-2', 'Flower_4_Group'],
  ['gras', 'Grass_Common_Short'], ['gras-hoog', 'Grass_Wispy_Short'],
  ['plant', 'Plant_1'], ['varen', 'Fern_1'],
];

// 1. kopie met kleine texturen (geen normal maps)
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });
const klein = new Map();
for (const [, f] of MODELLEN) {
  const g = JSON.parse(fs.readFileSync(path.join(BRON, `${f}.gltf`), 'utf8'));
  for (const img of g.images ?? []) {
    if (klein.has(img.uri)) { img.uri = klein.get(img.uri); continue; }
    const bron = path.join(BRON, img.uri);
    const isBast = /^Bark/.test(img.uri);
    const nieuw = isBast ? img.uri.replace(/\.png$/, '.jpg') : img.uri;
    {
      // normal maps worden straks weggegooid; een minikopie is genoeg om te kunnen inlezen
      const args = ['-Z', /_Normal/.test(img.uri) ? '8' : '512'];
      if (isBast) args.push('-s', 'format', 'jpeg', '-s', 'formatOptions', '80');
      execFileSync('sips', [...args, bron, '--out', path.join(TMP, nieuw)], { stdio: 'pipe' });
      if (!fs.existsSync(path.join(TMP, nieuw))) throw new Error('sips faalde: ' + bron);
    }
    klein.set(img.uri, nieuw);
    img.uri = nieuw;
    if (isBast) img.mimeType = 'image/jpeg';
  }
  // normal maps weg
  for (const m of g.materials ?? []) delete m.normalTexture;
  fs.writeFileSync(path.join(TMP, `${f}.gltf`), JSON.stringify(g));
  for (const b of g.buffers ?? []) fs.copyFileSync(path.join(BRON, b.uri), path.join(TMP, b.uri));
}

// 2. samenvoegen tot één kit
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await MeshoptEncoder.ready;
const doel = new Document();
doel.createBuffer();
const scene = doel.createScene('planten');
for (const [naam, f] of MODELLEN) {
  const src = await io.read(path.join(TMP, `${f}.gltf`));
  const ss = src.getRoot().getDefaultScene() ?? src.getRoot().listScenes()[0];
  const groep = src.createNode(naam);
  for (const c of ss.listChildren()) { ss.removeChild(c); groep.addChild(c); }
  ss.addChild(groep);
  const map = mergeDocuments(doel, src);
  const m = map.get(ss);
  for (const c of m.listChildren()) scene.addChild(c);
  m.dispose();
}
doel.getRoot().setDefaultScene(scene);
for (const t of doel.getRoot().listTextures()) if (/_Normal\./.test(t.getURI() ?? '')) t.dispose();
await doel.transform(dedup(), prune(), weld(), unpartition(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(UIT, doel);
console.log('planten.glb', (fs.statSync(UIT).size / 1024).toFixed(0), 'kB,', doel.getRoot().listTextures().length, 'texturen');
