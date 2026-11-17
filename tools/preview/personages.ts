// Ontwikkelhulp: alle personages naast elkaar (?zoom=hoofd voor close-ups, ?anim=Walk)
import * as THREE from 'three';
import { laadModellen } from '../../src/assets/modellen';
import { Character, ZIT } from '../../src/player/character';
import { SPELER_LOOK, HUURDER_LOOK, MEDEWERKER_LOOK, DECOR_LOOKS } from '../../src/world/looks';
const q = new URLSearchParams(location.search);
await laadModellen();
const r = new THREE.WebGLRenderer({ antialias: true }); r.setSize(innerWidth, innerHeight); document.body.appendChild(r.domElement);
const s = new THREE.Scene(); s.background = new THREE.Color('#EAF0FF');
s.add(new THREE.HemisphereLight('#fff', '#9a8', 1.6)); const d = new THREE.DirectionalLight('#fff', 2); d.position.set(2, 6, 8); s.add(d);
import('../../src/assets/modellen');
const KAPSELLIJST = ['man-krul', 'man-kort', 'man-scheiding', 'man-golf', 'man-lang', 'vrouw-bob', 'vrouw-staart', 'vrouw-opgestoken', 'vrouw-pixie', 'vrouw-kort'];
const looks = q.get('set') === 'kapsels' ? KAPSELLIJST.map((k) => ({ outfit: (k.startsWith('man') ? 'man-casual' : 'vrouw-casual') as never, shirt: '#1F5AFF', skin: '#E0B394', hair: '#8A643F', trousers: '#2C3850', kapsel: k as never })) : q.get('set') === 'decor' ? DECOR_LOOKS : [SPELER_LOOK, HUURDER_LOOK.farouk, HUURDER_LOOK.mensah, HUURDER_LOOK.hansen, MEDEWERKER_LOOK.anna, MEDEWERKER_LOOK.fatima, MEDEWERKER_LOOK.tariq];
const only = q.get('only')?.split(',').map(Number);
const lijst = q.get('zit') ? [] : only ? looks.filter((_, i) => only.includes(i)) : looks;
const chars: Character[] = [];
lijst.forEach((l, i) => { const c = new Character(l); c.root.position.x = (i - (lijst.length - 1) / 2) * 0.6; s.add(c.root); chars.push(c); if (q.get('basis')) c.setBasis(q.get('basis') as never); });
if (q.get('cfg')) { const cfg = JSON.parse(q.get('cfg')!); ZIT.forEach((z) => { if (cfg[z[0]] !== undefined) z[1] = cfg[z[0]]; }); }
if (q.get('zit')) { const c = new Character(MEDEWERKER_LOOK.anna); c.zit = true; c.root.position.set(0, 0, -1.5); c.root.rotation.y = q.get('zit') === 'zij' ? Math.PI / 2 : 0; s.add(c.root); chars.push(c);
  const stoel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), new THREE.MeshStandardMaterial({ color: '#555' })); stoel.position.set(0, 0.47, -1.55); s.add(stoel); }
const cam = new THREE.PerspectiveCamera(q.get('zoom') ? 6 : 30, innerWidth / innerHeight, 0.1, 100);
if (q.get('zoom')) { cam.position.set(0, 1.5, 9); cam.lookAt(0, 1.45, 0); } else if (q.get('cfg')) { const cfg = JSON.parse(q.get('cfg')!); ZIT.forEach((z) => { if (cfg[z[0]] !== undefined) z[1] = cfg[z[0]]; }); }
if (q.get('zit')) { if (q.get('zit') === 'zij') { cam.position.set(0, 0.9, 3); cam.lookAt(0, 0.8, -1.5); } else { cam.position.set(2.5, 1.5, 1.5); cam.lookAt(0, 0.8, -1.5); } } else { cam.position.set(0, 1.4, 9); cam.lookAt(0, 0.95, 0); }
const speed = Number(q.get('speed') ?? 0);
for (let i = 0; i < 60; i++) chars.forEach((c) => c.animate(1 / 30, speed));
if (q.get('act')) chars.forEach((c) => c.speel(q.get('act') as never));
for (let i = 0; i < 20; i++) chars.forEach((c) => c.animate(1 / 30, speed));
r.render(s, cam);
(window as any).klaar = true;
