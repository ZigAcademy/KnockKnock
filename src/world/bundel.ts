import * as THREE from 'three';

/**
 * Bundelt losse objecten (fietsen, geparkeerde auto's, kliko's) tot InstancedMeshes: alle onderdelen met
 * dezelfde geometrie en hetzelfde basismateriaal worden één draw call. Kleurvarianten van een materiaal
 * (bijv. het frame van een fiets in een eigen kleur: material.userData.basis wijst naar het origineel)
 * worden per instantie gekleurd.
 * Rijdbare auto's: het object zelf blijft (onzichtbaar) bewaard; bij instappen komt het los
 * (`activeer`) en verdwijnt zijn kopie uit de bundel.
 */
interface Slot { mesh: THREE.InstancedMesh; i: number }

export function bundel(losse: THREE.Group): void {
  losse.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(losse.matrixWorld).invert();
  const emmers = new Map<string, { geo: THREE.BufferGeometry; mat: THREE.Material; items: { m: THREE.Matrix4; kleur: THREE.Color | null; eigenaar: THREE.Object3D }[] }>();
  const mee = losse.children.filter((c) => c.userData.bundel);
  for (const obj of mee) {
    obj.updateMatrixWorld(true);
    obj.traverse((o) => {
      const me = o as THREE.Mesh;
      if (!me.isMesh || (me as THREE.InstancedMesh).isInstancedMesh) return;
      const mat = me.material as THREE.MeshStandardMaterial;
      const basis = (mat.userData.basis as THREE.MeshStandardMaterial | undefined) ?? mat;
      const sleutel = `${me.geometry.uuid}|${basis.uuid}`;
      let e = emmers.get(sleutel);
      if (!e) { e = { geo: me.geometry, mat: basis, items: [] }; emmers.set(sleutel, e); }
      e.items.push({ m: inv.clone().multiply(me.matrixWorld), kleur: mat !== basis ? mat.color.clone() : null, eigenaar: obj });
    });
  }
  const slots = new Map<THREE.Object3D, Slot[]>();
  for (const e of emmers.values()) {
    const gekleurd = e.items.some((x) => x.kleur);
    let mat = e.mat;
    if (gekleurd) { mat = (e.mat as THREE.MeshStandardMaterial).clone(); (mat as THREE.MeshStandardMaterial).color.set('#ffffff'); }
    const inst = new THREE.InstancedMesh(e.geo, mat, e.items.length);
    e.items.forEach((x, i) => {
      inst.setMatrixAt(i, x.m);
      if (gekleurd) inst.setColorAt(i, x.kleur ?? (e.mat as THREE.MeshStandardMaterial).color);
      slots.set(x.eigenaar, [...(slots.get(x.eigenaar) ?? []), { mesh: inst, i }]);
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.castShadow = true; inst.receiveShadow = true;
    inst.computeBoundingSphere();
    inst.name = 'bundel';
    losse.add(inst);
  }
  // originelen eruit; rijdbare auto's bewaren in een onzichtbare reserve (zodat ze vindbaar blijven)
  const reserve = new THREE.Group();
  reserve.name = 'reserve';
  reserve.visible = false;
  losse.add(reserve);
  const nul = new THREE.Matrix4().makeScale(0, 0, 0);
  for (const obj of mee) {
    losse.remove(obj);
    const r = obj.userData.rijdbaar as { activeer?: () => void } | undefined;
    if (!r) continue;
    reserve.add(obj);
    r.activeer = () => {
      for (const s of slots.get(obj) ?? []) { s.mesh.setMatrixAt(s.i, nul); s.mesh.instanceMatrix.needsUpdate = true; }
      losse.add(obj);
      r.activeer = undefined;
    };
  }
}
