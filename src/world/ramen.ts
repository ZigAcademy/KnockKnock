import * as THREE from 'three';

/**
 * Ramen waar je "doorheen kijkt" (interior mapping): elk raam is één vlak, en de shader
 * rekent per pixel uit welke wand, vloer of welk plafond van een denkbeeldige kamer je ziet.
 * Zo is er diepte en parallax zonder extra geometrie. Alle ramen samen: één draw call.
 * Kamers krijgen per raam (seed) eigen kleuren, meubels, gordijnen en licht.
 */

export const enum RaamStijl { Woon = 0, Slaap = 1, Leeg = 2, Kantoor = 3, Hal = 4, Trap = 5 }

export interface RaamOpties {
  /** Midden van de onderrand van het raam (wereld). */
  pos: THREE.Vector3;
  breedte: number;
  hoogte: number;
  /** Naar buiten wijzende normaal van de gevel. */
  normaal: THREE.Vector3;
  stijl: RaamStijl;
  seed: number;
  /** Hoogte van de vensterbank boven de vloer van de kamer (m). */
  borstwering?: number;
  /** Diepte van de kamer (m). */
  diepte?: number;
}

const VERT = /* glsl */ `
attribute vec3 aRight;
attribute vec3 aNormaal;
attribute vec4 aKamer; // seed, stijl, borstwering, diepte
attribute vec2 aMaat;  // breedte, hoogte
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vRight;
varying vec3 vNormaal;
varying vec4 vKamer;
varying vec2 vMaat;
#include <common>
#include <fog_pars_vertex>
void main() {
  vUv = uv; vRight = aRight; vNormaal = aNormaal; vKamer = aKamer; vMaat = aMaat;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
uniform vec3 uLucht;
uniform vec3 uWand[8];
uniform vec3 uMeubel[8];
uniform vec3 uVloer[4];
uniform vec3 uGordijn[6];
uniform vec3 uLamp;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vRight;
varying vec3 vNormaal;
varying vec4 vKamer;
varying vec2 vMaat;
#include <common>
#include <fog_pars_fragment>

float h1(float n) { return fract(sin(n * 12.9898 + 4.1414) * 43758.5453); }
float rechthoek(vec2 p, vec2 a, vec2 b) { return step(a.x, p.x) * step(p.x, b.x) * step(a.y, p.y) * step(p.y, b.y); }

// Kantoorlaag midden in de kamer: rij bureaus met collega's erachter (silhouetten met kleur).
// q = (x langs het raam, hoogte boven de vloer). Geeft kleur + dekking.
vec4 werkplekken(vec2 q, float seed) {
  float periode = 1.75;
  float cel = floor((q.x + seed * 0.37) / periode);
  float lx = mod(q.x + seed * 0.37, periode) - periode * 0.5;
  float h = h1(cel * 3.1 + seed);
  vec4 uit = vec4(0.0);
  if (h < 0.18) {
    float pot = rechthoek(vec2(lx, q.y), vec2(-0.2, 0.0), vec2(0.2, 0.42));
    float blad = smoothstep(0.42, 0.36, length((vec2(lx, q.y) - vec2(0.0, 0.85)) * vec2(1.0, 0.8)));
    if (pot > 0.5) return vec4(0.48, 0.34, 0.26, 1.0);
    if (blad > 0.5) return vec4(0.34, 0.5, 0.3, 1.0);
    return uit;
  }
  vec3 kleding = uMeubel[int(floor(h1(cel + 7.0) * 8.0))];
  vec3 huid = mix(vec3(0.92, 0.76, 0.62), vec3(0.45, 0.3, 0.2), h1(cel + 11.0));
  vec3 haar = mix(vec3(0.15, 0.12, 0.1), vec3(0.75, 0.6, 0.4), step(0.7, h1(cel + 13.0)));
  float px = (h1(cel + 5.0) - 0.5) * 0.25;
  if (rechthoek(vec2(lx - px, q.y), vec2(-0.27, 0.55), vec2(0.27, 1.12)) > 0.5) uit = vec4(0.2, 0.22, 0.26, 1.0);
  if (rechthoek(vec2(lx - px, q.y), vec2(-0.21, 0.72), vec2(0.21, 1.24)) > 0.5) uit = vec4(kleding, 1.0);
  float hoofd = length(vec2(lx - px, q.y - 1.38));
  if (hoofd < 0.12) uit = vec4(q.y > 1.4 + (h1(cel + 17.0) - 0.5) * 0.04 ? haar : huid, 1.0);
  if (rechthoek(vec2(lx, q.y), vec2(-0.3, 0.8), vec2(0.3, 1.12)) > 0.5) uit = vec4(0.16, 0.17, 0.19, 1.0);
  if (rechthoek(vec2(lx, q.y), vec2(-0.05, 0.76), vec2(0.05, 0.8)) > 0.5) uit = vec4(0.16, 0.17, 0.19, 1.0);
  if (rechthoek(vec2(lx, q.y), vec2(-0.72, 0.72), vec2(0.72, 0.77)) > 0.5) uit = vec4(0.69, 0.56, 0.42, 1.0);
  if (rechthoek(vec2(lx, q.y), vec2(-0.7, 0.0), vec2(0.7, 0.72)) > 0.5) {
    float paneel = step(abs(lx), 0.62) * step(0.08, q.y);
    uit = vec4(mix(vec3(0.48, 0.37, 0.27), vec3(0.6, 0.47, 0.34), paneel), 1.0);
  }
  return uit;
}

void main() {
  float seed = vKamer.x, stijl = vKamer.y, borst = vKamer.z, diepte = vKamer.w;
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 d = normalize(vWorld - cameraPosition);
  vec3 r = vec3(dot(d, vRight), dot(d, up), dot(d, -vNormaal));
  r.z = max(r.z, 0.05);

  // kamer in meters: x langs het raam (midden 0), y vanaf de vensterbank, z de kamer in
  float hw = max(vMaat.x * 0.85, 1.3);
  float vloer = -borst, plafond = vloer + (stijl > 2.5 ? 3.0 : 2.6);
  vec3 p0 = vec3((vUv.x - 0.5) * vMaat.x, vUv.y * vMaat.y, 0.0);
  float tx = r.x > 0.0 ? (hw - p0.x) / r.x : (-hw - p0.x) / min(r.x, -1e-4);
  float ty = r.y > 0.0 ? (plafond - p0.y) / r.y : (vloer - p0.y) / min(r.y, -1e-4);
  float tz = diepte / r.z;
  float t = min(tx, min(ty, tz));
  vec3 p = p0 + r * t;
  float hy = p.y - vloer; // hoogte boven de vloer

  int iw = int(floor(h1(seed) * 8.0));
  int im = int(floor(h1(seed + 1.7) * 8.0));
  vec3 wand = uWand[iw];
  vec3 meubel = uMeubel[im];
  vec3 vloerKleur = uVloer[int(floor(h1(seed + 3.1) * 4.0))];
  bool kantoor = stijl > 2.5 && stijl < 3.5;
  bool hal = stijl > 3.5 && stijl < 4.5;
  bool trap = stijl > 4.5;
  bool zakelijk = stijl > 2.5;
  bool leeg = stijl > 1.5 && stijl < 2.5;
  if (zakelijk) { wand = vec3(0.93, 0.9, 0.84); vloerKleur = vec3(0.71, 0.58, 0.44); }
  if (trap) { wand = vec3(0.86, 0.88, 0.9); vloerKleur = vec3(0.6, 0.62, 0.66); }
  if (leeg) { wand = vec3(0.78, 0.76, 0.72); vloerKleur = vec3(0.55, 0.45, 0.36); }
  vec3 c;

  if (t == tz) {
    // achterwand
    c = wand;
    vec2 q = vec2(p.x, hy);
    if (!leeg && !zakelijk) {
      float bx = (h1(seed + 5.0) - 0.5) * hw;
      if (stijl < 0.5) {
        // bank met rugleuning en kussens
        c = mix(c, meubel, rechthoek(q, vec2(bx - 0.9, 0.0), vec2(bx + 0.9, 0.8)));
        c = mix(c, meubel * 0.8, rechthoek(q, vec2(bx - 0.9, 0.0), vec2(bx + 0.9, 0.45)));
      } else {
        // bed en nachtkastje
        c = mix(c, vec3(0.92, 0.9, 0.86), rechthoek(q, vec2(bx - 0.8, 0.0), vec2(bx + 0.8, 0.55)));
        c = mix(c, meubel, rechthoek(q, vec2(bx - 0.8, 0.3), vec2(bx + 0.8, 0.55)));
        c = mix(c, meubel * 0.7, rechthoek(q, vec2(bx - 0.85, 0.0), vec2(bx + 0.85, 1.0)) * (1.0 - rechthoek(q, vec2(bx - 0.8, 0.0), vec2(bx + 0.8, 1.0))));
      }
      // schilderij of klok boven het meubel
      float sx = bx + (h1(seed + 6.0) - 0.5) * 0.6;
      vec3 kunst = uGordijn[int(floor(h1(seed + 8.0) * 6.0))];
      c = mix(c, vec3(0.25, 0.2, 0.17), rechthoek(q, vec2(sx - 0.38, 1.22), vec2(sx + 0.38, 1.78)));
      c = mix(c, kunst, rechthoek(q, vec2(sx - 0.32, 1.28), vec2(sx + 0.32, 1.72)));
      // staande plant in een hoek
      float px = h1(seed + 9.0) > 0.5 ? hw - 0.35 : -hw + 0.35;
      c = mix(c, vec3(0.30, 0.42, 0.26), smoothstep(0.4, 0.3, length((q - vec2(px, 1.05)) * vec2(1.0, 0.8))));
      c = mix(c, vec3(0.55, 0.36, 0.26), rechthoek(q, vec2(px - 0.15, 0.0), vec2(px + 0.15, 0.45)));
    }
    if (zakelijk && !trap) {
      // houten lambrisering, raamband met lucht (de andere gevel), plantjes op de vensterbank
      c = mix(c, vec3(0.66, 0.53, 0.39) * (0.9 + 0.1 * step(0.5, fract(p.x * 4.0))), step(hy, 1.0));
      c = mix(c, vec3(0.48, 0.37, 0.27), rechthoek(q, vec2(-9.0, 0.98), vec2(9.0, 1.05)));
      float raam = rechthoek(q, vec2(-9.0, 1.2), vec2(9.0, 2.35)) * step(0.08, fract(p.x * 0.5 + 0.04));
      c = mix(c, mix(vec3(0.72, 0.82, 0.92), vec3(0.85, 0.9, 0.95), (hy - 1.2)), raam);
      c = mix(c, vec3(0.48, 0.37, 0.27), rechthoek(q, vec2(-9.0, 1.15), vec2(9.0, 1.2)));
      float pl = fract(p.x * 0.33 + seed * 0.1);
      c = mix(c, vec3(0.34, 0.5, 0.3), step(pl, 0.12) * smoothstep(0.2, 0.12, length(vec2((pl - 0.06) * 3.0, hy - 1.2))));
    }
    if (hal) {
      // balie in Zig-blauw met een houten blad, en een grote plant
      c = mix(c, vec3(0.12, 0.35, 1.0), rechthoek(q, vec2(-1.1, 0.0), vec2(1.1, 1.05)));
      c = mix(c, vec3(0.69, 0.56, 0.42), rechthoek(q, vec2(-1.15, 1.05), vec2(1.15, 1.12)));
      c = mix(c, vec3(0.34, 0.5, 0.3), smoothstep(0.5, 0.4, length((q - vec2(hw - 0.5, 1.0)) * vec2(1.0, 0.75))));
      c = mix(c, vec3(0.48, 0.34, 0.26), rechthoek(q, vec2(hw - 0.75, 0.0), vec2(hw - 0.25, 0.5)));
    }
    if (trap) {
      // trappenhuis: schuine treden en een blauwe leuning
      float tr = step(fract(hy * 2.0 - p.x * 1.2), 0.5) * rechthoek(q, vec2(-hw, 0.0), vec2(hw, 2.6));
      c = mix(c, vec3(0.62, 0.6, 0.58), tr * 0.6);
      c = mix(c, vec3(0.36, 0.46, 0.7), rechthoek(q, vec2(-hw, 0.95), vec2(hw, 1.0)));
    }
  } else if (t == ty) {
    if (r.y > 0.0) {
      // plafond met lamp
      c = vec3(0.93, 0.92, 0.9);
      float lamp = 1.0 - smoothstep(0.0, 0.6, length(vec2(p.x, p.z - diepte * 0.5)));
      c = mix(c, uLamp * 1.1, lamp * 0.7);
      if (zakelijk) {
        // donkere hanglampen met een warme gloed
        vec2 cel = vec2(fract(p.x * 0.55 + 0.5), fract(p.z * 0.45 + 0.3)) - 0.5;
        float r0 = length(cel * vec2(1.8, 2.2));
        c = mix(c, uLamp, smoothstep(0.55, 0.15, r0) * 0.35);
        c = mix(c, vec3(0.18, 0.19, 0.21), step(r0, 0.16));
      }
    } else {
      // vloer: planken of tapijt, met een kleed
      c = vloerKleur * (0.92 + 0.08 * step(0.5, fract(p.x * 2.0 + floor(p.z * 1.3) * 0.37)));
      if (zakelijk) c = vloerKleur * (0.9 + 0.1 * step(0.5, fract(p.x * 1.6)));
      if (kantoor) c = mix(c, vec3(0.6, 0.65, 0.71), smoothstep(1.3, 1.2, length(vec2(p.x * 0.8, p.z - diepte * 0.75))));
      if (!leeg && !zakelijk) c = mix(c, uGordijn[int(floor(h1(seed + 4.0) * 6.0))] * 0.8, rechthoek(vec2(p.x, p.z), vec2(-0.9, diepte * 0.3), vec2(0.9, diepte * 0.8)));
    }
  } else {
    // zijwand: iets donkerder, soms een boekenkast of een deur
    c = wand * 0.82;
    vec2 q = vec2(p.z, hy);
    bool links = p.x < 0.0;
    if (!leeg && !zakelijk && links == (h1(seed + 11.0) > 0.5)) {
      float kast = rechthoek(q, vec2(diepte * 0.35, 0.0), vec2(diepte * 0.85, 1.9));
      float plank = step(0.82, fract(hy * 2.4));
      vec3 boeken = uGordijn[int(floor(fract(p.z * 2.5) * 6.0))] * 0.65;
      c = mix(c, mix(boeken, meubel * 0.55, plank), kast);
    } else if (zakelijk) {
      c = mix(c, vec3(0.6, 0.48, 0.35) * (0.9 + 0.1 * step(0.5, fract(p.z * 4.0))), step(hy, 1.0));
      vec3 kunst = uGordijn[int(floor(h1(seed + 21.0 + (links ? 1.0 : 0.0)) * 6.0))];
      c = mix(c, vec3(0.96, 0.95, 0.92), rechthoek(q, vec2(diepte * 0.3, 1.35), vec2(diepte * 0.62, 2.05)));
      c = mix(c, kunst, rechthoek(q, vec2(diepte * 0.34, 1.45), vec2(diepte * 0.5, 1.9)));
      c = mix(c, h1(seed + 23.0) > 0.5 ? vec3(0.12, 0.35, 1.0) : vec3(1.0, 0.56, 0.0), rechthoek(q, vec2(diepte * 0.52, 1.45), vec2(diepte * 0.58, 1.55)));
    } else if (!leeg) {
      c = mix(c, wand * 1.05, rechthoek(q, vec2(diepte * 0.55, 0.0), vec2(diepte * 0.85, 2.05)));
    }
  }

  // diepte: verder weg iets donkerder; sommige kamers hebben de lamp aan
  // collega's aan hun bureau, op een laag midden in de kamer (met parallax)
  if (kantoor) {
    float tm = (diepte * 0.5) / r.z;
    if (tm < t) {
      vec3 pm = p0 + r * tm;
      vec4 w = werkplekken(vec2(pm.x, pm.y - vloer), seed);
      if (w.a > 0.5 && abs(pm.x) < hw) { c = w.rgb; t = tm; }
    }
  }
  if (hal) {
    // medewerker achter de balie
    float tm = (diepte - 0.6) / r.z;
    vec3 pm = p0 + r * tm;
    vec2 q2 = vec2(pm.x, pm.y - vloer);
    if (tm < t && length(q2 - vec2(0.2, 1.45)) < 0.12) { c = vec3(0.85, 0.66, 0.52); t = tm; }
    else if (tm < t && rechthoek(q2, vec2(0.0, 1.05), vec2(0.4, 1.35)) > 0.5) { c = vec3(0.17, 0.22, 0.31); t = tm; }
  }

  // binnen is het overdag donkerder dan buiten; verder weg nog wat donkerder
  c *= mix(0.68, 0.42, clamp(t / (diepte + 1.0), 0.0, 1.0));
  bool aan = (h1(seed + 13.0) < 0.55 || zakelijk) && !leeg;
  if (aan) c = c * 1.25 + uLamp * 0.06;

  // gordijnen en vitrage (in het vlak van het raam)
  float g = h1(seed + 15.0);
  vec3 gk = uGordijn[int(floor(h1(seed + 16.0) * 6.0))];
  if (!leeg && !zakelijk && g > 0.25) {
    float breed = 0.12 + 0.08 * h1(seed + 17.0);
    float plooi = 0.85 + 0.15 * sin(vUv.x * 90.0);
    float rand = 1.0 - step(breed, vUv.x) * step(vUv.x, 1.0 - breed);
    c = mix(c, gk * plooi * 0.85, rand);
  }
  if (!zakelijk && g < 0.2) {
    // half neergelaten zonwering
    float neer = 0.35;
    float lam = step(1.0 - neer, vUv.y) * (0.8 + 0.2 * step(0.5, fract(vUv.y * 9.0)));
    c = mix(c, vec3(0.86, 0.85, 0.82) * lam, step(1.0 - neer, vUv.y));
  }

  // glas: wat spiegeling van de lucht, sterker onder een schuine hoek
  float fres = 0.05 + 0.4 * pow(1.0 - r.z, 4.0);
  c = mix(c, uLucht, fres);
  // alle kleuren hierboven zijn sRGB; omzetten naar lineair voor de rest van de pijplijn
  c = pow(clamp(c, 0.0, 1.0), vec3(2.2));
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

/** Kleuren als sRGB-waarden (de shader rekent in sRGB en zet pas aan het eind om). */
const srgb = (h: string) => { const c = new THREE.Color(h); const o = { r: 0, g: 0, b: 0 }; c.getRGB(o, THREE.SRGBColorSpace); return new THREE.Vector3(o.r, o.g, o.b); };
const kl = (hexen: string[]) => hexen.map(srgb);

export class RaamBouwer {
  private P: number[] = []; private UV: number[] = []; private R: number[] = []; private N: number[] = [];
  private K: number[] = []; private M: number[] = []; private I: number[] = [];

  add(o: RaamOpties): void {
    const n = o.normaal.clone().normalize();
    const right = new THREE.Vector3(0, 1, 0).cross(n).normalize(); // rechts voor wie naar het raam kijkt
    const base = this.P.length / 3;
    const hoeken: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (const [u, v] of hoeken) {
      const p = o.pos.clone().addScaledVector(right, (u - 0.5) * o.breedte).add(new THREE.Vector3(0, v * o.hoogte, 0));
      this.P.push(p.x, p.y, p.z); this.UV.push(u, v);
      this.R.push(right.x, right.y, right.z); this.N.push(n.x, n.y, n.z);
      this.K.push(o.seed, o.stijl, o.borstwering ?? 0.9, o.diepte ?? 3.2);
      this.M.push(o.breedte, o.hoogte);
    }
    this.I.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  build(): THREE.Mesh {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.P, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.UV, 2));
    g.setAttribute('aRight', new THREE.Float32BufferAttribute(this.R, 3));
    g.setAttribute('aNormaal', new THREE.Float32BufferAttribute(this.N, 3));
    g.setAttribute('aKamer', new THREE.Float32BufferAttribute(this.K, 4));
    g.setAttribute('aMaat', new THREE.Float32BufferAttribute(this.M, 2));
    g.setIndex(this.I);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uLucht: { value: srgb('#B9CCE6') },
        uWand: { value: kl(['#E3D3B5', '#C6D6BE', '#E2BFA8', '#BCCBDD', '#E8DCC4', '#D8B497', '#C9C0D9', '#E6D9BF']) },
        uMeubel: { value: kl(['#5E6B7A', '#7A5E52', '#6E7F5E', '#8C6A4E', '#4E5D73', '#9A7B5F', '#6B5A78', '#5B7A78']) },
        uVloer: { value: kl(['#9A7B5F', '#B08F6A', '#7E6249', '#A88B6C']) },
        uGordijn: { value: kl(['#C9BBA6', '#9FB2A0', '#B48A72', '#8A97A6', '#D9C8A0', '#A07A80']) },
        uLamp: { value: srgb('#FFD9A6') },
      }]),
    });
    const m = new THREE.Mesh(g, mat);
    m.name = 'ramen';
    m.frustumCulled = false;
    return m;
  }
}
