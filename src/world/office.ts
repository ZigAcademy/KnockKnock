import { woordmerkMateriaal, WOORDMERK_VERHOUDING } from './logos';
import * as THREE from 'three';
import { StaticBuilder } from './builder';
import { Character, type Look } from '../player/character';
import { DECOR_LOOKS } from './looks';
import { dempVertex, type Palet } from '../assets/modellen';
import { THEME } from '../theme';

/** Materiaalkleuren voor kantoormeubels (warm, gedempt; blauw/oranje alleen als klein accent in de kunst). */
const KLEUR: Record<string, string> = {
  Wood: '#A88763', DarkWood: '#7A5E45', Wood_Dark: '#7A5E45', Wood_Light: '#C2A27E', Wood1: '#9A7B5F',
  Grey: '#7D838A', Black: '#2F3236', Chair: '#4E5560', White: '#E9E6E0', LightMetal: '#B5B9BE', Metal: '#8A8F96',
  Light: '#FFF1D2', Plant_Green: '#6A8A57', DarkGreen: '#4F6B45', LightOrange: '#B9876A', Kitchen: '#8E7258',
  KitchenTop: '#E2DED6', DarkMetal: '#4A4E55', Cushin: '#7E8C7A', Cushing: '#7E8C7A', Legs: '#5E4B3C',
  metal: '#9AA0A7', metalDark: '#33373D', metalMedium: '#7D838A', carpetWhite: '#E6E2DA', wood: '#A88763', glass: '#BFD3E6',
};
const palet = (extra: Record<string, string> = {}): Palet => (n) => extra[n] ?? KLEUR[n];

/** Hanglampen (x, z) en de plek van de overlegtafel. */
const LAMPEN: [number, number][] = [[-1.4, -1.5], [2.0, -1.5], [-3.2, 1.9]];
const OVERLEG: [number, number] = [-3.2, 1.9];

/**
 * Vaste werkplekken: elke medewerker uit de JSON heeft een eigen bureau en zit er altijd.
 * Plek = waar de persoon zit; het bureau staat rechts van hem/haar (kijkrichting +x).
 */
export const WERKPLEKKEN: Record<string, [number, number]> = {
  anna: [-4.2, -2.6], tariq: [-4.2, -0.4],
  fatima: [-1.4, -2.6], wei: [-1.4, -0.4],
  amara: [1.6, -2.6], sanne: [1.6, -0.4],
  bram: [4.15, -0.4],
};

/** Kantoor van de corporatie: warm en licht, met de medewerker aan het werk en een paar collega's. */
export class Office {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
  private medewerkers = new Map<string, Character>();
  private collegas: Character[] = [];
  private scherm!: THREE.Group;
  private look = new THREE.Vector3(0, 0.95, -1.2);
  private dir = new THREE.Vector3(0.28, 0.85, 1).normalize();

