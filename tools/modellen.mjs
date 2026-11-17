#!/usr/bin/env node
/**
 * Asset-pijplijn voor Wijkwijs (fase 4b).
 *
 * Leest de uitgepakte packs in tools/bron-assets/ (staat in .gitignore) en schrijft
 * geselecteerde, geoptimaliseerde GLB-bestanden naar public/assets/modellen/:
 *   - personages/<outfit>.glb  mesh + skelet, zonder animaties
 *   - personages/anim.glb      gedeeld skelet + alleen de 6 gebruikte animaties
 *   - <kit>.glb                losse modellen als benoemde knopen (één bestand per kit)
 *
 * Optimalisatie: dedup, prune, (weld), meshopt-compressie (+ kwantisatie).
 * Kenney-modellen met een kleurenatlas (colormap.png) krijgen vertexkleuren
 * in plaats van een textuur, zodat we ze kunnen samenvoegen en dempen.
 * OBJ+MTL (Quaternius-interieur, gebouwen) wordt hier zelf ingelezen.
 *
 * Gebruik:  node tools/modellen.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO, Document } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, meshopt, weld, resample, mergeDocuments, unpartition } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { PNG } from 'pngjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BRON = path.join(ROOT, 'tools/bron-assets');
const UIT = path.join(ROOT, 'public/assets/modellen');

const P = {
  men: 'men/Ultimate Modular Men- Feb 2022/Individual Characters/glTF',
  women: 'women/Ultimate Modular Women - April 2022/Individual Characters/glTF',
  cars: 'cars/Models/GLB format',
  roads: 'roads/Models/GLB format',
  food: 'food/Models/GLB format',
  furn: 'furniture/Models/GLTF format',
  nature: 'nature/Models/GLTF format',
  qint: 'interior/Ultimate House Interior Pack - June 2020/OBJ',
  qfurn: 'qfurn/Furniture Pack - March 2019/OBJ',
  animals: 'animals/Ultimate Animated Animals - July 2021/glTF',
  bld: 'buildings/Ultimate Textured Building Pack - Dec 2019/Models with Materials/OBJ',
};

/** Personages: [uitvoernaam, bronmap, bestand]. Geen Punk/King/Witch/Spacesuit/Soldier/Swat. */
const PERSONAGES = [
  ['man-casual', P.men, 'Casual_2.gltf'],
  ['man-hoodie', P.men, 'Casual_Hoodie.gltf'],
  ['man-suit', P.men, 'Suit.gltf'],
  ['vrouw-casual', P.women, 'Casual.gltf'],
  ['vrouw-formal', P.women, 'Formal.gltf'],
  ['vrouw-suit', P.women, 'Suit.gltf'],
];
/** Losse hoofden (kapsels) die op elk lichaam passen (zelfde skelet): [naam, map, bestand, knoop]. */
const HOOFDEN = [
  ['man-krul', P.men, 'Casual_2.gltf', 'Casual2_Head'],
  ['man-kort', P.men, 'Casual_Hoodie.gltf', 'Casual_Head'],
  ['man-scheiding', P.men, 'Suit.gltf', 'Suit_Head'],
  ['man-lang', P.men, 'Adventurer.gltf', 'Adventurer_Head'],
  ['man-golf', P.men, 'Beach.gltf', 'Beach_Head'],
  ['vrouw-bob', P.women, 'Casual.gltf', 'Casual_Head'],
  ['vrouw-opgestoken', P.women, 'Formal.gltf', 'Formad_Head'],
  ['vrouw-pixie', P.women, 'Adventurer.gltf', 'Adventurer_Head'],
  ['vrouw-staart', P.women, 'Soldier.gltf', 'Soldier_Head'],
  ['vrouw-kort', P.women, 'SciFi.gltf', 'SciFi_Head'],
];
const ANIMATIES = ['Idle', 'Idle_Neutral', 'Walk', 'Run', 'Wave', 'Interact'];

