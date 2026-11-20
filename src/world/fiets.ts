import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { kitModel } from '../assets/modellen';

/**
 * Nederlandse stadsfiets, opgebouwd in code (er is geen geschikte vrije fiets): ronde buizen, 28"-wielen
 * met spaken (alfa-textuur), chroom velg, spatborden, kettingkast, bagagedrager, gebogen stuur, zadel
 * en standaard. Oorsprong op de grond tussen de wielen, rijrichting +x. Geometrie wordt gedeeld tussen
 * alle fietsen; per lakkleur één materiaal. Vier draw calls per fiets.
 */
const R = 0.34; // wielstraal (28 inch)
const ACH = new THREE.Vector3(-0.55, R, 0), VOOR = new THREE.Vector3(0.55, R, 0);

function buis(a: THREE.Vector3, b: THREE.Vector3, r: number): THREE.BufferGeometry {
  const d = b.clone().sub(a), len = d.length();
  const g = new THREE.CylinderGeometry(r, r, len, 10, 1, false);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}
const v = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
const schoon = (g: THREE.BufferGeometry) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); return n; };
const samen = (gs: THREE.BufferGeometry[]) => mergeGeometries(gs.map(schoon), false)!;

let gedeeld: { frame: THREE.BufferGeometry; zwart: THREE.BufferGeometry; chroom: THREE.BufferGeometry; spaken: THREE.BufferGeometry; mats: { zwart: THREE.Material; chroom: THREE.Material; spaken: THREE.Material } } | null = null;

function bouwGedeeld(): NonNullable<typeof gedeeld> {
  // --- frame (damesmodel: lage instap), in lakkleur
  const BB = v(-0.06, 0.3), ST = v(-0.2, 0.86), HT = v(0.42, 0.9), HB = v(0.47, 0.66);
  const frame = [
    buis(BB, ST.clone().lerp(BB, -0.06), 0.017),          // zadelbuis
    buis(BB, HB, 0.02),                                     // lage buis
    buis(v(-0.02, 0.4), v(0.44, 0.8), 0.016),               // tweede buis
    buis(HB, HT, 0.022),                                    // balhoofd
    buis(BB, ACH, 0.011).translate(0, 0, 0.04), buis(BB, ACH, 0.011).translate(0, 0, -0.04), // liggende achtervork
    buis(v(-0.19, 0.8, 0.03), ACH.clone().setZ(0.04), 0.01), buis(v(-0.19, 0.8, -0.03), ACH.clone().setZ(-0.04), 0.01), // staande achtervork
    buis(HB.clone().setZ(0.04), VOOR.clone().setZ(0.045), 0.012), buis(HB.clone().setZ(-0.04), VOOR.clone().setZ(-0.045), 0.012), // voorvork
  ];
  // spatborden (boog boven elk wiel) en kettingkast, ook in lakkleur
  for (const as of [ACH, VOOR]) {
    const g = new THREE.CylinderGeometry(R + 0.035, R + 0.035, 0.05, 28, 1, true, -Math.PI * 0.55, Math.PI * 1.1);
    g.rotateX(Math.PI / 2).rotateZ(as === ACH ? 0.25 : -0.25).translate(as.x, as.y, 0);
    frame.push(g);
  }
  frame.push(new THREE.BoxGeometry(0.62, 0.09, 0.03).rotateZ(-0.06).translate(-0.3, 0.33, 0.07));
  // --- zwart: banden, zadel, handvatten, standaard, pedalen
  const zwart: THREE.BufferGeometry[] = [];
  for (const as of [ACH, VOOR]) zwart.push(new THREE.TorusGeometry(R - 0.018, 0.02, 10, 40).translate(as.x, as.y, 0));
  zwart.push(new THREE.SphereGeometry(0.08, 14, 8).scale(1.5, 0.38, 0.85).translate(-0.24, 0.97, 0));
  for (const z of [-0.27, 0.27]) zwart.push(buis(v(0.27, 1.03, z), v(0.27, 1.03, z * 1.35), 0.018));
  zwart.push(buis(v(-0.06, 0.3, -0.06), v(-0.2, 0.03, -0.18), 0.009));
  for (const z of [-0.14, 0.14]) zwart.push(new THREE.BoxGeometry(0.09, 0.02, 0.07).translate(-0.06 + (z > 0 ? 0.1 : -0.1), 0.3 + (z > 0 ? -0.05 : 0.05), z));
  // --- chroom: velgen, naven, stuur, zadelpen, bagagedrager, lamp
  const chroom: THREE.BufferGeometry[] = [];
  for (const as of [ACH, VOOR]) {
    chroom.push(new THREE.TorusGeometry(R - 0.045, 0.011, 6, 40).translate(as.x, as.y, 0));
    chroom.push(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 10).rotateX(Math.PI / 2).translate(as.x, as.y, 0));
  }
  chroom.push(buis(HT, v(0.4, 1.02), 0.013));                                 // stuurpen
  const stuur = new THREE.CatmullRomCurve3([v(0.27, 1.03, -0.27), v(0.36, 1.03, -0.2), v(0.4, 1.02, 0), v(0.36, 1.03, 0.2), v(0.27, 1.03, 0.27)]);
  chroom.push(new THREE.TubeGeometry(stuur, 16, 0.012, 8, false));
  chroom.push(buis(ST, v(-0.235, 0.95), 0.012));                              // zadelpen
  // bagagedrager
  for (const z of [-0.06, 0.06]) { chroom.push(buis(v(-0.78, 0.8, z), v(-0.32, 0.8, z), 0.008)); chroom.push(buis(v(-0.7, 0.8, z), ACH.clone().setZ(z), 0.007)); }
  for (let k = 0; k < 4; k++) chroom.push(buis(v(-0.76 + k * 0.13, 0.8, -0.06), v(-0.76 + k * 0.13, 0.8, 0.06), 0.006));
  chroom.push(new THREE.CylinderGeometry(0.035, 0.03, 0.06, 12).rotateZ(Math.PI / 2).translate(0.5, 0.78, 0)); // koplamp
  // --- spaken: schijf met alfa-textuur in elk wiel
  const spaken = samen([ACH, VOOR].map((as) => new THREE.CircleGeometry(R - 0.05, 32).translate(as.x, as.y, 0)));
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const k = c.getContext('2d')!;
  k.strokeStyle = '#ffffff'; k.lineWidth = 2;
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2, b = a + (i % 2 ? 0.35 : -0.35);
    k.beginPath(); k.moveTo(128 + Math.cos(b) * 10, 128 + Math.sin(b) * 10); k.lineTo(128 + Math.cos(a) * 126, 128 + Math.sin(a) * 126); k.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  const mats = {
    zwart: new THREE.MeshStandardMaterial({ color: '#1C1D20', roughness: 0.85 }),
    chroom: new THREE.MeshStandardMaterial({ color: '#C9CDD2', roughness: 0.28, metalness: 0.9 }),
    spaken: new THREE.MeshStandardMaterial({ color: '#B9BEC4', map: tex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.4, metalness: 0.7 }),
  };
  return { frame: samen(frame), zwart: samen(zwart), chroom: samen(chroom), spaken, mats };
}

