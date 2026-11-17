/** Laadscherm in de huisstijl: GROW14-icoon op navy, voortgangsbalk in Zig-blauw. Geen tekst nodig. */
const ICOON = './assets/logo/ZIG_LOGO%20GROW14.png';

export class Laadscherm {
  private el: HTMLElement;
  private balk: HTMLElement;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'laadscherm';
    this.el.dataset.testid = 'laadscherm';
    this.el.setAttribute('role', 'progressbar');
    this.el.setAttribute('aria-valuemin', '0');
    this.el.setAttribute('aria-valuemax', '100');
    this.el.setAttribute('aria-label', 'Laden / Loading');
    this.el.innerHTML = `<img src="${ICOON}" alt="Zig Grow" /><div class="laad-spoor"><div class="laad-balk"></div></div>`;
    this.balk = this.el.querySelector('.laad-balk')!;
    root.appendChild(this.el);
  }

  zet(f: number): void {
    const p = Math.round(Math.max(0, Math.min(1, f)) * 100);
    this.balk.style.width = `${p}%`;
    this.el.setAttribute('aria-valuenow', String(p));
  }

  weg(): void {
    this.el.classList.add('klaar');
    setTimeout(() => this.el.remove(), 350);
  }
}