/** Kits: uitvoernaam → lijst van [knoopnaam, bronmap, bestand]. */
const KITS = {
  autos: [
    ['sedan', P.cars, 'sedan.glb'],
    ['hatchback', P.cars, 'hatchback-sports.glb'],
    ['suv', P.cars, 'suv.glb'],
    ['van', P.cars, 'van.glb'],
    ['bestelbus', P.cars, 'delivery.glb'],
  ],
  straat: [
    ['lantaarn', P.roads, 'light-curved.glb'],
    ['deurmat', P.furn, 'rugDoormat.glb'],
    ['kliko', P.qint, 'Trashcan_Green.obj'],
    ['prullenbak', P.qint, 'Trashcan_Cylindric.obj'],
  ],
  natuur: [
    ['boom-eik', P.nature, 'tree_oak.glb'],
    ['boom-rond', P.nature, 'tree_default.glb'],
    ['boom-detail', P.nature, 'tree_detailed.glb'],
    ['boom-dik', P.nature, 'tree_fat.glb'],
    ['boom-slank', P.nature, 'tree_simple.glb'],
    ['struik', P.nature, 'plant_bush.glb'],
    ['struik-groot', P.nature, 'plant_bushLarge.glb'],
    ['struik-detail', P.nature, 'plant_bushDetailed.glb'],
    ['bloem-rood', P.nature, 'flower_redA.glb'],
    ['bloem-geel', P.nature, 'flower_yellowA.glb'],
    ['bloem-paars', P.nature, 'flower_purpleA.glb'],
    ['gras', P.nature, 'grass_large.glb'],
    ['hek', P.nature, 'fence_simple.glb'],
    ['pot-groot', P.nature, 'pot_large.glb'],
  ],
  meubels: [
    // Quaternius (eerste keus)
    ['bank-2', P.qint, 'Couch_Medium2.obj'],
    ['stoel-2', P.qint, 'Chair_2.obj'],
    ['stoel-3', P.qint, 'Chair_3.obj'],
    ['tafel-rond-klein', P.qint, 'Table_RoundSmall.obj'],
    ['plank', P.qint, 'Shelf_Small1.obj'],
    ['ladekast', P.qint, 'Drawer_1.obj'],
    ['plant-1', P.qint, 'Houseplant_1.obj'],
    ['plant-2', P.qint, 'Houseplant_3.obj'],
    ['plant-3', P.qint, 'Houseplant_5.obj'],
    ['plant-4', P.qint, 'Houseplant_7.obj'],
    ['lamp-vloer', P.qint, 'Light_Floor1.obj'],
    ['lamp-hang', P.qint, 'Light_Ceiling1.obj'],
    ['lamp-hang-2', P.qint, 'Light_Ceiling4.obj'],
    ['lamp-bureau', P.qint, 'Light_Desk.obj'],
    ['gordijn', P.qint, 'Curtains_Double.obj'],
    ['keuken-lades', P.qint, 'Kitchen_2Drawers.obj'],
    ['keuken-oven', P.qint, 'Kitchen_Oven.obj'],
    ['koelkast', P.qint, 'Kitchen_Fridge.obj'],
    ['nachtkastje', P.qint, 'NightStand_1.obj'],
    ['sofa', P.qfurn, 'Sofa.obj'],
    ['sofa-2', P.qfurn, 'Sofa2.obj'],
    ['tafel', P.qfurn, 'Table.obj'],
    ['tafel-2', P.qfurn, 'Table2.obj'],
    ['stoel', P.qfurn, 'Chair.obj'],
    ['boekenkast', P.qint, 'Bookshelf.obj'],
    ['tv-meubel', P.furn, 'cabinetTelevision.glb'],
    ['tv', P.furn, 'televisionModern.glb'],
    ['boekenkast-boeken', P.qfurn, 'Bookcase_Books.obj'],
    ['bureau', P.qfurn, 'Desk.obj'],
    ['bureaustoel', P.qfurn, 'OfficeChair.obj'],
    ['kast-laag', P.qfurn, 'ShortCloset.obj'],
    // Kenney Furniture Kit (aanvulling)
    ['radio', P.furn, 'radio.glb'],
    ['koffiezetter', P.furn, 'kitchenCoffeeMachine.glb'],
    ['salontafel', P.furn, 'tableCoffee.glb'],
    ['kapstok', P.furn, 'coatRackStanding.glb'],
    ['boeken', P.furn, 'books.glb'],
    ['kussen', P.furn, 'pillow.glb'],
    ['plantje-1', P.furn, 'plantSmall1.glb'],
    ['plantje-2', P.furn, 'plantSmall2.glb'],
    ['beeldscherm', P.furn, 'computerScreen.glb'],
    ['toetsenbord', P.furn, 'computerKeyboard.glb'],
    ['fauteuil-relax', P.furn, 'loungeChairRelax.glb'],
  ],
  eten: [
    ['kopje', P.food, 'cup-saucer.glb'],
    ['mok', P.food, 'mug.glb'],
    ['theekop', P.food, 'cup-tea.glb'],
    ['appel', P.food, 'apple.glb'],
    ['sinaasappel', P.food, 'orange.glb'],
    ['peer', P.food, 'pear.glb'],
    ['schaal', P.food, 'bowl.glb'],
    ['pak', P.food, 'carton.glb'],
    ['glas', P.food, 'glass.glb'],
  ],
  gebouwen: [
    ['flat-slank', P.bld, '3Story_Slim_Mat.obj'],
    ['flat-balkon', P.bld, '3Story_Balcony_Mat.obj'],
    ['huis-breed', P.bld, '2Story_Wide_Mat.obj'],
    ['huis-dubbel', P.bld, '2Story_Double_Mat.obj'],
  ],
};

