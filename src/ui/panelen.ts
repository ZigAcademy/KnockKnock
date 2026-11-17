import { t, tx, getTaal } from '../i18n';
import type { Scenarios } from '../content/types';
import type { Progress } from '../game/progress';
import type { Settings } from '../game/settings';
import { hartjesHtml } from './cards';

/** Modaal paneel met focus-beheer (Escape sluit, focus terug naar de knop). */
class Paneel {
  readonly el: HTMLElement;
  private terug: HTMLElement | null = null;
  onSluit: (() => void) | null = null;

  constructor(root: HTMLElement, cls: string, testid: string) {
    this.el = document.createElement('div');
    this.el.className = `paneel-wrap ${cls}`;
    this.el.hidden = true;
    this.el.dataset.testid = testid;
    root.appendChild(this.el);
    this.el.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); this.sluit(); } });
  }

  get open(): boolean { return !this.el.hidden; }

  protected toon(html: string): void {
    this.terug = document.activeElement as HTMLElement | null;
    this.el.innerHTML = html;
    this.el.hidden = false;
    this.el.querySelectorAll<HTMLElement>('[data-sluit]').forEach((b) => { b.onclick = () => this.sluit(); });
    (this.el.querySelector<HTMLElement>('[autofocus], button, input, select') ?? this.el).focus();
  }

  sluit(): void {
    if (this.el.hidden) return;
    this.el.hidden = true;
    this.terug?.focus?.();
    this.onSluit?.();
  }
}

export class InstellingenPaneel extends Paneel {
  /** Opent "Wie ben jij?" om je personage aan te passen. */
  onPersonage: (() => void) | null = null;

  constructor(root: HTMLElement, private settings: Settings) { super(root, 'paneel--instellingen', 'instellingen'); }

  openen(): void {
    const w = this.settings.waarden;
    this.toon(`
      <section class="paneel" role="dialog" aria-modal="true" aria-labelledby="inst-titel">
        <h2 id="inst-titel">${t('instellingen')}</h2>
        <label class="schakel"><input type="checkbox" data-k="geluid" ${w.geluid ? 'checked' : ''} /> <span>${t('geluid')}</span></label>
        <label class="schakel"><input type="checkbox" data-k="voiceOver" ${w.voiceOver ? 'checked' : ''} /> <span>${t('voiceOver')}</span></label>
        <label class="schakel"><input type="checkbox" data-k="minderBeweging" ${this.settings.minderBeweging ? 'checked' : ''} /> <span>${t('minderBeweging')}</span></label>
        <label class="kies"><span>${t('taal')}</span>
          <select data-k="taal" data-testid="taal"><option value="nl" ${w.taal === 'nl' ? 'selected' : ''}>Nederlands</option><option value="en" ${w.taal === 'en' ? 'selected' : ''}>English</option></select>
        </label>
        <button type="button" class="btn btn--ghost" data-testid="personage-aanpassen" data-personage>${t('personageAanpassen')}</button>
        <p class="paneel-noot">${t('noot')}</p>
        <div class="paneel-acties"><button type="button" class="btn" data-sluit>${t('klaar')}</button></div>
      </section>`);
    this.el.querySelector<HTMLButtonElement>('[data-personage]')!.onclick = () => { this.sluit(); this.onPersonage?.(); };
    this.el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((inp) => {
      inp.onchange = () => this.settings.zet(inp.dataset.k as 'geluid' | 'voiceOver' | 'minderBeweging', inp.checked);
    });
    // taal wisselen: direct toepassen en het paneel in de nieuwe taal opnieuw tonen
    this.el.querySelector<HTMLSelectElement>('select[data-k="taal"]')!.onchange = (e) => {
      this.settings.zet('taal', (e.target as HTMLSelectElement).value as 'nl' | 'en');
      this.openen();
      this.el.querySelector<HTMLSelectElement>('select[data-k="taal"]')?.focus();
    };
  }
}

const KOP_COMPLEET = './assets/titels/kop-straat-compleet.png';

export class Eindscherm extends Paneel {
  constructor(root: HTMLElement, private content: Scenarios, private progress: Progress) { super(root, 'paneel--eind', 'eindscherm'); }

  openen(compleet: boolean): void {
    const mvp = this.content.woningen.filter((w) => w.mvp);
    let hart = 0, hartMax = 0, proces = 0, procesMax = 0;
    const rijen = mvp.map((w) => {
      const v = this.progress.woningen.get(w.id);
      const hm = w.huurderfase ? w.huurderfase.dialoog.reduce((s, q) => s + Math.max(...q.opties.map((o) => o.score)), 0) : 0;
      const pm = w.corporatiefase.reduce((s, d) => s + d.stappen.length, 0);
      hartMax += hm; procesMax += pm;
      hart += v?.huurder?.score ?? 0; proces += v?.proces?.score ?? 0;
      const af = v?.af === true;
      return `<li class="eind-rij ${af ? 'is-af' : ''}">
        <span class="eind-status" aria-hidden="true">${af ? '✓' : ''}</span>
        <div class="eind-info">
          <p class="eind-adres">${esc(w.adres)} <span>· ${esc(tx(w.titel))}</span></p>
          ${af && w.huurderfase ? `<p class="eind-leerpunt">${esc(tx(w.huurderfase.leerpunt))}</p>` : `<p class="eind-open">${af ? '' : t('nogNiet')}</p>`}
        </div>
        <div class="eind-score">${hartjesHtml({ score: v?.huurder?.score ?? 0, max: hm })}<small>${t('proceskennis')} ${v?.proces?.score ?? 0} / ${pm}</small></div>
      </li>`;
    }).join('');
    const pct = procesMax ? Math.round((proces / procesMax) * 100) : 0;
    this.toon(`
      <section class="paneel paneel--breed" role="dialog" aria-modal="true" aria-labelledby="eind-titel">
        <div class="eind-kop">
          <img class="eind-logo" src="./assets/logo/ZIG_LOGO%20GROW4.png" alt="Zig Grow" />
          <img class="eind-img" alt="" hidden />
          <h2 id="eind-titel">${compleet ? t('straatCompleet') : t('overzicht')}</h2>
        </div>
        <ul class="eind-lijst">${rijen}</ul>
        <div class="eind-totaal" data-testid="eind-totaal">
          <div><small>${t('huurderstevredenheid')}</small><b>${hart} / ${hartMax}</b></div>
          <div><small>${t('proceskennis')}</small><b>${proces} / ${procesMax} (${pct}%)</b></div>
        </div>
        <div class="paneel-acties"><button type="button" class="btn" data-sluit>${t('verderRondlopen')}</button></div>
      </section>`);
    if (compleet && getTaal() === 'nl') {
      const img = this.el.querySelector<HTMLImageElement>('.eind-img')!;
      const h2 = this.el.querySelector('h2')!;
      img.alt = h2.textContent ?? '';
      img.onload = () => { img.hidden = false; h2.classList.add('sr-only'); };
      img.src = KOP_COMPLEET;
    }
  }
}

function esc(t: string): string {
  return t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
