import * as THREE from 'three';
import { WORLD } from '../theme';
import { geluid } from '../audio/geluid';

/**
 * Losse objecten voor hotspots. Elk object krijgt eigen materialen,
 * zodat het kan oplichten (oranje gloed) zonder de rest te raken.
 */
export interface Prop {
  group: THREE.Group;
  /** Punt boven het object voor de hotspot-pin (lokaal). */
  anker: THREE.Vector3;
  update?: (dt: number, t: number) => void;
}

const mat = (c: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, flatShading: true, ...extra });

function mesh(geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const me = new THREE.Mesh(geo, m);
  me.position.set(x, y, z);
  me.castShadow = true; me.receiveShadow = true;
  return me;
}

/** Keukenkraan met druppel, en een emmer onder het aanrecht. Oorsprong: bovenkant aanrecht. */
function kraan(): Prop {
  const g = new THREE.Group();
  const chroom = mat('#C9CED4', { roughness: 0.35, metalness: 0.4 });
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.06, 10), chroom, 0, 0.03, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.34, 8), chroom, 0, 0.2, 0));
  const tuit = mesh(new THREE.BoxGeometry(0.04, 0.04, 0.26), chroom, 0, 0.36, 0.12);
  g.add(tuit);
  g.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.06, 8), chroom, 0, 0.32, 0.24));
  g.add(mesh(new THREE.BoxGeometry(0.14, 0.03, 0.03), chroom, 0, 0.3, -0.02));
  const water = mat(WORLD.water, { transparent: true, opacity: 0.85, roughness: 0.1 });
  const druppel = mesh(new THREE.SphereGeometry(0.022, 8, 6), water, 0, 0.28, 0.24);
  druppel.castShadow = false;
  g.add(druppel);
  // emmer voor het keukenkastje
  const emmer = new THREE.Group();
  const emmerMat = mat('#8796A6');
  emmer.add(mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.3, 12, 1, true), emmerMat, 0, 0.15, 0));
  emmer.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 12), emmerMat, 0, 0.01, 0));
  emmer.add(mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.02, 12), water, 0, 0.2, 0));
  const hengsel = mesh(new THREE.TorusGeometry(0.16, 0.01, 4, 12, Math.PI), mat(WORLD.metal), 0, 0.3, 0);
  emmer.add(hengsel);
  emmer.position.set(0.55, -0.9, 0.65);
  (emmerMat as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  g.add(emmer);
  return {
    group: g,
    anker: new THREE.Vector3(0, 0.65, 0.1),
    update: (dt) => {
      druppel.position.y -= dt * 0.9;
      if (druppel.position.y < -0.05) { druppel.position.y = 0.28; geluid.druppel(0.12); }
      druppel.visible = druppel.position.y > -0.02;
    },
  };
}

/** Telefoon met briefje. Oorsprong: tafelblad. */
function telefoon(): Prop {
  const g = new THREE.Group();
  const tel = mesh(new THREE.BoxGeometry(0.09, 0.012, 0.17), mat('#22262C', { roughness: 0.3 }), 0, 0.006, 0);
  tel.rotation.y = 0.3;
  g.add(tel);
  const scherm = mesh(new THREE.PlaneGeometry(0.075, 0.15), new THREE.MeshBasicMaterial({ color: '#5B6F86' }), 0, 0.0131, 0);
  scherm.rotation.set(-Math.PI / 2, 0, 0.3);
  g.add(scherm);
  const briefje = mesh(new THREE.BoxGeometry(0.12, 0.004, 0.09), mat('#F6F1DE'), 0.16, 0.002, 0.04);
  briefje.rotation.y = -0.2;
  g.add(briefje);
  for (let i = 0; i < 2; i++) {
    const lijn = mesh(new THREE.BoxGeometry(0.08, 0.001, 0.008), mat('#59606A'), 0.16, 0.0045, 0.02 + i * 0.03);
    lijn.rotation.y = -0.2;
    g.add(lijn);
  }
  return { group: g, anker: new THREE.Vector3(0.05, 0.3, 0) };
}