/** Dieren (los, met eigen skelet en animaties). */
const DIEREN = [
  ['hond', P.animals, 'ShibaInu.gltf', ['Walk', 'Idle', 'Idle_2', 'Eating']],
];

// ------------------------------------------------------------------

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** Kenney-atlas → vertexkleuren (COLOR_0), textuur en UV eruit. */
function bakeAtlas(doc, srcDir) {
  const cache = new Map();
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const mat = prim.getMaterial();
      const tex = mat?.getBaseColorTexture();
      const uv = prim.getAttribute('TEXCOORD_0');
      if (!tex || !uv) continue;
      let img = cache.get(tex);
      if (!img) {
        let buf = tex.getImage();
        if (!buf || !buf.length) buf = fs.readFileSync(path.join(srcDir, tex.getURI()));
        img = PNG.sync.read(Buffer.from(buf));
        cache.set(tex, img);
      }
      const n = uv.getCount();
      const col = new Float32Array(n * 3);
      const f = mat.getBaseColorFactor();
      const t = [0, 0];
      for (let i = 0; i < n; i++) {
        uv.getElement(i, t);
        const x = Math.min(img.width - 1, Math.max(0, Math.floor((t[0] - Math.floor(t[0])) * img.width)));
        const y = Math.min(img.height - 1, Math.max(0, Math.floor((t[1] - Math.floor(t[1])) * img.height)));
        const o = (y * img.width + x) * 4;
        col[i * 3] = srgbToLinear(img.data[o] / 255) * f[0];
        col[i * 3 + 1] = srgbToLinear(img.data[o + 1] / 255) * f[1];
        col[i * 3 + 2] = srgbToLinear(img.data[o + 2] / 255) * f[2];
      }
      prim.setAttribute('COLOR_0', doc.createAccessor().setType('VEC3').setArray(col).setBuffer(uv.getBuffer()));
      prim.setAttribute('TEXCOORD_0', null);
      const m2 = mat.clone().setBaseColorTexture(null).setBaseColorFactor([1, 1, 1, 1]).setName('atlas');
      prim.setMaterial(m2);
    }
  }
  for (const t of doc.getRoot().listTextures()) t.dispose();
}

