// Hulppagina voor tools/autos.mjs: splitst de Generic passenger car pack (Comrade1280, CC-BY) in losse auto's.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const BRON = '/tools/bron-assets/autos/generic_passenger_car_pack.glb';

/** Laadt de pack en geeft per auto een groep: carrosserie + de 4 dichtstbijzijnde wielen, in de ruimte van de carrosserie. */
async function splits(): Promise<Map<string, THREE.Group>> {
  const g = await new GLTFLoader().loadAsync(BRON);
  g.scene.updateMatrixWorld(true);
  const lijf: THREE.Object3D[] = [], wielen: THREE.Object3D[] = [];
  g.scene.traverse((o) => {
    if (/[ _]body$/i.test(o.name) && o.children.length) lijf.push(o);
    else if (/^Wheel_[A-Z]\d*(_\d+)?$/.test(o.name) && !(o as THREE.Mesh).isMesh) wielen.push(o);
  });
  const uit = new Map<string, THREE.Group>();
  const pos = (o: THREE.Object3D) => o.getWorldPosition(new THREE.Vector3());
  // elk wiel hoort bij de dichtstbijzijnde carrosserie (gemeten vanaf het midden van de carrosserie)
  const midden = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
  const lm = new Map(lijf.map((l) => [l, midden(l)]));
  const perLijf = new Map(lijf.map((l) => [l, [] as THREE.Object3D[]]));
  for (const w of wielen) {
    const p = pos(w);
    const best = lijf.reduce((a, b) => (lm.get(a)!.distanceTo(p) <= lm.get(b)!.distanceTo(p) ? a : b));
    perLijf.get(best)!.push(w);
  }
  for (const l of lijf) {
    const mijn = perLijf.get(l)!;
    // alles in de ruimte van de carrosserie (z omhoog, in cm)
    const inv = l.matrixWorld.clone().invert();
    const groep = new THREE.Group();
    for (const o of [l, ...mijn]) {
      const kopie = o.clone(true);
      inv.clone().multiply(o.matrixWorld).decompose(kopie.position, kopie.quaternion, kopie.scale);
      groep.add(kopie);
    }
    // lengteas uit de wielen (xy-vlak), zodat ook een scheef gemodelleerde auto recht komt
    const wp = groep.children.slice(1).map((w) => w.position);
    const c = wp.reduce((a, b) => a.clone().add(b), new THREE.Vector3()).divideScalar(Math.max(1, wp.length));
    let sxx = 0, syy = 0, sxy = 0;
    for (const p of wp) { const dx = p.x - c.x, dy = p.y - c.y; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
    const hoek = 0.5 * Math.atan2(2 * sxy, sxx - syy); // lange as t.o.v. +x
    const recht = new THREE.Group();
    recht.add(groep);
    groep.rotation.z = Math.PI / 2 - hoek; // lange as langs +y
    groep.position.set(0, 0, 0);
    // z-omhoog → y-omhoog: +y (lengte) wordt -z
    const yop = new THREE.Group();
    yop.rotation.x = -Math.PI / 2;
    yop.add(recht);
    const s = new THREE.Vector3(); l.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), s);
    yop.scale.setScalar(s.x);
    const buiten = new THREE.Group();
    buiten.name = l.name.replace(/[ _]body$/i, '').toLowerCase();
    buiten.add(yop);
    buiten.updateMatrixWorld(true);
    // voorkant (koplampen: materiaal Optics, het stuk dat het verst naar voren of achter zit) naar +z
    const gb = new THREE.Box3().setFromObject(buiten);
    let optics: THREE.Object3D | null = null;
    buiten.traverse((o) => { if (/Optics/i.test(o.name) && (o as THREE.Mesh).isMesh) optics = o; });
    if (optics) {
      const ob = new THREE.Box3().setFromObject(optics);
      const midden = (gb.min.z + gb.max.z) / 2;
      // de koplampen zitten meestal verder van het midden dan de achterlichten; we kijken naar het zwaartepunt van de vertices
      const pos = ((optics as THREE.Mesh).geometry.getAttribute('position'));
      let vz = 0; const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4((optics as THREE.Mesh).matrixWorld); vz += v.z; }
      vz /= pos.count;
      void ob;
      if (vz < midden) buiten.rotation.y = Math.PI;
    }
    uit.set(buiten.name, buiten);
  }
  return uit;
}