/** Opengeklapte laptop met licht scherm. Oorsprong: tafelblad. */
function laptop(): Prop {
  const g = new THREE.Group();
  const behuizing = mat('#9AA1AA', { roughness: 0.4, metalness: 0.2 });
  g.add(mesh(new THREE.BoxGeometry(0.42, 0.02, 0.3), behuizing, 0, 0.01, 0));
  const deksel = new THREE.Group();
  deksel.position.set(0, 0.02, -0.15);
  deksel.rotation.x = -0.25;
  deksel.add(mesh(new THREE.BoxGeometry(0.42, 0.28, 0.015), behuizing, 0, 0.14, 0));
  const scherm = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.24), new THREE.MeshBasicMaterial({ color: '#E8EEF8' }));
  scherm.position.set(0, 0.14, 0.009);
  deksel.add(scherm);
  // invulvelden op het inlogscherm (alleen vorm, geen tekst)
  for (let i = 0; i < 2; i++) {
    const veld = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.025), new THREE.MeshBasicMaterial({ color: '#C3CBD8' }));
    veld.position.set(0, 0.16 - i * 0.045, 0.0095);
    deksel.add(veld);
  }
  g.add(deksel);
  return { group: g, anker: new THREE.Vector3(0, 0.5, -0.1) };
}

/** Raam met een getekend uitzicht (canvas). Oorsprong: onderkant raam, op de muur. */
function raam(teken: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void, animeer: boolean): Prop {
  const g = new THREE.Group();
  const W = 1.8, H = 1.2;
  const cv = document.createElement('canvas');
  cv.width = 360; cv.height = 240;
  const ctx = cv.getContext('2d')!;
  teken(ctx, cv.width, cv.height, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const kozijn = mat(WORLD.frame);
  g.add(mesh(new THREE.BoxGeometry(W + 0.2, H + 0.2, 0.06), kozijn, 0, H / 2 + 0.1, 0.03));
  const glas = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: tex }));
  glas.position.set(0, H / 2 + 0.1, 0.065);
  g.add(glas);
  g.add(mesh(new THREE.BoxGeometry(0.06, H, 0.08), kozijn, 0, H / 2 + 0.1, 0.07));
  g.add(mesh(new THREE.BoxGeometry(W + 0.4, 0.06, 0.25), kozijn, 0, 0.04, 0.12));
  let acc = 0, t = 0;
  return {
    group: g,
    anker: new THREE.Vector3(0, H + 0.35, 0.1),
    update: animeer ? (dt) => {
      t += dt; acc += dt;
      if (acc > 0.06) { acc = 0; teken(ctx, cv.width, cv.height, t); tex.needsUpdate = true; }
    } : undefined,
  };
}

/** Uitzicht met regen en water dat langs de gevel loopt (lekkende dakgoot). */
function raamLek(): Prop {
  return raam((c, w, h, t) => {
    const lucht = c.createLinearGradient(0, 0, 0, h);
    lucht.addColorStop(0, '#8E9AA8'); lucht.addColorStop(1, '#B7C0CA');
    c.fillStyle = lucht; c.fillRect(0, 0, w, h);
    c.fillStyle = '#7B8571'; c.fillRect(0, h * 0.78, w, h * 0.22);
    // dakgoot bovenin met overlopend water
    c.fillStyle = '#4A4E55'; c.fillRect(0, 0, w, 16);
    c.fillStyle = '#3D4046'; c.fillRect(0, 14, w, 5);
    c.strokeStyle = 'rgba(214,232,247,0.9)'; c.lineWidth = 3;
    for (const x of [70, 150, 245, 300]) {
      c.beginPath(); c.moveTo(x, 18);
      for (let y = 18; y < h; y += 12) c.lineTo(x + Math.sin(y * 0.08 + t * 6 + x) * 2.5, y);
      c.stroke();
    }
    // vallende druppels
    c.fillStyle = 'rgba(230,240,250,0.95)';
    for (let i = 0; i < 18; i++) {
      const x = (i * 53) % w, y = ((i * 37 + t * 260) % (h - 20)) + 20;
      c.fillRect(x, y, 2, 9);
    }
  }, true);
}

