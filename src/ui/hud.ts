import { t } from '../i18n';
import type { Settings } from '../game/settings';

/** Meters (huurderstevredenheid, proceskennis) en knoppen rechtsboven. */
export interface Meters { hart: number; hartMax: number; proces: number; procesMax: number }

const ICON = {
  geluidAan: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  geluidUit: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  stem: '<path d="M4 5h16v10H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8 9h8M8 12h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  lijst: '<path d="M5 6h14M5 12h14M5 18h14" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  reset: '<path d="M5 12a7 7 0 1 0 2.1-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="2"/>',
  tandwiel: '<circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
};
const svg = (p: string) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">${p}</svg>`;

export class Hud {
  readonly el: HTMLElement;
  onOverzicht: (() => void) | null = null;
  onInstellingen: (() => void) | null = null;
  onReset: (() => void) | null = null;

  constructor(root: HTMLElement, private settings: Settings) {
    this.el = document.createElement('div');
    this.el.className = 'hud';
    this.el.hidden = true;
    this.el.innerHTML = `
      <div class="meter" data-testid="meter-huurder" title="Huurderstevredenheid">
        <span class="meter-icoon hart vol" aria-hidden="true">♥</span>
        <span class="meter-tekst"><small data-l="huurderstevredenheid"></small><b></b></span>
      </div>
      <div class="meter" data-testid="meter-proces" title="Proceskennis">
        <span class="meter-balk" aria-hidden="true"><span></span></span>
        <span class="meter-tekst"><small data-l="proceskennis"></small><b></b></span>
      </div>
      <button type="button" class="hud-knop" data-k="geluid" data-testid="knop-geluid"></button>
      <button type="button" class="hud-knop" data-k="stem" data-testid="knop-voiceover" aria-label="Voice-over">${svg(ICON.stem)}</button>
 <button type="button" class="hud-knop" data-k="reset" data-testid="knop-reset" aria-label="Personage terugzetten" title="Personage terugzetten (vastgelopen? Je voortgang blijft bewaard)">${svg(ICON.reset)}</button>
      <button type="button" class="hud-knop" data-k="lijst" data-testid="knop-overzicht" aria-label="Overzicht">${svg(ICON.lijst)}</button>
      <button type="button" class="hud-knop" data-k="instellingen" data-testid="knop-instellingen" aria-label="Instellingen">${svg(ICON.tandwiel)}</button>`;
    root.appendChild(this.el);
    const knop = (k: string) => this.el.querySelector<HTMLButtonElement>(`[data-k="${k}"]`)!;
    knop('geluid').onclick = () => settings.zet('geluid', !settings.waarden.geluid);
    knop('stem').onclick = () => settings.zet('voiceOver', !settings.waarden.voiceOver);
    knop('lijst').onclick = () => this.onOverzicht?.();
    knop('reset').onclick = () => this.onReset?.();
    knop('instellingen').onclick = () => this.onInstellingen?.();
    settings.onChange(() => this.knoppen());
    this.knoppen();
  }

  show(on: boolean): void { this.el.hidden = !on; }

  /** Labels opnieuw zetten na een taalwissel. */
  vertaal(): void { this.knoppen(); }

  private knoppen(): void {
    const g = this.el.querySelector<HTMLButtonElement>('[data-k="geluid"]')!;
    const aan = this.settings.waarden.geluid;
    g.innerHTML = svg(aan ? ICON.geluidAan : ICON.geluidUit);
    g.setAttribute('aria-label', t('geluid'));
    this.el.querySelectorAll<HTMLElement>('[data-l]').forEach((e) => { e.textContent = t(e.dataset.l!); });
    this.el.querySelector('[data-testid="meter-huurder"]')!.setAttribute('title', t('huurderstevredenheid'));
    this.el.querySelector('[data-testid="meter-proces"]')!.setAttribute('title', t('proceskennis'));
    for (const [k, l] of [['stem', 'voiceOver'], ['lijst', 'overzicht'], ['instellingen', 'instellingen'], ['reset', 'terugzetten']]) this.el.querySelector(`[data-k="${k}"]`)?.setAttribute('aria-label', t(l));
    this.el.querySelector('[data-k="reset"]')?.setAttribute('title', t('terugzettenTitel'));
    g.setAttribute('aria-pressed', String(aan));
    const s = this.el.querySelector<HTMLButtonElement>('[data-k="stem"]')!;
    s.setAttribute('aria-pressed', String(this.settings.waarden.voiceOver));
    s.classList.toggle('uit', !this.settings.waarden.voiceOver);
  }

  zet(m: Meters): void {
    const [h, p] = this.el.querySelectorAll<HTMLElement>('.meter-tekst b');
    h.textContent = `${m.hart} / ${m.hartMax}`;
    p.textContent = `${m.proces} / ${m.procesMax}`;
    this.el.querySelector<HTMLElement>('.meter-balk span')!.style.width = `${m.procesMax ? (m.proces / m.procesMax) * 100 : 0}%`;
  }
}
