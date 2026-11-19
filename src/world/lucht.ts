import * as THREE from 'three';

/**
 * Sfeer in de lucht: een paar vogels die rondjes vliegen (één InstancedMesh) en rook uit
 * een paar schoorstenen (één Points-object met zachte puffen). Puur decor.
 */
export class LuchtLeven {
  private vogels: THREE.InstancedMesh;
  private banen: { c: THREE.Vector3; r: number; v: number; fase: number; h: number }[] = [];
  private rook: THREE.Points;
  private puf: { bron: THREE.Vector3; t: number; duur: number }[] = [];
  private tmp = new THREE.Object3D();

  constructor(scene: THREE.Scene, schoorstenen: THREE.Vector3[]) {
    // vogel: een platte V (twee vleugels), klappen door de vleugels in hoogte te schalen
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      -0.35, 0.08, -0.05, 0, 0, 0.12, 0, 0, -0.08,
      0.35, 0.08, -0.05, 0, 0, -0.08, 0, 0, 0.12,
    ], 3));
    g.computeVertexNormals();
    this.vogels = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: '#2E3440', side: THREE.DoubleSide }), 7);
    this.vogels.name = 'vogels';
    this.vogels.frustumCulled = false;
    for (let i = 0; i < 7; i++) {
      const groep = i < 4 ? 0 : 1;
      this.banen.push({
        c: new THREE.Vector3(groep ? 26 : 2, 0, groep ? -4 : 20),
        r: 14 + (i % 3) * 2.5, v: (groep ? -1 : 1) * (0.16 + (i % 2) * 0.02),
        fase: i * 0.32, h: 13 + (i % 4) * 0.8,
      });
    }
    scene.add(this.vogels);

    // rook: zachte ronde puffen die opstijgen, groter worden en vervagen
    const per = 7;
    const n = schoorstenen.length * per;
    const pos = new Float32Array(n * 3), alpha = new Float32Array(n), grootte = new Float32Array(n);
    schoorstenen.forEach((b, s) => { for (let k = 0; k < per; k++) this.puf.push({ bron: b, t: k / per, duur: 6 + (s % 3) }); });
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pg.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
    pg.setAttribute('aGrootte', new THREE.BufferAttribute(grootte, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uSchaal: { value: 600 } }]),
      vertexShader: `attribute float aAlpha; attribute float aGrootte; uniform float uSchaal; varying float vA;
        #include <fog_pars_vertex>
        void main() { vA = aAlpha; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aGrootte * uSchaal / -mvPosition.z;
          #include <fog_vertex>
        }`,
      fragmentShader: `varying float vA;
        #include <fog_pars_fragment>
        void main() { float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.15, d) * vA; if (a < 0.01) discard;
          gl_FragColor = vec4(vec3(0.93, 0.93, 0.95), a);
          #include <fog_fragment>
        }`,
    });
    this.rook = new THREE.Points(pg, mat);
    this.rook.name = 'rook';
    this.rook.frustumCulled = false;
    scene.add(this.rook);
  }

  /** Schaal van de puffen meeschalen met de vensterhoogte. */
  resize(hoogte: number): void { (this.rook.material as THREE.ShaderMaterial).uniforms.uSchaal.value = hoogte * 0.75; }

  update(dt: number, t: number, reducedMotion: boolean): void {
    if (reducedMotion) dt = 0;
    this.banen.forEach((b, i) => {
      const a = t * b.v + b.fase;
      const x = b.c.x + Math.cos(a) * b.r, z = b.c.z + Math.sin(a) * b.r * 0.6;
      this.tmp.position.set(x, b.h + Math.sin(t * 0.7 + i) * 0.6, z);
      // kijkrichting: langs de baan
      this.tmp.rotation.set(0, Math.atan2(-Math.sin(a) * Math.sign(b.v), Math.cos(a) * 0.6 * Math.sign(b.v)), 0);
      const klap = reducedMotion ? 1 : 0.35 + Math.abs(Math.sin(t * 9 + i * 1.7)) * 1.2;
      this.tmp.scale.set(1, klap, 1);
      this.tmp.updateMatrix();
      this.vogels.setMatrixAt(i, this.tmp.matrix);
    });
    this.vogels.instanceMatrix.needsUpdate = true;

    const g = this.rook.geometry;
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    const al = g.getAttribute('aAlpha') as THREE.BufferAttribute, gr = g.getAttribute('aGrootte') as THREE.BufferAttribute;
    this.puf.forEach((p, i) => {
      p.t = (p.t + dt / p.duur) % 1;
      const f = p.t;
      pos.setXYZ(i, p.bron.x + f * 1.8 + Math.sin(f * 6 + i) * 0.15, p.bron.y + f * 4.5, p.bron.z + f * 0.6);
      al.setX(i, Math.sin(Math.PI * Math.min(1, f * 1.15)) * 0.45 * (1 - f * 0.5));
      gr.setX(i, 0.5 + f * 2.2);
    });
    pos.needsUpdate = true; al.needsUpdate = true; gr.needsUpdate = true;
  }
}
