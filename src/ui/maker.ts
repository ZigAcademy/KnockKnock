import { t, label } from '../i18n';
import * as THREE from 'three';
import { Character } from '../player/character';
import { HAARKLEUREN, HAARNAMEN, HUIDNAMEN, HUIDTINTEN, KAPSELS, KLEDINGNAMEN, lookVan, willekeurigeKeuze, type SpelerKeuze } from '../game/speler';
import { THEME } from '../theme';

/**
 * "Wie ben jij?": de speler kiest figuur, huidskleur, haar (of hoofddoek) en kleding,
 * met een draaiend 3D-voorbeeld. Volledig met het toetsenbord te bedienen (radioknoppen).
 */
export class SpelerMaker {
  private el: HTMLElement | null = null;

  constructor(private root: HTMLElement) {}

  open(begin: SpelerKeuze, knop = t('klaar')): Promise<SpelerKeuze> {
    let k = { ...begin };
    const el = document.createElement('div');
    el.className = 'maker';
    el.dataset.testid = 'maker';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'maker-titel');
    el.innerHTML = `
      <section class="maker-kaart">
        <h2 id="maker-titel">${t('wieBenJij')}</h2>
        <p class="maker-intro">${t('wieIntro')}</p>
        <div class="maker-keuzes"></div>
        <div class="maker-acties">
          <button type="button" class="btn btn--ghost" data-testid="maker-willekeurig">${t('kiesVoorMij')}</button>
          <button type="button" class="btn" data-testid="maker-klaar"></button>
        </div>
      </section>
      <div class="maker-voorbeeld" aria-hidden="true"><canvas></canvas></div>`;
    el.querySelector<HTMLButtonElement>('[data-testid="maker-klaar"]')!.textContent = knop;
    this.root.appendChild(el);
    this.el = el;

    // ---- 3D-voorbeeld (eigen kleine renderer, wordt na afloop opgeruimd)
    const canvas = el.querySelector('canvas')!;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight('#FFFFFF', '#B9A88F', 1.6));
    const zon = new THREE.DirectionalLight('#FFF6E8', 1.8); zon.position.set(2, 4, 3); scene.add(zon);
    const voet = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: THEME.line }));
    scene.add(voet);
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
    camera.position.set(0, 1.25, 4.6); camera.lookAt(0, 0.95, 0);
    let figuur: Character | null = null;
    let hoek = 0.5;
    const bouw = () => {
      if (figuur) scene.remove(figuur.root);
      figuur = new Character(lookVan(k));
      figuur.root.rotation.y = hoek;
      scene.add(figuur.root);
    };
    const maat = () => {
      const r = canvas.parentElement!.getBoundingClientRect();
      renderer.setSize(Math.max(1, r.width), Math.max(1, r.height), false);
      camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(maat); ro.observe(canvas.parentElement!);
    const draait = !matchMedia('(prefers-reduced-motion: reduce)').matches && !document.body.classList.contains('minder-beweging');
    let vorige = performance.now();
    renderer.setAnimationLoop((t) => {
      const dt = Math.min(0.05, (t - vorige) / 1000); vorige = t;
      if (draait) hoek += dt * 0.5;
      if (figuur) { figuur.root.rotation.y = hoek; figuur.animate(dt, 0); }
      renderer.render(scene, camera);
    });

    // ---- keuzes
    const keuzes = el.querySelector<HTMLElement>('.maker-keuzes')!;
    const groep = (naam: string, legenda: string, opties: { label: string; kleur?: string }[], gekozen: number, zet: (i: number) => void) => {
      const fs = document.createElement('fieldset');
      fs.className = `maker-groep${opties.some((o) => o.kleur) ? ' maker-groep--kleur' : ''}`;
      fs.innerHTML = `<legend>${legenda}</legend>`;
      opties.forEach((o, i) => {
        const l = document.createElement('label');
        l.className = 'maker-optie';
        l.innerHTML = `<input type="radio" name="${naam}" value="${i}" ${i === gekozen ? 'checked' : ''} />${o.kleur ? `<span class="staal" style="background:${o.kleur}"></span><span class="sr-only"></span>` : '<span class="tekst"></span>'}`;
        (l.querySelector('.sr-only, .tekst') as HTMLElement).textContent = o.label;
        l.querySelector('input')!.setAttribute('aria-label', o.label);
        l.querySelector('input')!.addEventListener('change', () => { zet(i); bouw(); teken(); });
        fs.appendChild(l);
      });
      keuzes.appendChild(fs);
    };
    const teken = () => {
      const focusNaam = (document.activeElement as HTMLInputElement | null)?.name;
      keuzes.innerHTML = '';
      groep('figuur', t('figuur'), [{ label: t('man') }, { label: t('vrouw') }], k.figuur === 'man' ? 0 : 1, (i) => { k.figuur = i ? 'vrouw' : 'man'; });
      groep('huid', t('huidskleur'), HUIDTINTEN.map((c, i) => ({ label: label(HUIDNAMEN[i]), kleur: c })), k.huid, (i) => { k.huid = i; });
      groep('kapsel', t('kapsel'), KAPSELS[k.figuur].map((x) => ({ label: label(x.naam) })), k.kapsel, (i) => { k.kapsel = i; k.hoofddoek = false; });
      groep('haar', t('haarkleur'), [...HAARKLEUREN.map((c, i) => ({ label: label(HAARNAMEN[i]), kleur: c })), { label: t('hoofddoek'), kleur: '#2C3850' }],
        k.hoofddoek ? HAARKLEUREN.length : k.haar, (i) => { if (i === HAARKLEUREN.length) k.hoofddoek = true; else { k.hoofddoek = false; k.haar = i; } });
      groep('kleding', t('kleding'), KLEDINGNAMEN[k.figuur].map((x) => ({ label: label(x) })), k.kleding, (i) => { k.kleding = i; });
      const hd = keuzes.querySelectorAll<HTMLElement>('fieldset')[3].lastElementChild as HTMLElement;
      hd.classList.add('maker-optie--hoofddoek');
      if (focusNaam) keuzes.querySelector<HTMLInputElement>(`input[name="${focusNaam}"]:checked`)?.focus();
    };
    teken();
    bouw();
    maat();
    keuzes.querySelector<HTMLInputElement>('input:checked')?.focus();

    return new Promise((resolve) => {
      el.querySelector<HTMLButtonElement>('[data-testid="maker-willekeurig"]')!.onclick = () => { k = willekeurigeKeuze(); bouw(); teken(); };
      el.querySelector<HTMLButtonElement>('[data-testid="maker-klaar"]')!.onclick = () => {
        renderer.setAnimationLoop(null);
        ro.disconnect();
        renderer.dispose();
        renderer.forceContextLoss();
        el.remove();
        this.el = null;
        resolve(k);
      };
    });
  }

  get isOpen(): boolean { return this.el !== null; }
}