(window as any).overzicht = async () => {
  const autos = await splits();
  const r = new THREE.WebGLRenderer({ antialias: true });
  r.setSize(1600, 900); document.body.appendChild(r.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#cfd8e6');
  scene.add(new THREE.HemisphereLight('#fff', '#776', 1.6));
  const zon = new THREE.DirectionalLight('#fff', 2.2); zon.position.set(3, 6, 4); scene.add(zon);
  const info: string[] = [];
  let i = 0;
  for (const [naam, a] of autos) {
    a.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(a), m = b.getSize(new THREE.Vector3());
    let nw = 0; a.traverse((o) => { if (/^Wheel_/.test(o.name) && !o.isMesh && o.parent?.parent?.parent?.parent === a) nw++; });
    info.push(`${naam}: ${m.x.toFixed(2)} x ${m.y.toFixed(2)} x ${m.z.toFixed(2)} wielen ${a.children[0].children[0].children[0].children.length - 1}`);
    const c = b.getCenter(new THREE.Vector3());
    a.position.set((i % 5) * 5.5 - 11 - c.x, -b.min.y, Math.floor(i / 5) * 6 - 3 - c.z);
    scene.add(a); i++;
  }
  const cam = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 200); cam.position.set(0, 14, 24); cam.lookAt(0, 0, 0);
  r.render(scene, cam);
  return info;
};

async function naarGlb(o: THREE.Object3D | THREE.Object3D[]): Promise<string> {
  const buf = (await new GLTFExporter().parseAsync(o, { binary: true })) as ArrayBuffer;
  let s = ''; const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}
(window as any).naarGlb = naarGlb;

/** Overspuiten: de lakkleur (meest voorkomende verzadigde tint in de carrosserietextuur) wordt de nieuwe kleur, met behoud van schaduw en glans. */
function spuit(img: CanvasImageSource, maat: number, lak: string | null): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = maat;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, maat, maat);
  if (!lak) return c;
  const data = ctx.getImageData(0, 0, maat, maat), d = data.data;
  const hsl = { h: 0, s: 0, l: 0 }, kl = new THREE.Color();
  const bak = new Array(36).fill(0);
  for (let i = 0; i < d.length; i += 4) { kl.setRGB(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255).getHSL(hsl); if (hsl.s > 0.3 && hsl.l > 0.08 && hsl.l < 0.9) bak[Math.floor(hsl.h * 36) % 36]++; }
  const top = bak.indexOf(Math.max(...bak)), h0 = (top + 0.5) / 36;
  const past = (h: number, s: number, l: number) => { const dh = Math.min(Math.abs(h - h0), 1 - Math.abs(h - h0)); return dh < 0.07 && s > 0.2 && l > 0.04; };
  let som = 0, n = 0;
  const lum = (i: number) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  for (let i = 0; i < d.length; i += 4) { kl.setRGB(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255).getHSL(hsl); if (past(hsl.h, hsl.s, hsl.l)) { som += lum(i); n++; } }
  const gem = som / Math.max(1, n), doel = new THREE.Color(lak);
  for (let i = 0; i < d.length; i += 4) {
    kl.setRGB(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255).getHSL(hsl);
    if (!past(hsl.h, hsl.s, hsl.l)) continue;
    const f = Math.min(1.35, lum(i) / gem);
    d[i] = Math.min(255, doel.r * 255 * f); d[i + 1] = Math.min(255, doel.g * 255 * f); d[i + 2] = Math.min(255, doel.b * 255 * f);
  }
  ctx.putImageData(data, 0, 0);
  console.log(`LAK ${lak}: tint ${Math.round(h0 * 360)}°, ${n} px`);
  return c;
}

