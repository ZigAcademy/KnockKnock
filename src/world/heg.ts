import * as THREE from 'three';
import { omgevingsTijd } from '../render/detail';

/**
 * Losse blaadjes langs de heggen: kleine takjes (public/assets/omgeving/heg_blad.png, gemaakt met tools/heg.mjs
 * uit CC0-bladeren) net buiten het oppervlak, schuin en willekeurig gedraaid. Zo is een heg geen gladde doos meer
 * maar een geschoren haag met een rafelige rand. Eén InstancedMesh (één draw call), wiegt licht in de wind.
 */
export function hegBlaadjes(heggen: THREE.Box3[], kleur: string): THREE.Object3D | null {
  if (!heggen.length) return null;
  const tex = new THREE.TextureLoader().load('./assets/omgeving/heg_blad.png');
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85, color: new THREE.Color(kleur).lerp(new THREE.Color('#ffffff'), 0.18) });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTijd = omgevingsTijd;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTijd;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vec3 hp = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
transformed.x += sin(uTijd * 1.7 + hp.x * 1.3 + hp.z * 0.7) * 0.015 * (position.y + 0.5);`);
  };
  mat.customProgramCacheKey = () => 'heg-blad';
  // per vierkante meter zoveel takjes
  const dicht = 38;
  const rnd = (() => { let z = 1234567; return () => ((z = (z * 16807) % 2147483647) / 2147483647); })();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const lijst: THREE.Matrix4[] = [];
  for (const b of heggen) {
    const mx = b.max, mn = b.min, w = mx.x - mn.x, h = mx.y - mn.y, d = mx.z - mn.z;
    // vlakken: boven, voor/achter (±z), links/rechts (±x)
    const vlakken: [number, (u: number, v: number) => THREE.Vector3, THREE.Vector3][] = [
      [w * d, (u, v) => new THREE.Vector3(mn.x + u * w, mx.y, mn.z + v * d), new THREE.Vector3(0, 1, 0)],
      [w * h, (u, v) => new THREE.Vector3(mn.x + u * w, mn.y + 0.12 + v * (h - 0.12), mx.z), new THREE.Vector3(0, 0, 1)],
      [w * h, (u, v) => new THREE.Vector3(mn.x + u * w, mn.y + 0.12 + v * (h - 0.12), mn.z), new THREE.Vector3(0, 0, -1)],
      [d * h, (u, v) => new THREE.Vector3(mx.x, mn.y + 0.12 + v * (h - 0.12), mn.z + u * d), new THREE.Vector3(1, 0, 0)],
      [d * h, (u, v) => new THREE.Vector3(mn.x, mn.y + 0.12 + v * (h - 0.12), mn.z + u * d), new THREE.Vector3(-1, 0, 0)],
    ];
    for (const [opp, punt, n] of vlakken) {
      const aantal = Math.round(opp * dicht);
      for (let i = 0; i < aantal; i++) {
        p.copy(punt(rnd(), rnd())).addScaledVector(n, 0.01 + rnd() * 0.05);
        // takje ongeveer langs het oppervlak, iets naar buiten gekanteld
        e.set((rnd() - 0.5) * 2.4, rnd() * Math.PI * 2, (rnd() - 0.5) * 2.4);
        q.setFromEuler(e);
        const k = 0.15 + rnd() * 0.12;
        s.set(k, k, k);
        m.compose(p, q, s);
        lijst.push(m.clone());
      }
    }
  }
  const inst = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, lijst.length);
  lijst.forEach((x, i) => inst.setMatrixAt(i, x));
  inst.instanceMatrix.needsUpdate = true;
  inst.receiveShadow = true;
  inst.computeBoundingSphere();
  inst.name = 'heg-blaadjes';
  return inst;
}
