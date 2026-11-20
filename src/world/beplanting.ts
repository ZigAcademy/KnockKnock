import * as THREE from 'three';
import { kitModel, plaatsMatrix, type Plaatsing } from '../assets/modellen';
import { omgevingsTijd } from '../render/detail';

/**
 * Bomen, struiken, bloemen en gras uit de Stylized Nature MegaKit (Quaternius, CC0): echte
 * bladtexturen met zachte vormen. Per soort één InstancedMesh per materiaal, dus weinig draw calls,
 * hoe vaak een plant ook voorkomt. Wiegt in de wind (shader) en ontvangt/werpt schaduw.
 * Zonder planten-kit valt de straat terug op de oude Nature Kit-modellen.
 */

/** Oude Nature Kit-naam → model in de planten-kit. */
const VERVANG: Record<string, string> = {
  'boom-eik': 'boom-1', 'boom-dik': 'boom-1', 'boom-rond': 'boom-3', 'boom-detail': 'boom-2', 'boom-slank': 'boom-2',
  struik: 'struik', 'struik-groot': 'struik', 'struik-detail': 'struik-bloem',
  'bloem-rood': 'bloemen-1', 'bloem-paars': 'bloemen-1', 'bloem-geel': 'bloemen-2',
  gras: 'gras',
};

export class Beplanting {
  private plekken = new Map<string, THREE.Matrix4[]>();

  /** Neemt een plaatsing over als er een mooiere plant voor is; geeft false als dat niet kan. */
  neemOver(naam: string, p: Plaatsing): boolean {
    const nieuw = VERVANG[naam];
    const o = nieuw ? kitModel('planten', nieuw) : null;
    if (!nieuw || !o) return false;
    // bomen iets ronder en voller: breedte telt, hoogte volgt
    const lijst = this.plekken.get(nieuw) ?? [];
    lijst.push(plaatsMatrix(o, p));
    this.plekken.set(nieuw, lijst);
    return true;
  }

  /** Losse graspol (of andere plant uit de kit) direct op een plek. */
  voegToe(model: string, p: Plaatsing): void {
    const o = kitModel('planten', model);
    if (!o) return;
    const lijst = this.plekken.get(model) ?? [];
    lijst.push(plaatsMatrix(o, p));
    this.plekken.set(model, lijst);
  }

  /** Graspollen verspreid over rechthoeken (x0, z0, x1, z1), dichtheid per m². */
  graspollen(vlakken: [number, number, number, number, number][], dicht: number, vrij: THREE.Box3[] = []): void {
    let zaad = 4242; const rnd = () => ((zaad = (zaad * 16807) % 2147483647) / 2147483647);
    for (const [x0, z0, x1, z1, y] of vlakken) {
      const n = Math.round(Math.abs((x1 - x0) * (z1 - z0)) * dicht);
      for (let i = 0; i < n; i++) {
        const x = x0 + rnd() * (x1 - x0), z = z0 + rnd() * (z1 - z0);
        if (vrij.some((b) => x > b.min.x - 0.1 && x < b.max.x + 0.1 && z > b.min.z - 0.1 && z < b.max.z + 0.1)) continue;
        this.voegToe('gras', { x, y, z, h: 0.1 + rnd() * 0.1, rotY: rnd() * Math.PI * 2 });
      }
    }
  }

  bouw(): THREE.Group {
    const groep = new THREE.Group();
    groep.name = 'beplanting';
    // gedeelde materialen per bronmateriaal (bladeren gedempt, de rode struik groen)
    const mats = new Map<THREE.Material, THREE.Material>();
    const groenBlad = (kitModel('planten', 'struik-bloem') as THREE.Object3D | null);
    let bladTextuur: THREE.Texture | null = null;
    groenBlad?.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m?.name === 'Leaves_NormalTree') bladTextuur = m.map;
    });
    const maakMat = (bron: THREE.MeshStandardMaterial, hoogte: number): THREE.Material => {
      const m = bron.clone();
      m.alphaTest = 0.45;
      m.transparent = false;
      m.side = THREE.DoubleSide;
      m.roughness = 0.9; m.metalness = 0;
      if (bron.name === 'Leaves_TwistedTree' && bladTextuur) m.map = bladTextuur;
      const blad = /Leaves|Grass|Flowers/.test(bron.name);
      m.color = new THREE.Color(blad ? '#D9E2CF' : '#E8E2DA');
      // wind: hoe hoger in de plant, hoe meer beweging (de stam staat stil)
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uTijd = omgevingsTijd;
        sh.vertexShader = sh.vertexShader
          .replace('#include <common>', '#include <common>\nuniform float uTijd;')
          .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  float f = clamp(position.y / ${hoogte.toFixed(3)}, 0.0, 1.0);
  f = f * f * ${blad ? '1.0' : '0.35'};
  vec3 wp0 = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;
  float vlaag = 0.6 + 0.4 * sin(uTijd * 0.35 + wp0.x * 0.05);
  transformed.x += sin(uTijd * 1.6 + wp0.x * 0.45 + wp0.z * 0.3) * f * ${(hoogte * 0.025).toFixed(3)} * vlaag;
  transformed.z += cos(uTijd * 1.3 + wp0.x * 0.25 + wp0.y * 0.4) * f * ${(hoogte * 0.015).toFixed(3)} * vlaag;
}`);
      };
      m.customProgramCacheKey = () => `plant-${hoogte.toFixed(2)}-${blad}`;
      return m;
    };

    // bomen per vak van 60 m, zodat de camera bomen buiten beeld kan overslaan (frustum culling)
    const lijsten: [string, THREE.Matrix4[]][] = [];
    for (const [naam, matrices] of this.plekken) {
      if (!naam.startsWith('boom')) { lijsten.push([naam, matrices]); continue; }
      const vakken = new Map<string, THREE.Matrix4[]>();
      const p = new THREE.Vector3();
      for (const m of matrices) { p.setFromMatrixPosition(m); const k = `${Math.floor(p.x / 60)},${Math.floor(p.z / 60)}`; vakken.set(k, [...(vakken.get(k) ?? []), m]); }
      for (const l of vakken.values()) lijsten.push([naam, l]);
    }
    for (const [naam, matrices] of lijsten) {
      const model = kitModel('planten', naam);
      if (!model) continue;
      // alle meshes van het model in de ruimte van het model zelf
      const parent = model.parent;
      const orig = model.matrix.clone();
      model.removeFromParent();
      model.position.set(0, 0, 0); model.rotation.set(0, 0, 0); model.scale.set(1, 1, 1);
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const hoogte = Math.max(0.1, box.max.y - box.min.y);
      model.traverse((n) => {
        const mesh = n as THREE.Mesh;
        if (!mesh.isMesh) return;
        const bron = mesh.material as THREE.MeshStandardMaterial;
        const sleutel = `${bron.uuid}-${hoogte.toFixed(2)}` as unknown as THREE.Material;
        let mat = mats.get(sleutel);
        if (!mat) { mat = maakMat(bron, hoogte); mats.set(sleutel, mat); }
        const inst = new THREE.InstancedMesh(mesh.geometry, mat, matrices.length);
        matrices.forEach((m, i) => inst.setMatrixAt(i, m.clone().multiply(mesh.matrixWorld)));
        inst.instanceMatrix.needsUpdate = true;
        inst.castShadow = true; inst.receiveShadow = true;
        inst.computeBoundingSphere();
        inst.name = `plant-${naam}`;
        groep.add(inst);
      });
      orig.decompose(model.position, model.quaternion, model.scale);
      parent?.add(model);
    }
    return groep;
  }
}
