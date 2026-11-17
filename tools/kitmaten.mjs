// Ontwikkelhulp: afmetingen (b×h×d) per model in een kit.  node tools/kitmaten.mjs meubels
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
for (const kit of process.argv.slice(2)) {
  const doc = await io.read(`public/assets/modellen/${kit}.glb`);
  const rij = [];
  for (const top of doc.getRoot().getDefaultScene().listChildren()) {
    const { min, max } = getBounds(top);
    const mats = new Set(); top.traverse((n) => n.getMesh()?.listPrimitives().forEach((p) => mats.add(p.getMaterial().getName())));
    rij.push(`${top.getName().padEnd(18)} ${(max[0] - min[0]).toFixed(2)}×${(max[1] - min[1]).toFixed(2)}×${(max[2] - min[2]).toFixed(2)}  ${[...mats].join(',')}`);
  }
  console.log(rij.join('\n'));
}
