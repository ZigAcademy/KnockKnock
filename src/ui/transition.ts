import { t, getTaal } from '../i18n';
/** Overgangen: zachte fade en het blauwe perspectiefwissel-scherm. */
const LOGO_DONKER = './assets/logo/ZIG_LOGO%20GROW4.png';
const WISSEL_PNG = './assets/titels/overgang-ondertussen.png';

export class Transition {
  private fadeEl: HTMLElement;
  private wisselEl: HTMLElement;

  constructor(root: HTMLElement, private reducedMotion: () => boolean) {
    this.fadeEl = document.createElement('div');
    this.fadeEl.className = 'fade';
    this.wisselEl = document.createElement('div');
    this.wisselEl.className = 'wissel';
    this.wisselEl.dataset.testid = 'wissel';
    this.wisselEl.setAttribute('role', 'status');
    root.append(this.fadeEl, this.wisselEl);
  }

  private wacht(ms: number): Promise<void> { return new Promise((r) => setTimeout(r, ms)); }

  fade(aan: boolean): Promise<void> {
    this.fadeEl.classList.toggle('aan', aan);
    return this.wacht(this.reducedMotion() ? 0 : 300);
  }

  /** Toont het blauwe scherm. `titel` is de kop (PNG uit render_titels.py als die bestaat). */
  async wissel(titel: string, rol?: { naam: string; rol: string; portret: string }, pngTitel = true): Promise<void> {
    this.wisselEl.innerHTML = `
      <img class="logo" src="${LOGO_DONKER}" alt="Zig Grow" />
      <img class="wissel-titel" alt="" hidden />
      <h2></h2>
      ${rol ? `<div class="rol"><img src="${rol.portret}" alt="" /><span>${t('jeBentNu')} <b></b><br /><small></small></span></div>` : ''}`;
    const h2 = this.wisselEl.querySelector('h2')!;
    h2.textContent = titel;
    if (pngTitel && getTaal() === 'nl') {
      const img = this.wisselEl.querySelector<HTMLImageElement>('.wissel-titel')!;
      img.alt = titel;
      img.onload = () => { img.hidden = false; h2.hidden = true; };
      img.src = WISSEL_PNG;
    }
    if (rol) {
      this.wisselEl.querySelector('.rol b')!.textContent = rol.naam;
      this.wisselEl.querySelector('.rol small')!.textContent = rol.rol;
    }
    this.wisselEl.classList.add('aan');
    await this.wacht(this.reducedMotion() ? 0 : 350);
  }

  async wisselWeg(): Promise<void> {
    this.wisselEl.classList.remove('aan');
    await this.wacht(this.reducedMotion() ? 0 : 350);
  }

  pauze(ms: number): Promise<void> { return this.wacht(ms); }
}
