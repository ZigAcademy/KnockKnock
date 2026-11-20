// Hulppagina voor tools/rocketbox.mjs: zet Rocketbox-FBX (Microsoft, MIT) om naar GLB in de browser (three.js).
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const fbx = new FBXLoader();
// FBXLoader probeert de .tga's te laden; die vervangen we toch
THREE.DefaultLoadingManager.setURLModifier((u) => (/\.(tga|png|jpg)$/i.test(u) && !u.includes('/rocketbox/') ? 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' : u));

/**
 * Kleding verven: pixels binnen een tint-/verzadigings-/lichtheidsbereik krijgen een nieuwe kleur.
 * De helderheid per pixel blijft relatief gelijk (plooien en stofstructuur blijven zichtbaar).
 */
export interface Verf { tex: 'body' | 'head' | 'opacity'; tint?: [number, number]; sat?: [number, number]; licht?: [number, number]; naar: string;
  /** Gebieden (0–1, x0 y0 x1 y1) die niet geverfd worden, bijv. ogen en tanden. */
  behalve?: [number, number, number, number][] }
function hsl(r: number, g: number, b: number): [number, number, number] {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function verf(ctx: CanvasRenderingContext2D, maat: number, regels: Verf[]): void {
  if (!regels.length) return;
  const img = ctx.getImageData(0, 0, maat, maat), d = img.data;
  for (const r of regels) {
    const past = (i: number) => {
      if (d[i + 3] < 20) return false;
      if (r.behalve) { const p = i / 4, x = (p % maat) / maat, y = Math.floor(p / maat) / maat; if (r.behalve.some(([a, b, c, e]) => x >= a && x <= c && y >= b && y <= e)) return false; }
      const [h, s, l] = hsl(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255);
      const inTint = !r.tint || (r.tint[0] <= r.tint[1] ? h >= r.tint[0] && h <= r.tint[1] : h >= r.tint[0] || h <= r.tint[1]);
      return inTint && (!r.sat || (s >= r.sat[0] && s <= r.sat[1])) && (!r.licht || (l >= r.licht[0] && l <= r.licht[1]));
    };
    const lum = (i: number) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    let som = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) if (past(i)) { som += lum(i); n++; }
    if (!n) continue;
    const gem = som / n, c = new THREE.Color(r.naar);
    for (let i = 0; i < d.length; i += 4) if (past(i)) {
      const f = Math.min(1.6, lum(i) / gem);
      d[i] = Math.min(255, c.r * 255 * f); d[i + 1] = Math.min(255, c.g * 255 * f); d[i + 2] = Math.min(255, c.b * 255 * f);
    }
    console.log(`MAT verf ${r.tex} -> ${r.naar}: ${n} px`);
  }
  ctx.putImageData(img, 0, 0);
}

async function textuur(pad: string, maat: number, mime: string, regels: Verf[] = []): Promise<THREE.Texture> {
  const img = await createImageBitmap(await (await fetch(pad)).blob());
  const c = document.createElement('canvas');
  c.width = c.height = maat;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, maat, maat);
  verf(ctx, maat, regels);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = true; // FBX-uv; GLTFExporter draait het beeld zelf om
  t.userData.mimeType = mime;
  return t;
}

async function naarGlb(o: THREE.Object3D, animations: THREE.AnimationClip[] = []): Promise<string> {
  const buf = (await new GLTFExporter().parseAsync(o, { binary: true, animations, onlyVisible: false })) as ArrayBuffer;
  let s = '';
  const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

(window as any).karakter = async (pad: string, bestanden: string[], maat: number, regels: Verf[] = []) => {
  const o = await fbx.loadAsync(pad);
  o.animations = [];
  // per materiaal de textuur "<materiaal>_color.png", anders op trefwoord
  const cache = new Map<string, Promise<THREE.Texture>>();
  const zoek = (naam: string) => {
    const kaal = (f: string) => f.split('/').pop()!.replace(/_color\.png$/, '');
    return bestanden.find((f) => kaal(f) === naam) ?? bestanden.find((f) => kaal(f).startsWith(naam + '_'))
      ?? bestanden.find((f) => /opacity/.test(naam) === /opacity/.test(f) && ['head', 'body', 'glasses', 'opacity'].some((k) => naam.includes(k) && kaal(f).endsWith(k)))
      ?? bestanden.find((f) => /body/.test(f));
  };
  const tex = (f: string) => {
    const soort = /opacity/.test(f) ? 'opacity' : /head/.test(f) ? 'head' : 'body';
    if (!cache.has(f)) cache.set(f, textuur(f, maat, /opacity/.test(f) ? 'image/png' : 'image/jpeg', regels.filter((r) => r.tex === soort)));
    return cache.get(f)!;
  };
  const meshes: any[] = [];
  o.traverse((n: any) => { if (n.isMesh) meshes.push(n); });
  for (const n of meshes) {
    n.geometry.deleteAttribute('color');
    const mats = await Promise.all((Array.isArray(n.material) ? n.material : [n.material]).map(async (m: any) => {
      const naam: string = m.name;
      const f = zoek(naam);
      console.log(`MAT ${pad.split('/').pop()} ${naam} -> ${f?.split('/').pop()}`);
      const s = new THREE.MeshStandardMaterial({ name: naam, map: f ? await tex(f) : null, roughness: 0.75, metalness: 0 });
      if (/opacity/.test(naam) || /opacity/.test(f ?? '')) { s.alphaTest = 0.5; s.side = THREE.DoubleSide; }
      return s;
    }));
    n.material = mats.length === 1 ? mats[0] : mats;
    // groepen per materiaal samenvoegen (FBX levert 14 groepen = 14 draw calls)
    const g = n.geometry as THREE.BufferGeometry;
    if (g.groups.length > mats.length) {
      const idx = g.index ? g.index.array : Array.from({ length: g.attributes.position.count }, (_, i) => i), nieuw: number[] = [], groepen: { start: number; count: number; materialIndex: number }[] = [];
      for (let mi = 0; mi < mats.length; mi++) {
        const start = nieuw.length;
        for (const gr of g.groups) if ((gr.materialIndex ?? 0) === mi) for (let k = gr.start; k < gr.start + gr.count; k++) nieuw.push(idx[k]);
        if (nieuw.length > start) groepen.push({ start, count: nieuw.length - start, materialIndex: mi });
      }
      g.setIndex(nieuw);
      g.clearGroups();
      for (const gr of groepen) g.addGroup(gr.start, gr.count, gr.materialIndex);
    }
  }
  return naarGlb(o);
};

(window as any).animaties = async (lijst: { pad: string; naam: string }[], botten: string[]) => {
  const houd = new Set(botten);
  let basis: THREE.Group | null = null;
  const clips: THREE.AnimationClip[] = [];
  for (const { pad, naam } of lijst) {
    const o = await fbx.loadAsync(pad);
    basis ??= o;
    const clip = o.animations[0];
    clip.name = naam;
    clip.tracks = clip.tracks.filter((t) => {
      const [bot, prop] = t.name.split('.');
      if (!houd.has(bot)) return false;
      if (prop === 'scale') return false;
      if (prop === 'position' && bot !== 'Bip01') return false;
      return true;
    });
    // lopen en rennen: de heup schuift per cyclus vooruit (root motion) en springt dan terug.
    // Het spel beweegt het personage zelf, dus de lineaire voortgang eruit; het wiegen blijft.
    if (naam === 'Walk' || naam === 'Run') for (const t of clip.tracks) if (t.name === 'Bip01.position') {
      const v = t.values, tt = t.times, n = tt.length;
      const dz = v[(n - 1) * 3 + 2] - v[2], dx = v[(n - 1) * 3] - v[0], duur = tt[n - 1] - tt[0];
      console.log(`MAT ${naam} afstand ${(Math.hypot(dx, dz) / 100).toFixed(2)} m in ${duur.toFixed(2)} s`);
      for (let i = 0; i < n; i++) { const f = (tt[i] - tt[0]) / duur; v[i * 3] -= dx * f; v[i * 3 + 2] -= dz * f; }
    }
    clip.optimize();
    clips.push(clip);
  }
  // alleen de botten (geen meshes)
  return naarGlb(basis!, clips);
};

(window as any).botten = async (pad: string) => {
  const o = await fbx.loadAsync(pad);
  const b: string[] = [];
  o.traverse((n: any) => { if (n.isBone) b.push(n.name); });
  return b;
};
(window as any).klaar = true;