/** Minimale OBJ+MTL-lezer: één primitive per materiaal, vlakke normalen. */
function readObj(file) {
  const dir = path.dirname(file);
  const txt = fs.readFileSync(file, 'utf8');
  const mtl = new Map();
  const mtllib = txt.match(/^mtllib\s+(.+)$/m)?.[1]?.trim();
  if (mtllib && fs.existsSync(path.join(dir, mtllib))) {
    let cur = null;
    for (const line of fs.readFileSync(path.join(dir, mtllib), 'utf8').split(/\r?\n/)) {
      const p = line.trim().split(/\s+/);
      if (p[0] === 'newmtl') { cur = p.slice(1).join(' '); mtl.set(cur, [0.8, 0.8, 0.8]); }
      else if (p[0] === 'Kd' && cur) mtl.set(cur, p.slice(1, 4).map(Number));
    }
  }
  const v = [];
  const groups = new Map();
  let cur = 'default';
  for (const line of txt.split(/\r?\n/)) {
    if (line.startsWith('v ')) { const p = line.trim().split(/\s+/); v.push([+p[1], +p[2], +p[3]]); }
    else if (line.startsWith('usemtl ')) cur = line.slice(7).trim();
    else if (line.startsWith('f ')) {
      const idx = line.trim().split(/\s+/).slice(1).map((s) => { const i = parseInt(s.split('/')[0], 10); return i < 0 ? v.length + i : i - 1; });
      if (!groups.has(cur)) groups.set(cur, []);
      const g = groups.get(cur);
      for (let k = 1; k < idx.length - 1; k++) g.push(idx[0], idx[k], idx[k + 1]);
    }
  }
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene();
  const mesh = doc.createMesh(path.basename(file, '.obj'));
  for (const [name, tri] of groups) {
    const pos = new Float32Array(tri.length * 3);
    const nor = new Float32Array(tri.length * 3);
    for (let i = 0; i < tri.length; i += 3) {
      const a = v[tri[i]], b = v[tri[i + 1]], c = v[tri[i + 2]];
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
      const wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2];
      let nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      [a, b, c].forEach((p, k) => {
        pos.set(p, (i + k) * 3);
        nor.set([nx, ny, nz], (i + k) * 3);
      });
    }
    const kd = mtl.get(name) ?? [0.8, 0.8, 0.8];
    const mat = doc.createMaterial(name).setBaseColorFactor([kd[0], kd[1], kd[2], 1]).setRoughnessFactor(0.9).setMetallicFactor(0);
    const prim = doc.createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buffer))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(nor).setBuffer(buffer))
      .setMaterial(mat);
    mesh.addPrimitive(prim);
  }
  scene.addChild(doc.createNode(path.basename(file, '.obj')).setMesh(mesh));
  return doc;
}

async function readSource(dir, file) {
  const full = path.join(BRON, dir, file);
  if (file.endsWith('.obj')) return readObj(full);
  const doc = await io.read(full);
  bakeAtlas(doc, path.dirname(full));
  return doc;
}