/** Uitzicht 's avonds op de donkere fietsenstalling met één scheve lamp. */
function raamStalling(): Prop {
  return raam((c, w, h) => {
    c.fillStyle = '#232A35'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#1B2028'; c.fillRect(0, h * 0.7, w, h * 0.3);
    // stalling
    c.fillStyle = '#2E3540';
    c.fillRect(60, 95, 240, 10);
    for (const x of [70, 180, 290]) c.fillRect(x - 3, 105, 6, 70);
    c.strokeStyle = '#3B4350'; c.lineWidth = 3;
    for (const x of [100, 140, 215, 255]) { c.beginPath(); c.arc(x, 162, 13, 0, Math.PI * 2); c.stroke(); }
    // scheve lamp, uit
    c.save(); c.translate(320, 175); c.rotate(0.35);
    c.fillStyle = '#3B4350'; c.fillRect(-3, -120, 6, 120);
    c.fillStyle = '#4A5260'; c.fillRect(-16, -128, 28, 9);
    c.restore();
  }, false);
}

/** Notitieblok met drie regels bij een vaste telefoon. Oorsprong: tafelblad. */
function notitie(): Prop {
  const g = new THREE.Group();
  const toestel = mat('#E3E1DC');
  g.add(mesh(new THREE.BoxGeometry(0.2, 0.05, 0.16), toestel, -0.15, 0.025, 0));
  g.add(mesh(new THREE.BoxGeometry(0.2, 0.04, 0.05), toestel, -0.15, 0.07, -0.04));
  const blok = mesh(new THREE.BoxGeometry(0.16, 0.012, 0.22), mat('#FBF7E8'), 0.1, 0.006, 0.02);
  blok.rotation.y = 0.15;
  g.add(blok);
  for (let i = 0; i < 3; i++) {
    const regel = mesh(new THREE.BoxGeometry(0.11, 0.002, 0.01), mat('#3E4652'), 0.1 + i * 0.006, 0.0135, -0.05 + i * 0.05);
    regel.rotation.y = 0.15;
    g.add(regel);
  }
  const pen = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.14, 6), mat('#3E5A6B'), 0.22, 0.008, 0.04);
  pen.rotation.set(Math.PI / 2, 0, 0.4);
  g.add(pen);
  return { group: g, anker: new THREE.Vector3(0, 0.32, 0) };
}

/** Muur naar de buren: schilderij dat trilt en geluidsgolven. Oorsprong: vloer tegen de muur. */
function muur(): Prop {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(1.6, 2.2, 0.02), mat('#E2D8C8'), 0, 1.1, 0.01));
  const lijst = new THREE.Group();
  lijst.add(mesh(new THREE.BoxGeometry(0.7, 0.5, 0.04), mat('#6B5443'), 0, 0, 0));
  lijst.add(mesh(new THREE.BoxGeometry(0.6, 0.4, 0.045), mat('#8FA67A'), 0, 0, 0.002));
  lijst.position.set(0, 1.6, 0.05);
  g.add(lijst);
  const golven: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.24, 24), new THREE.MeshBasicMaterial({ color: '#59606A', transparent: true, opacity: 0, depthWrite: false }));
    m.position.set(0, 1.0, 0.06);
    g.add(m);
    golven.push(m);
  }
  let t = 0;
  return {
    group: g,
    anker: new THREE.Vector3(0, 2.15, 0.1),
    update: (dt) => {
      t += dt;
      const vorige = Math.sin((t - dt) * 7.5), nu = Math.sin(t * 7.5);
      if (vorige < 0.95 && nu >= 0.95) geluid.dreun();
      const dreun = Math.max(0, nu) ** 8;
      lijst.rotation.z = dreun * 0.05;
      golven.forEach((m, i) => {
        const f = ((t * 0.7 + i / 3) % 1);
        m.scale.setScalar(0.6 + f * 2.4);
        (m.material as THREE.MeshBasicMaterial).opacity = (1 - f) * 0.45;
      });
    },
  };
}