/**
 * "Retro bike" door annzep (Sketchfab, CC BY 4.0; tools/fietsen.mjs): een omafiets met mandje. Het frame
 * (materialen phong4/phong8, mintgroen) krijgt per fiets een eigen kleur. Genormaliseerd: rijrichting +x,
 * 1,75 m lang, wielen op de grond.
 */
const FRAME = ['phong4', 'phong8'];
type Model = { delen: { geo: THREE.BufferGeometry; mat: THREE.Material; frame: boolean }[]; m: THREE.Matrix4 };
const modellen = new Map<string, Model | null>();
const restMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.4 });
const retroLak = new Map<string, Map<THREE.Material, THREE.Material>>();
/** Eén gedeeld framemateriaal per bronmateriaal (glanzend), waarvan de kleurvarianten afstammen (voor het bundelen). */
const primair = new Map<THREE.Material, THREE.MeshStandardMaterial>();
const framePrimair = (m: THREE.Material) => { let p = primair.get(m); if (!p) { p = (m as THREE.MeshStandardMaterial).clone(); p.roughness = 0.35; p.metalness = 0.3; primair.set(m, p); } return p; };
/** soort: 'fiets-retro' (omafiets, frame in eigen kleur) of 'fiets-mtb' ("Bike" door T-FLEX CAD ST, CC BY 4.0; gele mountainbike). */
function kitFiets(kleur: string, soort: string): THREE.Group | null {
  if (!modellen.has(soort)) {
    const bron = kitModel('fietsen', soort);
    if (!bron) { modellen.set(soort, null); return null; }
    const k = bron.clone(true);
    k.position.set(0, 0, 0); k.rotation.set(0, 0, 0); k.scale.set(1, 1, 1);
    k.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(k), s = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const langsZ = s.z > s.x, lengte = Math.max(s.x, s.z);
    const sc = 1.75 / lengte;
    // naar de oorsprong, op de grond, lengte langs x
    const m = new THREE.Matrix4().makeRotationY(langsZ ? Math.PI / 2 : 0).multiply(new THREE.Matrix4().makeScale(sc, sc, sc)).multiply(new THREE.Matrix4().makeTranslation(-c.x, -box.min.y, -c.z));
    const delen: { geo: THREE.BufferGeometry; mat: THREE.Material; frame: boolean }[] = [];
    k.traverse((o) => {
      const me = o as THREE.Mesh;
      if (!me.isMesh) return;
      // gecomprimeerde (16-bit) attributen eerst naar float, anders lopen ze over bij het transformeren
      const geo = me.geometry.clone();
      for (const naam of Object.keys(geo.attributes)) {
        const a = geo.getAttribute(naam) as THREE.BufferAttribute;
        if (a.array instanceof Float32Array) continue;
        const f = new Float32Array(a.count * a.itemSize);
        for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) f[i * a.itemSize + c] = a.getComponent(i, c);
        geo.setAttribute(naam, new THREE.BufferAttribute(f, a.itemSize));
      }
      geo.applyMatrix4(me.matrixWorld);
      const mat = me.material as THREE.Material;
      delen.push({ geo, mat, frame: FRAME.includes(mat.name) });
    });
    // weinig draw calls: alle frame-delen samen, en alle overige delen samen met vertexkleuren
    // (de kleur van hun materiaal; getextureerde delen, zoals het mandje, houden hun eigen materiaal)
    const kaal = (g: THREE.BufferGeometry, kleur?: THREE.Color) => {
      const n = g.index ? g.toNonIndexed() : g.clone();
      for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
      if (!n.getAttribute('uv')) n.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n.getAttribute('position').count * 2), 2));
      if (kleur) { const c = new Float32Array(n.getAttribute('position').count * 3); for (let i = 0; i < c.length; i += 3) { c[i] = kleur.r; c[i + 1] = kleur.g; c[i + 2] = kleur.b; } n.setAttribute('color', new THREE.BufferAttribute(c, 3)); }
      return n;
    };
    const frame = delen.filter((d) => d.frame), getextureerd = delen.filter((d) => !d.frame && (d.mat as THREE.MeshStandardMaterial).map), rest = delen.filter((d) => !d.frame && !(d.mat as THREE.MeshStandardMaterial).map);
    const samen: typeof delen = [];
    if (frame.length) samen.push({ geo: mergeGeometries(frame.map((d) => kaal(d.geo)))!, mat: frame[0].mat, frame: true });
    for (const d of getextureerd) samen.push(d);
    if (rest.length) samen.push({ geo: mergeGeometries(rest.map((d) => kaal(d.geo, (d.mat as THREE.MeshStandardMaterial).color)))!, mat: restMat, frame: false });
    modellen.set(soort, { delen: samen, m });
  }
  const retro = modellen.get(soort);
  if (!retro) return null;
  let lak = retroLak.get(kleur);
  if (!lak) { lak = new Map(); retroLak.set(kleur, lak); }
  const g = new THREE.Group();
  g.name = 'fiets';
  const binnen = new THREE.Group();
  binnen.matrixAutoUpdate = false;
  binnen.matrix.copy(retro.m);
  for (const d of retro.delen) {
    let mat = d.mat;
    if (d.frame) {
      mat = lak.get(d.mat) ?? (() => { const n = (d.mat as THREE.MeshStandardMaterial).clone(); n.color.set(kleur); n.roughness = 0.35; n.metalness = 0.3; n.userData.basis = framePrimair(d.mat); lak!.set(d.mat, n); return n; })();
    }
    const me = new THREE.Mesh(d.geo, mat);
    me.castShadow = true; me.receiveShadow = true;
    binnen.add(me);
  }
  g.add(binnen);
  return g;
}

