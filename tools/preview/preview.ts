// Ontwikkelhulp (niet in de build): toont alle modellen van een kit in een raster.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const q = new URLSearchParams(location.search);
const kit = q.get('kit') ?? 'meubels';
const r = new THREE.WebGLRenderer({ antialias: true });
r.setSize(innerWidth, innerHeight); document.body.appendChild(r.domElement);
const s = new THREE.Scene(); s.background = new THREE.Color('#EAF0FF');
s.add(new THREE.HemisphereLight('#fff', '#999', 2)); const d = new THREE.DirectionalLight('#fff', 2); d.position.set(3, 8, 6); s.add(d);
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const gltf = await loader.loadAsync(`/public/assets/modellen/${kit}.glb`);
const items = [...gltf.scene.children];
const cols = Math.ceil(Math.sqrt(items.length * 1.6));
const cam = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 500);
const labels: [THREE.Vector3, string][] = [];
items.forEach((o, i) => {
  const box = new THREE.Box3().setFromObject(o); const size = box.getSize(new THREE.Vector3());
  const sc = 1 / Math.max(size.x, size.y, size.z);
  const g = new THREE.Group(); g.add(o); o.position.sub(box.getCenter(new THREE.Vector3())).setY(o.position.y - box.min.y);
  g.scale.setScalar(sc); g.position.set((i % cols) * 1.4, 0, Math.floor(i / cols) * 1.6); s.add(g);
  labels.push([g.position.clone().setZ(g.position.z + 0.55), `${o.name} ${size.x.toFixed(2)}×${size.y.toFixed(2)}×${size.z.toFixed(2)}`]);
});
const rows = Math.ceil(items.length / cols);
const c = new THREE.Vector3((cols - 1) * 0.7, 0, (rows - 1) * 0.8);
cam.position.set(c.x, Math.max(cols, rows) * 1.5, c.z + Math.max(cols, rows) * 1.5); cam.lookAt(c);
r.render(s, cam);
const L = document.getElementById('l')!;
for (const [p, t] of labels) { const v = p.project(cam); const e = document.createElement('div'); e.textContent = t; e.style.left = `${(v.x + 1) / 2 * innerWidth}px`; e.style.top = `${(1 - v.y) / 2 * innerHeight}px`; L.appendChild(e); }
(window as any).klaar = true;