  constructor(looks: Record<string, Partial<Look>> = {}) {
    const s = this.scene;
    s.background = new THREE.Color(THEME.tint);
    s.add(new THREE.HemisphereLight('#FFF7EE', '#B5A48E', 1.35));
    // daglicht dat door de ramen in de achterwand naar binnen valt
    const sun = new THREE.DirectionalLight('#FFF1DC', 1.9);
    sun.position.set(-3, 8, -9);
    sun.target.position.set(0.5, 0, 0);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02; sun.shadow.radius = 3;
    s.add(sun, sun.target);
    // warme hanglampen
    for (const [x, z] of LAMPEN) {
      const l = new THREE.PointLight('#FFD7A0', 2.4, 6, 1.6);
      l.position.set(x, 2.25, z);
      s.add(l);
    }

    const b = new StaticBuilder();
    const minX = -6, maxX = 6, minZ = -4.5, maxZ = 3, h = 3.1;
    const W = maxX - minX, D = maxZ - minZ, cz = (minZ + maxZ) / 2;
    // houten vloer met naden
    b.box(W + 0.3, 0.2, D + 0.15, 0, -0.2, cz + 0.075, '#8C6E52', { castShadow: false });
    b.box(W, 0.01, D, 0, 0, cz, '#B5946F', { castShadow: false });
    for (let x = minX + 0.6; x < maxX; x += 0.6) b.box(0.012, 0.012, D, x, 0, cz, '#A3845F', { castShadow: false });
    // muren
    b.box(W + 0.3, h, 0.15, 0, 0, minZ - 0.075, '#EFEBE4', { castShadow: false });
    b.box(0.15, h, D + 0.15, minX - 0.075, 0, cz + 0.075, '#EAE4DA', { castShadow: false });
    b.box(0.15, h, D + 0.15, maxX + 0.075, 0, cz + 0.075, '#EAE4DA', { castShadow: false });
    b.box(W, 0.1, 0.05, 0, 0, minZ + 0.025, '#B5946F', { castShadow: false });
    b.box(0.05, 0.1, D, minX + 0.025, 0, cz, '#B5946F', { castShadow: false });
    // houten lambrisering op de linkerwand (warm accent)
    for (let z = minZ + 0.3; z < maxZ - 0.1; z += 0.25) b.box(0.04, 1.0, 0.2, minX + 0.02, 0, z, '#A88763', { castShadow: false });
    b.box(0.07, 0.05, D, minX + 0.035, 1.0, cz, '#8C6E52', { castShadow: false });
    // raamband in de achterwand
    for (let x = -4.5; x <= 4.5; x += 2.25) {
      b.box(2.0, 1.7, 0.06, x, 0.95, minZ + 0.03, '#C7DAEC', { castShadow: false });
      b.box(0.1, 1.7, 0.08, x + 1.12, 0.95, minZ + 0.04, '#7A5E45', { castShadow: false });
    }
    b.box(W, 0.08, 0.1, 0, 2.65, minZ + 0.05, '#7A5E45', { castShadow: false });
    b.box(W, 0.08, 0.14, 0, 0.9, minZ + 0.07, '#7A5E45', { castShadow: false });

    // werkplekken: bureau rechts van de medewerker, scherm en toetsenbord naar hem/haar toe
    let k = 0;
    for (const [px, pz] of Object.values(WERKPLEKKEN)) {
      const dx = px + 0.85;
      if (!b.model('meubels', 'bureau', { x: dx, z: pz, rotY: Math.PI / 2, fit: [1.5, 0.75, 0.75] }, palet({ Wood: '#B08F6A', DarkWood: '#7A5E45' }))) b.box(0.75, 0.05, 1.5, dx, 0.7, pz, '#B08F6A');
      b.model('meubels', 'beeldscherm', { x: dx + 0.18, y: 0.75, z: pz, rotY: -Math.PI / 2, fit: [0.62, 0.45, 0.16] }, palet());
      b.model('meubels', 'toetsenbord', { x: dx - 0.12, y: 0.75, z: pz, rotY: -Math.PI / 2, fit: [0.45, 0.03, 0.15] }, palet());
      b.model('meubels', 'bureaustoel', { x: px, z: pz, rotY: Math.PI / 2, fit: [0.6, 0.95, 0.6] }, palet({ Chair: k % 2 ? '#4E5560' : '#3E4C66' }));
      // iets persoonlijks per bureau
      if (k % 3 === 0) b.model('eten', 'mok', { x: dx - 0.05, y: 0.75, z: pz + 0.5, fit: [0.1, 0.1, 0.09] }, undefined, { nabewerk: (g) => dempVertex(g, 0.6) });
      if (k % 3 === 1) b.model('meubels', 'plantje-1', { x: dx + 0.2, y: 0.75, z: pz + 0.55, fit: [0.16, 0.26, 0.16] }, palet({ plant: '#6A8A57', wood: '#B9876A' }));
      if (k % 3 === 2) b.model('meubels', 'lamp-bureau', { x: dx + 0.2, y: 0.75, z: pz - 0.55, rotY: -Math.PI / 2, fit: [0.2, 0.42, 0.32] }, palet());
      k++;
    }
    // overlegtafel met stoelen op een kleed
    const ox = OVERLEG[0], oz = OVERLEG[1];
    b.add(new THREE.CylinderGeometry(1.35, 1.35, 0.012, 32).translate(ox, 0.012, oz), '#9AA6B4', { castShadow: false });
    b.add(new THREE.CylinderGeometry(1.2, 1.2, 0.012, 32).translate(ox, 0.016, oz), '#B9C2CC', { castShadow: false });
    if (!b.model('meubels', 'tafel-rond-klein', { x: ox, z: oz, fit: [1.3, 0.75, 1.3] }, palet({ Wood: '#B08F6A' }))) b.add(new THREE.CylinderGeometry(0.65, 0.65, 0.05, 20).translate(ox, 0.72, oz), '#B08F6A');
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + Math.PI / 4;
      b.model('meubels', 'stoel-3', { x: ox + Math.sin(a) * 0.95, z: oz + Math.cos(a) * 0.95, rotY: a + Math.PI, fit: [0.46, 0.92, 0.5] }, palet({ Cushin: '#7E8C7A' }));
    }
    b.model('meubels', 'plant-3', { x: ox, y: 0.75, z: oz, fit: [0.3, 0.28, 0.3] }, palet());
    b.model('eten', 'glas', { x: ox + 0.3, y: 0.75, z: oz - 0.2, fit: [0.07, 0.12, 0.07] }, undefined, { nabewerk: (g) => dempVertex(g, 0.6) });
    // koffiehoek tegen de achterwand rechts
    const kx0 = 2.4;
    for (let k = 0; k < 4; k++) {
      const x = kx0 + 0.3 + k * 0.6;
      if (!b.model('meubels', 'keuken-lades', { x, z: minZ + 0.31, fit: [0.6, 0.9, 0.62] }, palet({ Kitchen: '#8E7258' }))) b.box(0.6, 0.9, 0.62, x, 0, minZ + 0.31, '#8E7258');
    }
    b.box(2.4, 0.04, 0.3, kx0 + 1.2, 1.55, minZ + 0.16, '#A88763');
    b.model('meubels', 'koffiezetter', { x: kx0 + 0.45, y: 0.9, z: minZ + 0.3, fit: [0.32, 0.38, 0.32] }, palet());
    const etenPalet = { nabewerk: (g: THREE.BufferGeometry) => dempVertex(g, 0.6) };
    for (const [naam, x, y, z, w, hh] of [
      ['mok', kx0 + 0.85, 0.9, minZ + 0.32, 0.1, 0.1], ['mok', kx0 + 1.0, 0.9, minZ + 0.42, 0.1, 0.1], ['kopje', kx0 + 1.25, 0.9, minZ + 0.35, 0.14, 0.03],
      ['schaal', kx0 + 1.8, 0.9, minZ + 0.33, 0.34, 0.1], ['appel', kx0 + 1.75, 0.95, minZ + 0.3, 0.08, 0.08], ['peer', kx0 + 1.86, 0.95, minZ + 0.36, 0.08, 0.1],
      ['mok', kx0 + 0.6, 1.59, minZ + 0.15, 0.1, 0.1], ['mok', kx0 + 0.78, 1.59, minZ + 0.15, 0.1, 0.1], ['mok', kx0 + 0.96, 1.59, minZ + 0.15, 0.1, 0.1],
      ['pak', kx0 + 2.1, 0.9, minZ + 0.25, 0.08, 0.2],
    ] as [string, number, number, number, number, number][]) {
      b.model('eten', naam, { x, y, z, fit: [w, hh, w] }, undefined, etenPalet);
    }
    // kasten, planten, kapstok
    b.model('meubels', 'kast-laag', { x: minX + 0.35, z: -0.6, rotY: Math.PI / 2, fit: [1.4, 0.9, 0.6] }, palet());
    b.model('meubels', 'boeken', { x: minX + 0.35, y: 0.9, z: -0.9, rotY: Math.PI / 2, fit: [0.3, 0.2, 0.18] }, palet({ carpetDarker: '#5E6672', carpetWhite: '#E6E2DA', plant: '#6A8A57' }));
    b.model('meubels', 'plant-1', { x: minX + 0.35, y: 0.9, z: -0.2, fit: [0.4, 0.45, 0.4] }, palet());
    for (const [x, z, s] of [[minX + 0.55, minZ + 0.45, 1.2], [maxX - 0.5, 2.4, 1.0], [-0.9, minZ + 0.45, 0.9], [1.7, minZ + 0.45, 0.85], [minX + 0.5, 2.5, 1.1]]) {
      b.model('meubels', 'plant-4', { x, z, fit: [0.8 * s, 1.0 * s, 0.8 * s] }, palet());
    }
    b.model('meubels', 'kapstok', { x: maxX - 0.4, z: 1.6, fit: [0.45, 1.75, 0.45] }, palet());
    // hanglampen
    for (const [x, z] of LAMPEN) {
      b.box(0.02, 0.6, 0.02, x, h - 0.6, z, '#555B63');
      b.add(new THREE.ConeGeometry(0.28, 0.24, 12, 1, true).translate(x, h - 0.72, z), '#2F3236');
      b.add(new THREE.SphereGeometry(0.07, 8, 6).translate(x, h - 0.8, z), '#FFF1D2');
    }
    // abstracte wandkunst op de linkerwand (blauw en oranje alleen als klein accent)
    const kunst = (z: number, y: number, w: number, hh: number, vlakken: [number, number, number, number, string][]) => {
      b.box(0.04, hh, w, minX + 0.06, y - hh / 2, z, '#F4F1EB');
      for (const [dz, dy, vw, vh, c] of vlakken) b.box(0.02, vh, vw, minX + 0.09, y + dy - vh / 2, z + dz, c, { castShadow: false });
    };
    kunst(-2.6, 2.3, 1.1, 0.8, [[-0.18, 0.12, 0.55, 0.45, '#C9BBA6'], [0.2, -0.1, 0.4, 0.35, '#8A97A6'], [0.3, 0.22, 0.12, 0.12, THEME.blue]]);
    kunst(-1.1, 2.15, 0.6, 0.6, [[0, 0.05, 0.4, 0.3, '#9FB2A0'], [-0.1, -0.17, 0.15, 0.1, THEME.orange]]);
    kunst(0.9, 2.3, 0.9, 0.7, [[0.1, 0.1, 0.6, 0.25, '#B9A27E'], [-0.15, -0.12, 0.35, 0.3, '#5E6672'], [0.25, -0.18, 0.08, 0.08, THEME.blue]]);
    s.add(b.build());

