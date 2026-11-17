// Ontwikkelhulp: materiaalnamen + kleur per model in een kit.  node tools/kitmats.mjs natuur
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
for (const kit of process.argv.slice(2)) {
  const doc = await io.read(`public/assets/modellen/${kit}.glb`);
  for (const top of doc.getRoot().getDefaultScene().listChildren()) {
    const mats = new Set();
    top.traverse((n) => n.getMesh()?.listPrimitives().forEach((p) => { const m = p.getMaterial(); const c = m.getBaseColorFactor().slice(0, 3).map((v) => Math.round(Math.pow(v, 1 / 2.2) * 255).toString(16).padStart(2, '0')).join(''); mats.add(`${m.getName()}#${c}${p.getAttribute('COLOR_0') ? '+vc' : ''}`); }));
    console.log(kit, top.getName().padEnd(18), [...mats].join(' '));
  }
}