/**
 * Bouwt de kit: per auto één groep met één mesh per materiaal (carrosserie, glas, lampen, wielen),
 * oorsprong midden onder, voorkant naar +z, in meters.
 */
(window as any).bouw = async (lijst: { bron: string; naam: string; lak: string | null; draai: boolean }[], maat: number) => {
  const autos = await splits();
  const kit = new THREE.Group();
  for (const it of lijst) {
    const bron = autos.get(it.bron);
    if (!bron) { console.error('onbekend: ' + it.bron); continue; }
    const auto = bron.clone(true);
    if (it.draai) auto.rotation.y += Math.PI;
    auto.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(auto), c = box.getCenter(new THREE.Vector3());
    const naarOorsprong = new THREE.Matrix4().makeTranslation(-c.x, -box.min.y, -c.z);
    const perMat = new Map<THREE.Material, THREE.BufferGeometry[]>();
    auto.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const g = m.geometry.clone().applyMatrix4(naarOorsprong.clone().multiply(m.matrixWorld));
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      const mat = m.material as THREE.Material;
      perMat.set(mat, [...(perMat.get(mat) ?? []), g]);
    });
    const groep = new THREE.Group();
    groep.name = it.naam;
    for (const [mat, geos] of perMat) {
      const geo = geos.length === 1 ? geos[0] : mergeGeometries(geos.map((g) => (g.index ? g : g)), false);
      const nieuw = (mat as THREE.MeshStandardMaterial).clone();
      const isLak = /^Body/.test(mat.name);
      if (nieuw.map) {
        const t = new THREE.CanvasTexture(spuit(nieuw.map.image, maat, isLak ? it.lak : null));
        t.colorSpace = THREE.SRGBColorSpace; t.flipY = nieuw.map.flipY; t.userData.mimeType = 'image/jpeg';
        nieuw.map = t;
      }
      // kleinere ruwheid-/metaalkaarten (gltf-transform verkleint ze verder)
      const mesh = new THREE.Mesh(geo, nieuw);
      mesh.name = `${it.naam}-${mat.name.replace(/_\d+$/, '').toLowerCase()}`;
      groep.add(mesh);
    }
    kit.add(groep);
  }
  return naarGlb([...kit.children]);
};

(window as any).splits = splits;
(window as any).klaar = true;