    // eigen beeldscherm met een licht scherm (gestileerd, zonder tekst)
    const scherm = new THREE.Group();
    scherm.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.52, 0.04), new THREE.MeshStandardMaterial({ color: '#2C3138', roughness: 0.5 })));
    const glas = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.46), new THREE.MeshBasicMaterial({ color: THEME.tint }));
    glas.position.z = 0.021;
    const balk = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.06), new THREE.MeshBasicMaterial({ color: THEME.navy }));
    balk.position.set(0, 0.2, 0.022);
    const voet = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 0.08), new THREE.MeshStandardMaterial({ color: '#3A3F46' }));
    voet.position.set(0, -0.36, -0.06);
    scherm.add(glas, balk, voet);
    scherm.rotation.y = -Math.PI / 2;
    scherm.name = 'beeldscherm';
    scherm.visible = false;
    s.add(scherm);
    this.scherm = scherm;

    // logo van de corporatie op de achterwand, op een wit bord met navy rand (NL/EN wisselt mee)
    const bh = 0.62, bw = bh * WOORDMERK_VERHOUDING;
    const rand = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.16, bh + 0.16, 0.04), new THREE.MeshStandardMaterial({ color: THEME.navy }));
    rand.position.set(0, 2.82, minZ + 0.03);
    const bord = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), woordmerkMateriaal());
    bord.position.set(0, 2.82, minZ + 0.055);
    bord.name = 'kantoor-logo';
    s.add(rand, bord);

    // collega's (decor, geen medewerkers uit de JSON): één werkt, één bij de koffie, één aan de overlegtafel
    const collega = (look: number, x: number, z: number, ry: number, zit: boolean) => {
      const c = new Character(DECOR_LOOKS[look % DECOR_LOOKS.length]);
      c.zit = zit;
      c.setBasis(zit ? 'Idle_Neutral' : 'Idle');
      c.root.position.set(x, 0, z);
      c.root.rotation.y = ry;
      s.add(c.root);
      this.collegas.push(c);
    };
    collega(3, kx0 + 0.95, minZ + 1.05, -Math.PI * 0.2, false);
    void ox; void oz;

    // alle medewerkers zitten altijd op hun eigen plek
    for (const [id, [px, pz]] of Object.entries(WERKPLEKKEN)) {
      const m = new Character(looks[id] ?? {});
      m.zit = true;
      m.setBasis('Idle_Neutral');
      m.root.position.set(px, 0, pz);
      m.root.rotation.y = Math.PI / 2;
      m.root.name = `medewerker-${id}`;
      s.add(m.root);
      this.medewerkers.set(id, m);
    }
  }

  /** Jij bent nu deze medewerker: de camera gaat naar zijn/haar bureau, met Zig365 op het scherm. */
  setMedewerker(id: string): void {
    const plek = WERKPLEKKEN[id];
    if (!plek) return;
    const [px, pz] = plek;
    this.look.set(px + 0.45, 0.85, pz + 0.1);
    this.scherm.position.set(px + 0.85 + 0.15, 1.08, pz);
    this.scherm.visible = true;
    this.resize(this.breed, this.hoog);
  }
  private breed = 1280;
  private hoog = 800;

  resize(w: number, h: number): void {
    this.breed = w; this.hoog = h;
    const aspect = w / h;
    this.camera.aspect = aspect;
    const dist = aspect < 1 ? 8 : 5.4;
    this.camera.position.copy(this.look).addScaledVector(this.dir, dist);
    this.camera.lookAt(this.look);
    this.camera.updateProjectionMatrix();
  }

  update(dt: number): void {
    for (const m of this.medewerkers.values()) m.animate(dt, 0);
    for (const c of this.collegas) c.animate(dt, 0);
  }
}
