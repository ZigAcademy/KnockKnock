// Proefbeeld: Rocketbox-personages met gedeelde animaties (tools/rocketbox.mjs).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
const r = new THREE.WebGLRenderer({ antialias: true });
r.setSize(1200, 700); document.body.appendChild(r.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color('#cfd8e6');
scene.add(new THREE.HemisphereLight('#ffffff', '#887766', 1.4));
const zon = new THREE.DirectionalLight('#ffffff', 2); zon.position.set(2, 4, 3); scene.add(zon);
const cam = new THREE.PerspectiveCamera(35, 1200 / 700, 0.1, 50); cam.position.set(0, 1.2, Number(new URLSearchParams(location.search).get("z") ?? 6)); cam.lookAt(0, 0.95, 0);
const l = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const mixers: THREE.AnimationMixer[] = [];
(window as any).toon = async (lijst: { id: string; sekse: string; anim: string; x: number; t: number }[]) => {
  for (const d of lijst) {
    const [g, a] = await Promise.all([l.loadAsync(`/public/assets/modellen/mensen/${d.id}.glb`), l.loadAsync(`/public/assets/modellen/mensen/anim-${d.sekse}.glb`)]);
    const o = g.scene;
    const box = new THREE.Box3().setFromObject(o); const h = box.max.y - box.min.y;
    o.scale.multiplyScalar(1.72 / h); o.position.x = d.x;
    scene.add(o);
    const mx = new THREE.AnimationMixer(o);
    const clip = a.animations.find((c) => c.name === d.anim)!;
    mx.clipAction(clip).play(); mx.setTime(d.t);
    mixers.push(mx);
    (window as any).info = { h, clips: a.animations.map((c) => c.name + ':' + c.tracks.length) };
  }
  r.render(scene, cam);
  return (window as any).info;
};