/** Brief met envelop op tafel (huurverhoging). Oorsprong: tafelblad. Geen leesbare tekst. */
function brief(): Prop {
  const g = new THREE.Group();
  const vel = mesh(new THREE.BoxGeometry(0.21, 0.003, 0.297), mat('#FBF8F0'), 0, 0.0015, 0);
  vel.rotation.y = 0.18;
  g.add(vel);
  // briefhoofd en regels als vlakjes (geen tekst)
  const kop = mesh(new THREE.BoxGeometry(0.06, 0.001, 0.025), mat('#5E6B7A'), -0.05, 0.0035, -0.11);
  kop.rotation.y = 0.18; g.add(kop);
  for (let i = 0; i < 6; i++) {
    const r = mesh(new THREE.BoxGeometry(0.15 - (i % 3) * 0.02, 0.001, 0.008), mat('#9AA1AA'), 0.005, 0.0035, -0.06 + i * 0.03);
    r.rotation.y = 0.18; g.add(r);
  }
  const env = mesh(new THREE.BoxGeometry(0.22, 0.004, 0.11), mat('#E9E2D0'), 0.2, 0.002, 0.08);
  env.rotation.y = -0.3; g.add(env);
  return { group: g, anker: new THREE.Vector3(0.05, 0.3, 0) };
}

/** Raam/tuindeur met zicht op de achtertuin: een betonplaat waar de berging stond. */
function raamTuin(): Prop {
  return raam((c, w, h) => {
    const lucht = c.createLinearGradient(0, 0, 0, h);
    lucht.addColorStop(0, '#C9D8EE'); lucht.addColorStop(1, '#E6ECF5');
    c.fillStyle = lucht; c.fillRect(0, 0, w, h);
    // schutting achterin
    c.fillStyle = '#8A6E55'; c.fillRect(0, h * 0.28, w, h * 0.22);
    c.strokeStyle = '#6E5644'; c.lineWidth = 2;
    for (let x = 10; x < w; x += 22) { c.beginPath(); c.moveTo(x, h * 0.28); c.lineTo(x, h * 0.5); c.stroke(); }
    // gras
    c.fillStyle = '#8FA67A'; c.fillRect(0, h * 0.5, w, h * 0.5);
    // betonplaat in perspectief, met de afdruk van de oude berging
    c.fillStyle = '#B4B1AA';
    c.beginPath(); c.moveTo(w * 0.2, h * 0.92); c.lineTo(w * 0.8, h * 0.92); c.lineTo(w * 0.7, h * 0.58); c.lineTo(w * 0.3, h * 0.58); c.closePath(); c.fill();
    c.strokeStyle = '#8F8C86'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(w * 0.26, h * 0.86); c.lineTo(w * 0.74, h * 0.86); c.lineTo(w * 0.66, h * 0.62); c.lineTo(w * 0.34, h * 0.62); c.closePath(); c.stroke();
    c.fillStyle = '#7D7A74';
    for (const [x, y] of [[0.27, 0.85], [0.73, 0.85], [0.35, 0.63], [0.65, 0.63]]) c.fillRect(w * x - 3, h * y - 3, 6, 6);
  }, false);
}

