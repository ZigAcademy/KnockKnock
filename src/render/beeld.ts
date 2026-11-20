import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode,
  SMAAEffect, VignetteEffect, BrightnessContrastEffect, HueSaturationEffect,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';

/**
 * Beeldkwaliteit: met "hoog" gaat alles door een nabewerkingsketen (postprocessing, Zlib-licentie):
 *  - SSAO (N8AO, ISC-licentie): zachte schaduw in hoeken, onder dakranden en waar voeten de grond raken;
 *  - subtiele bloom op lampen, verlichte ramen en de markeringen;
 *  - Neutral-tone mapping (kleuren blijven trouw aan de huisstijl), iets meer contrast, en een zachte vignet;
 *  - SMAA-anti-aliasing (hardware-AA werkt niet samen met SSAO).
 * Met "laag" rendert three.js direct, precies zoals voorheen.
 * "auto" begint hoog en zakt naar laag als de framerate een paar seconden onder 40 fps blijft.
 */
export type Kwaliteit = 'auto' | 'hoog' | 'laag';

export class Beeld {
  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private ao: N8AOPostPass | null = null;
  private actief: 'hoog' | 'laag' = 'laag';
  keuze: Kwaliteit = 'auto';
  private meet = { tijd: 0, frames: 0, traag: 0, vorige: 0 };
  /** Wordt aangeroepen als "auto" zelf naar laag is gezakt. */
  onAutoLaag: (() => void) | null = null;

  constructor(private renderer: THREE.WebGLRenderer) {}

  get modus(): 'hoog' | 'laag' { return this.actief; }

  zetKwaliteit(k: Kwaliteit): void {
    this.keuze = k;
    this.meet = { tijd: 0, frames: 0, traag: 0, vorige: 0 };
    this.activeer(k === 'laag' ? 'laag' : 'hoog');
  }

  private activeer(m: 'hoog' | 'laag'): void {
    this.actief = m;
    const r = this.renderer;
    if (m === 'laag') {
      // precies zoals voorheen: geen tone mapping
      r.toneMapping = THREE.NoToneMapping;
      return;
    }
    // bij nabewerking doet de keten de tone mapping
    r.toneMapping = THREE.NoToneMapping;
    if (!this.composer) this.bouw();
  }

  private bouw(): void {
    const r = this.renderer;
    const size = r.getSize(new THREE.Vector2());
    const composer = new EffectComposer(r, { frameBufferType: THREE.HalfFloatType });
    const dummy = new THREE.Scene(), cam = new THREE.PerspectiveCamera();
    this.renderPass = new RenderPass(dummy, cam);
    composer.addPass(this.renderPass);
    const ao = new N8AOPostPass(dummy, cam, size.x, size.y);
    Object.assign(ao.configuration, {
      aoRadius: 1.6, distanceFalloff: 1.0, intensity: 2.2, color: new THREE.Color('#1C2530'),
      halfRes: true, aoSamples: 12, denoiseSamples: 6, denoiseRadius: 10, gammaCorrection: false,
      transparencyAware: false,
    });
    // markeringen en glas schrijven geen diepte; de aparte transparantie-pass van N8AO maakte ze zwart
    (ao as unknown as { autoDetectTransparency: boolean }).autoDetectTransparency = false;
    composer.addPass(ao);
    this.ao = ao;
    composer.addPass(new EffectPass(cam,
      new BloomEffect({ luminanceThreshold: 0.82, luminanceSmoothing: 0.25, intensity: 0.55, mipmapBlur: true, radius: 0.6 }),
      new HueSaturationEffect({ saturation: 0.06 }),
      new BrightnessContrastEffect({ brightness: 0.0, contrast: 0.06 }),
      // Neutral (Khronos PBR Neutral) houdt kleur en verzadiging trouw: Zig-blauw en -oranje blijven fel
      new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
      new VignetteEffect({ offset: 0.38, darkness: 0.32 }),
      new SMAAEffect(),
    ));
    composer.setSize(size.x, size.y);
    this.composer = composer;
  }

  setSize(w: number, h: number): void { this.composer?.setSize(w, h); }

  /** Render één beeld; meet ook de framerate voor "auto". */
  render(scene: THREE.Scene, camera: THREE.Camera, dt: number): void {
    if (this.actief === 'laag' || !this.composer || !this.renderPass || !this.ao) {
      this.renderer.render(scene, camera);
    } else {
      if (this.renderPass.mainScene !== scene || this.renderPass.mainCamera !== camera) {
        this.renderPass.mainScene = scene;
        this.renderPass.mainCamera = camera;
        this.ao.scene = scene;
        this.ao.camera = camera;
        this.composer.setMainScene(scene);
        this.composer.setMainCamera(camera);
      }
      this.composer.render(dt);
    }
    this.bewaak(dt);
  }

  /** Auto: blijft het 3 meetvensters van 1 s onder 40 fps, dan naar laag (voor deze sessie). */
  private bewaak(dt: number): void {
    if (this.keuze !== 'auto' || this.actief !== 'hoog') return;
    // echte tijd (niet de speltijd, die is per beeld begrensd en loopt op een trage computer achter)
    const m = this.meet, nu = performance.now() / 1000;
    void dt;
    if (m.vorige) m.tijd += Math.min(1, nu - m.vorige);
    m.vorige = nu; m.frames++;
    if (m.tijd < 1) return;
    const fps = m.frames / m.tijd;
    m.traag = fps < 40 ? m.traag + 1 : 0;
    m.tijd = 0; m.frames = 0;
    if (m.traag >= 3) { this.activeer('laag'); this.onAutoLaag?.(); }
  }
}