async function optimize(doc, { skinned = false } = {}) {
  await doc.transform(
    dedup(),
    prune({ keepAttributes: false }),
    ...(skinned ? [] : [weld()]),
    unpartition(),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
}

async function write(doc, rel) {
  const out = path.join(UIT, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await io.write(out, doc);
  return fs.statSync(out).size;
}

/** Animatie volledig weg (kanalen, samplers en hun accessors). */
function dropAnim(a) {
  for (const s of a.listSamplers()) s.dispose();
  for (const c of a.listChannels()) c.dispose();
  a.dispose();
}

/** Vingers en constante sporen weg: scheelt veel ruimte, zie je niet in het spel. */
function slimAnim(doc) {
  for (const a of doc.getRoot().listAnimations()) {
    for (const c of a.listChannels()) {
      const n = c.getTargetNode()?.getName() ?? '';
      if (/^(Index|Middle|Ring|Pinky|Thumb)/.test(n) || c.getTargetPath() === 'scale') {
        const s = c.getSampler(); c.dispose();
        if (s && !s.listParents().some((p) => p.propertyType === 'AnimationChannel')) s.dispose();
      }
    }
  }
}

const kb = (n) => `${(n / 1024).toFixed(0)} kB`;
let totaal = 0;

async function personages() {
  for (const [naam, dir, file] of PERSONAGES) {
    const doc = await io.read(path.join(BRON, dir, file));
    for (const a of doc.getRoot().listAnimations()) dropAnim(a);
    // geen wapens of andere losse attributen: alleen lichaam, hoofd, benen en voeten
    for (const n of doc.getRoot().listNodes()) {
      if (n.getMesh() && /pistol|gun|sword|knife|rifle|axe|weapon|shield/i.test(n.getName())) { n.getMesh().dispose(); n.dispose(); }
    }
    await optimize(doc, { skinned: true });
    const s = await write(doc, `personages/${naam}.glb`);
    totaal += s; console.log('personage', naam, kb(s));
  }
  // gedeelde animaties: skelet van één personage, meshes eruit
  const doc = await io.read(path.join(BRON, P.men, 'Suit.gltf'));
  for (const a of doc.getRoot().listAnimations()) if (!ANIMATIES.includes(a.getName())) dropAnim(a);
  slimAnim(doc);
  for (const n of doc.getRoot().listNodes()) { n.setMesh(null); n.setSkin(null); }
  for (const m of doc.getRoot().listMeshes()) m.dispose();
  await doc.transform(resample(), dedup(), prune(), unpartition(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const s = await write(doc, 'personages/anim.glb');
  totaal += s; console.log('animaties', doc.getRoot().listAnimations().map((a) => a.getName()).join(','), kb(s));
}

async function hoofden() {
  for (const [naam, dir, file, knoop] of HOOFDEN) {
    const doc = await io.read(path.join(BRON, dir, file));
    for (const a of doc.getRoot().listAnimations()) dropAnim(a);
    for (const n of doc.getRoot().listNodes()) if (n.getMesh() && n.getName() !== knoop) { n.getMesh().dispose(); n.dispose(); }
    await optimize(doc, { skinned: true });
    const s = await write(doc, `personages/hoofd-${naam}.glb`);
    totaal += s; console.log('hoofd', naam, kb(s));
  }
}

async function dieren() {
  for (const [naam, dir, file, keep] of DIEREN) {
    const doc = await io.read(path.join(BRON, dir, file));
    const alle = doc.getRoot().listAnimations().map((a) => a.getName());
    for (const a of doc.getRoot().listAnimations()) if (!keep.includes(a.getName())) dropAnim(a);
    await doc.transform(resample(), dedup(), prune(), unpartition(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
    const s = await write(doc, `dieren/${naam}.glb`);
    totaal += s; console.log('dier', naam, kb(s), '(bron-animaties:', alle.join(','), ')');
  }
}

async function kits() {
  for (const [kit, items] of Object.entries(KITS)) {
    const target = new Document();
    target.createBuffer();
    const scene = target.createScene(kit);
    for (const [naam, dir, file] of items) {
      const src = await readSource(dir, file);
      // alles onder één knoop met de modelnaam
      const srcScene = src.getRoot().getDefaultScene() ?? src.getRoot().listScenes()[0];
      const groep = src.createNode(naam);
      for (const c of srcScene.listChildren()) { srcScene.removeChild(c); groep.addChild(c); }
      srcScene.addChild(groep);
      const map = mergeDocuments(target, src);
      const merged = map.get(srcScene);
      for (const c of merged.listChildren()) scene.addChild(c);
      merged.dispose();
    }
    target.getRoot().setDefaultScene(scene);
    await optimize(target);
    const s = await write(target, `${kit}.glb`);
    totaal += s; console.log('kit', kit, items.length, 'modellen', kb(s));
  }
}

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
fs.mkdirSync(UIT, { recursive: true });
const alleen = process.argv[2];
if (!alleen || alleen === 'personages') await personages();
if (!alleen || alleen === 'hoofden') await hoofden();
if (!alleen || alleen === 'dieren') await dieren();
if (!alleen || alleen === 'kits') await kits();
console.log('totaal', kb(totaal));