(window as any).toonKit = async () => {
  const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
  const g = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('/public/assets/modellen/voertuigen.glb');
  const r = new THREE.WebGLRenderer({ antialias: true });
  r.setSize(1600, 900); document.body.appendChild(r.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#cfd8e6');
  scene.add(new THREE.HemisphereLight('#fff', '#776', 1.5));
  const zon = new THREE.DirectionalLight('#fff', 2.2); zon.position.set(4, 6, 5); scene.add(zon);
  const info: string[] = [];
  const lijst = g.scene.children.length === 1 && !g.scene.children[0].name ? [...g.scene.children[0].children] : [...g.scene.children];
  lijst.forEach((a, i) => {
    const b = new THREE.Box3().setFromObject(a), m = b.getSize(new THREE.Vector3());
    info.push(`${a.name}: ${m.x.toFixed(2)} x ${m.y.toFixed(2)} x ${m.z.toFixed(2)}, ${a.children.length} meshes`);
    a.position.set((i % 4) * 4.2 - 6.3, 0, Math.floor(i / 4) * 6 - 3);
    a.rotation.y = 0.6;
    scene.add(a);
  });
  const cam = new THREE.PerspectiveCamera(32, 16 / 9, 0.1, 200); cam.position.set(2, 9, 17); cam.lookAt(0, 0, 0);
  r.render(scene, cam);
  return info;
};

/** Zijaanzicht (orthografisch) van één auto uit de kit, met raster per 10 cm (voor het plaatsen van een logo). */
(window as any).zij = async (naam: string, kant = 1) => {
  const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
  const g = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync('/public/assets/modellen/voertuigen.glb');
  const auto = g.scene.getObjectByName(naam)!;
  const r = new THREE.WebGLRenderer({ antialias: true });
  r.setSize(1600, 600); document.body.appendChild(r.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#cfd8e6');
  scene.add(new THREE.HemisphereLight('#fff', '#776', 2));
  const zon = new THREE.DirectionalLight('#fff', 1.5); zon.position.set(kant * 5, 3, 2); scene.add(zon);
  scene.add(auto);
  const b = new THREE.Box3().setFromObject(auto);
  // rasterlijnen in het zijvlak (z horizontaal, y verticaal), elke 10 cm; elke halve meter donkerder
  const lijnen: number[] = [], dik: number[] = [];
  for (let z = Math.floor(b.min.z * 10) / 10; z <= b.max.z + 1e-6; z += 0.1) (Math.abs(z * 2 - Math.round(z * 2)) < 1e-3 ? dik : lijnen).push(kant * 1.5, 0, z, kant * 1.5, b.max.y, z);
  for (let y = 0; y <= b.max.y + 1e-6; y += 0.1) (Math.abs(y * 2 - Math.round(y * 2)) < 1e-3 ? dik : lijnen).push(kant * 1.5, y, b.min.z, kant * 1.5, y, b.max.z);
  const lg = (l: number[], c: string, o: number) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(l, 3)); return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: o, depthTest: false })); };
  scene.add(lg(lijnen, '#ff0000', 0.25), lg(dik, '#ff0000', 0.8));
  const h = b.max.y + 0.1, w = h * 1600 / 600;
  const cam = new THREE.OrthographicCamera(-w / 2, w / 2, h, -0.05, 0.1, 20);
  cam.position.set(kant * 6, 0, (b.min.z + b.max.z) / 2); cam.lookAt(0, 0, (b.min.z + b.max.z) / 2);
  r.render(scene, cam);
  return { min: b.min.toArray(), max: b.max.toArray() };
};

/** Algemene kijker: alle wortelknopen van een kit naast elkaar, op ware grootte. */
(window as any).toonGlb = async (url: string, afstand = 6) => {
  const { MeshoptDecoder } = await import('three/examples/jsm/libs/meshopt_decoder.module.js');
  const g = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
  const r = new THREE.WebGLRenderer({ antialias: true });
  r.setSize(1600, 900); document.body.appendChild(r.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#cfd8e6');
  scene.add(new THREE.HemisphereLight('#fff', '#776', 1.6));
  const zon = new THREE.DirectionalLight('#fff', 2); zon.position.set(3, 5, 4); scene.add(zon);
  const lijst = [...g.scene.children];
  const info: string[] = [];
  let x = 0;
  lijst.forEach((a) => {
    const b = new THREE.Box3().setFromObject(a), m = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
    info.push(`${a.name}: ${m.x.toFixed(2)} x ${m.y.toFixed(2)} x ${m.z.toFixed(2)}`);
    // schaal naar ±1,8 m breed (sommige modellen zijn in cm); ware grootte als ?echt
    const s = (window as any).ECHT ? 1 : 1.8 / Math.max(m.x, m.z);
    a.scale.multiplyScalar(s);
    a.position.set(x - c.x * s, -b.min.y * s, -c.z * s);
    x += 2.4;
    scene.add(a);
  });
  const cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 100);
  cam.position.set((x - 2.4) / 2 + 0.5, 1.6, afstand); cam.lookAt((x - 2.4) / 2, 0.5, 0);
  r.render(scene, cam);
  return info;
};