const lakken = new Map<string, THREE.Material>();
/** Nieuwe fiets: de retrofiets als die geladen is, anders de fiets uit code. Op de standaard, licht scheef. */
export function fietsMesh(kleur: string, soort: 'fiets-retro' | 'fiets-mtb' = 'fiets-retro'): THREE.Group {
  const echt = kitFiets(kleur, soort) ?? kitFiets(kleur, 'fiets-retro');
  if (echt) { const h = new THREE.Group(); echt.rotation.x = 0.05; h.add(echt); h.name = 'fiets'; h.userData.bundel = true; return h; }
  gedeeld ??= bouwGedeeld();
  let lak = lakken.get(kleur);
  if (!lak) { lak = new THREE.MeshStandardMaterial({ color: kleur, roughness: 0.35, metalness: 0.35 }); lakken.set(kleur, lak); }
  const g = new THREE.Group();
  g.name = 'fiets';
  for (const [geo, mat] of [[gedeeld.frame, lak], [gedeeld.zwart, gedeeld.mats.zwart], [gedeeld.chroom, gedeeld.mats.chroom], [gedeeld.spaken, gedeeld.mats.spaken]] as const) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = mat !== gedeeld.mats.spaken; m.receiveShadow = true;
    g.add(m);
  }
  // op de standaard: een paar graden naar links
  const houder = new THREE.Group();
  g.rotation.x = 0.06;
  houder.add(g);
  return houder;
}