/** Stapel post op een kastje bij de deur, met twee aanmaningen bovenop. Oorsprong: kastje-blad. */
function post(): Prop {
  const g = new THREE.Group();
  const kleuren = ['#F1EDE4', '#E9E2D0', '#F5F2EA', '#DCD6CB', '#EFE9DC', '#F1EDE4'];
  for (let i = 0; i < 6; i++) {
    const e = mesh(new THREE.BoxGeometry(0.22, 0.008, 0.11), mat(kleuren[i]), (i % 2) * 0.02 - 0.01, 0.004 + i * 0.009, (i % 3) * 0.012 - 0.01);
    e.rotation.y = (i - 3) * 0.12; g.add(e);
  }
  // twee aanmaningen: open brieven met een gekleurde balk (geen tekst)
  for (let i = 0; i < 2; i++) {
    const b = mesh(new THREE.BoxGeometry(0.21, 0.003, 0.28), mat('#FBF8F0'), 0.05 + i * 0.05, 0.06 + i * 0.004, 0.02 + i * 0.03);
    b.rotation.y = -0.3 + i * 0.25; g.add(b);
    const balk = mesh(new THREE.BoxGeometry(0.17, 0.001, 0.02), mat('#9B6A55'), 0.05 + i * 0.05, 0.063 + i * 0.004, -0.08 + i * 0.03);
    balk.rotation.y = -0.3 + i * 0.25; g.add(balk);
  }
  return { group: g, anker: new THREE.Vector3(0.03, 0.35, 0) };
}

/** Folder van een sanitairwinkel (alleen beeld: een toilet als vorm, geen tekst of merk). */
function folder(): Prop {
  const g = new THREE.Group();
  const blad = mesh(new THREE.BoxGeometry(0.15, 0.004, 0.21), mat('#FFFFFF'), 0, 0.002, 0);
  blad.rotation.y = -0.25; g.add(blad);
  const vlak = mesh(new THREE.BoxGeometry(0.13, 0.001, 0.09), mat('#9FB4C8'), -0.006, 0.0045, -0.04);
  vlak.rotation.y = -0.25; g.add(vlak);
  const pot = mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.004, 10), mat('#F4F4F2'), -0.01, 0.006, -0.04);
  g.add(pot);
  const tweede = mesh(new THREE.BoxGeometry(0.15, 0.004, 0.21), mat('#EEF2F6'), 0.04, 0.006, 0.03);
  tweede.rotation.y = 0.1; g.add(tweede);
  return { group: g, anker: new THREE.Vector3(0.02, 0.3, 0) };
}

/** Lege hoek op de overloop, naast de badkamerdeur. Oorsprong: vloer van de overloop, hoek tegen de achterwand. */
function overloop(): Prop {
  const g = new THREE.Group();
  // badkamerdeur in de achterwand
  g.add(mesh(new THREE.BoxGeometry(0.95, 2.1, 0.05), mat('#F1EFEA'), -1.15, 1.05, 0.03));
  g.add(mesh(new THREE.BoxGeometry(0.83, 2.0, 0.06), mat('#E3DED5'), -1.15, 1.0, 0.045));
  g.add(mesh(new THREE.BoxGeometry(0.1, 0.03, 0.05), mat(WORLD.metal), -0.85, 1.0, 0.09));
  // de lege hoek: lichtere vloerplanken, een stopcontact en wat plint
  g.add(mesh(new THREE.BoxGeometry(1.0, 0.012, 0.9), mat('#C9B497'), 0.2, 0.006, 0.5));
  g.add(mesh(new THREE.BoxGeometry(0.08, 0.08, 0.02), mat('#F4F2EE'), 0.45, 0.3, 0.01));
  g.add(mesh(new THREE.BoxGeometry(1.0, 0.08, 0.02), mat('#DCD6CC'), 0.2, 0.04, 0.01));
  return { group: g, anker: new THREE.Vector3(0.2, 0.9, 0.5) };
}

export const PROPS: Record<string, () => Prop> = { kraan, telefoon, laptop, raamLek, raamStalling, notitie, muur, brief, raamTuin, post, folder, overloop };
