import { t, getTaal } from '../i18n';
/** HTML/CSS-overlay boven de canvas. Interfacelabels hier; leerinhoud komt uit scenarios.json. */
export interface Melding {
  titel: string;
  sub?: string;
  tekst?: string;
  portret?: string;
  noot?: string;
}

const LOGO_LICHT = './assets/logo/ZIG_LOGO%20GROW3.png';

export class Overlay {
  readonly root: HTMLElement;
  readonly joystick: HTMLElement;
  private prompt: HTMLElement;
  private promptAdres: HTMLElement;
  private promptBtn: HTMLButtonElement;
  private toast: HTMLElement;
  private live: HTMLElement;
  private fps: HTMLElement;
  private lastFocus: HTMLElement | null = null;

  constructor(root: HTMLElement) {
    this.root = root;
    root.innerHTML = `
      <img class="logo" src="${LOGO_LICHT}" alt="Zig Grow" />
      <div class="help" data-testid="help">${t('help')}</div>
      <div class="joystick" aria-hidden="true"><div class="knob"></div></div>
      <div class="prompt" hidden data-testid="prompt">
        <span class="adres"></span>
        <button class="btn btn--cta" type="button" data-testid="aanbellen"><span class="lbl">${t('aanbellen')}</span><kbd>E</kbd></button>
      </div>
      <div class="toast" role="dialog" aria-modal="false" hidden data-testid="melding">
        <button class="close" type="button" aria-label="${t('sluiten')}">×</button>
        <div class="t-head"><img alt="" hidden /><div><h2></h2><p class="sub"></p></div></div>
        <p class="body"></p>
        <p class="later"></p>
      </div>
      <div class="sr-only" aria-live="polite"></div>
      <div class="fps" hidden></div>
    `;
    this.joystick = root.querySelector('.joystick')!;
    this.prompt = root.querySelector('.prompt')!;
    this.promptAdres = this.prompt.querySelector('.adres')!;
    this.promptBtn = this.prompt.querySelector('button')!;
    this.toast = root.querySelector('.toast')!;
    this.live = root.querySelector('[aria-live]')!;
    this.fps = root.querySelector('.fps')!;
    this.toast.querySelector('.close')!.addEventListener('click', () => this.hideMelding());
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.hideMelding(); });
    if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
    if (new URLSearchParams(location.search).has('fps')) this.fps.hidden = false;
  }

  /** Vaste labels opnieuw zetten na een taalwissel. */
  vertaal(): void {
    this.root.querySelector('.help')!.innerHTML = t('help');
    this.promptBtn.querySelector('.lbl')!.textContent = t('aanbellen');
    this.toast.querySelector('.close')!.setAttribute('aria-label', t('sluiten'));
  }

  onAanbellen(fn: () => void): void { this.promptBtn.addEventListener('click', fn); }

  /** Knop met E boven in beeld: aanbellen bij een deur (standaard), of een andere actie (instappen). */
  showPrompt(adres: string | null, knop = t('aanbellen'), hint?: string): void {
    if (adres === null) { if (!this.prompt.hidden) this.prompt.hidden = true; return; }
    const lbl = this.promptBtn.querySelector('.lbl')!;
    if (this.prompt.hidden || this.promptAdres.textContent !== adres || lbl.textContent !== knop) {
      this.promptAdres.textContent = adres;
      lbl.textContent = knop;
      this.prompt.hidden = false;
      this.announce(hint ?? t('aanbellenHint', adres));
    }
  }

  showMelding(m: Melding): void {
    this.toast.querySelector('h2')!.textContent = m.titel;
    this.toast.querySelector('.sub')!.textContent = m.sub ?? '';
    this.toast.querySelector('.body')!.textContent = m.tekst ?? '';
    const later = this.toast.querySelector<HTMLElement>('.later')!;
    later.textContent = m.noot ?? '';
    later.hidden = !m.noot;
    const img = this.toast.querySelector('img')!;
    if (m.portret) { img.src = m.portret; img.hidden = false; } else img.hidden = true;
    this.lastFocus = document.activeElement as HTMLElement | null;
    this.toast.hidden = false;
    this.toast.querySelector<HTMLButtonElement>('.close')!.focus();
    this.announce([m.titel, m.sub, m.tekst].filter(Boolean).join('. '));
  }

  hideMelding(): void {
    if (this.toast.hidden) return;
    this.toast.hidden = true;
    this.lastFocus?.focus?.();
  }

  get meldingOpen(): boolean { return !this.toast.hidden; }

  setFps(v: number): void { if (!this.fps.hidden) this.fps.textContent = `${v.toFixed(0)} fps`; }

  private announce(t: string): void { this.live.textContent = t; }
}

/**
 * Titelscherm: het Knock Knock!-logo, een taalkeuze (NL/EN) en Start.
 * Zonder logo-bestand valt het terug op de titel uit de JSON in Poppins 600.
 */
export function showTitleScreen(root: HTMLElement, titel: string, onTaal?: (taal: 'nl' | 'en') => void): Promise<void> {
  const el = document.createElement('div');
  el.className = 'titlescreen';
  el.dataset.testid = 'titelscherm';
  el.innerHTML = `
    <img class="logo" src="${LOGO_LICHT}" alt="Zig Grow" />
    <img class="titel" alt="" hidden />
    <h1></h1>
    <div class="taalkeuze" role="radiogroup" aria-label="Taal / Language">
      <button type="button" class="taal-knop" data-taal="nl" data-testid="taal-nl" role="radio">Nederlands</button>
      <button type="button" class="taal-knop" data-taal="en" data-testid="taal-en" role="radio">English</button>
    </div>
    <button class="btn" type="button" data-testid="start">${t('start')}</button>
  `;
  const h1 = el.querySelector('h1')!;
  h1.textContent = titel;
  const img = el.querySelector<HTMLImageElement>('img.titel')!;
  img.alt = titel;
  img.onload = () => { img.hidden = false; h1.classList.add('sr-only'); };
  img.src = './assets/logo/knock-knock.png';
  const knoppen = [...el.querySelectorAll<HTMLButtonElement>('.taal-knop')];
  const markeer = () => knoppen.forEach((b) => { const aan = b.dataset.taal === getTaal(); b.classList.toggle('aan', aan); b.setAttribute('aria-checked', String(aan)); });
  knoppen.forEach((b) => b.addEventListener('click', () => { onTaal?.(b.dataset.taal as 'nl' | 'en'); markeer(); }));
  markeer();
  root.appendChild(el);
  const btn = el.querySelector<HTMLButtonElement>('[data-testid="start"]')!;
  btn.focus();
  return new Promise((resolve) => {
    btn.addEventListener('click', () => { el.remove(); resolve(); }, { once: true });
  });
}
