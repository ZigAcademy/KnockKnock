import { geluid } from '../audio/geluid';
import type { Product } from '../content/types';
import { t, getTaal, titelPng } from '../i18n';

export interface Persoon { naam: string; rol?: string; portret?: string }

/**
 * Scherm "Achter de schermen": de weg van de huurder via de Zig365-onderdelen naar de
 * medewerkers, als een korte animatie (stap voor stap, met een bolletje dat meereist).
 * Bij "minder beweging" staat alles meteen in beeld.
 */
export class AchterDeSchermen {
  private el: HTMLElement;

  constructor(root: HTMLElement, private reducedMotion: () => boolean, private stemAan: () => boolean = () => false) {
    this.el = document.createElement('div');
    this.el.className = 'ads-wrap';
    this.el.hidden = true;
    this.el.dataset.testid = 'achter-de-schermen';
    root.appendChild(this.el);
  }

  get open(): boolean { return !this.el.hidden; }

  /** stem: url's van de voice-over (intro + één per stap), afgespeeld als voice-over aan staat. */
  toon(huurder: Persoon, onderdelen: Product[], medewerkers: Persoon[], knop: string, stem?: { intro: string; stappen: string[] }): Promise<void> {
    const en = getTaal() === 'en';
    const naam = (p: Product) => (en && (p as Product & { naam_en?: string }).naam_en) || p.naam;
    const kort = (p: Product) => (en && (p as Product & { kort_en?: string }).kort_en) || p.kort;
    const persoon = (p: Persoon, cls: string) => `
      <li class="ads-stap ${cls}">
        ${p.portret ? `<img class="ads-portret" src="${p.portret}" alt="" />` : ''}
        <span class="ads-naam"></span>${p.rol ? '<span class="ads-rol"></span>' : ''}
      </li>`;
    this.el.innerHTML = `
      <section class="ads" role="dialog" aria-modal="true" aria-labelledby="ads-titel">
        <img class="ads-kop" alt="" hidden /><h2 id="ads-titel">${t('achterDeSchermen')}</h2>
        <p class="ads-intro">${t('achterIntro')}</p>
        <ol class="ads-route">
          ${persoon(huurder, 'ads-huurder')}
          ${onderdelen.map(() => `<li class="ads-stap ads-onderdeel"><span class="ads-naam"></span><span class="ads-kort"></span></li>`).join('')}
          ${medewerkers.map((m) => persoon(m, 'ads-medewerker')).join('')}
        </ol>
        <div class="ads-acties"><button type="button" class="btn" data-testid="ads-knop"></button></div>
      </section>`;
    // teksten veilig invullen
    const stappen = [...this.el.querySelectorAll<HTMLElement>('.ads-stap')];
    const vul = (li: HTMLElement, a: string, b?: string) => {
      li.querySelector('.ads-naam')!.textContent = a;
      const tweede = li.querySelector('.ads-rol, .ads-kort');
      if (tweede && b) tweede.textContent = b;
    };
    vul(stappen[0], huurder.naam, huurder.rol);
    onderdelen.forEach((p, i) => vul(stappen[1 + i], naam(p), kort(p)));
    medewerkers.forEach((m, i) => vul(stappen[1 + onderdelen.length + i], m.naam, m.rol));
    const kop = this.el.querySelector<HTMLImageElement>('.ads-kop')!;
    kop.alt = t('achterDeSchermen');
    kop.onload = () => { kop.hidden = false; this.el.querySelector('h2')!.classList.add('sr-only'); };
    kop.src = titelPng('./assets/titels/kop-achter-de-schermen.png');
    const btn = this.el.querySelector<HTMLButtonElement>('[data-testid="ads-knop"]')!;
    btn.textContent = knop;
    this.el.hidden = false;
    // stap voor stap zichtbaar maken; met voice-over in de maat van de stem
    const rm = this.reducedMotion();
    let gestopt = false;
    const toonStap = (i: number) => stappen[i]?.classList.add('zichtbaar');
    // de hele route komt meteen in beeld (stap voor stap, tenzij minder beweging)
    stappen.forEach((_, i) => {
      if (rm) toonStap(i);
      else setTimeout(() => toonStap(i), 250 + i * 450);
    });
    // voice-over: lees de route voor en laat de stap oplichten die op dat moment aan de beurt is
    if (stem && this.stemAan()) {
      (async () => {
        await geluid.spreek(stem.intro);
        for (let i = 0; i < stappen.length && !gestopt; i++) {
          stappen.forEach((li, k) => li.classList.toggle('actief', k === i));
          if (!(await geluid.spreek(stem.stappen[i]))) break;
        }
        stappen.forEach((li) => li.classList.remove('actief'));
      })();
    }
    btn.focus();
    return new Promise((r) => btn.addEventListener('click', () => { gestopt = true; geluid.stopSpreken(); this.el.hidden = true; this.el.innerHTML = ''; r(); }, { once: true }));
  }
}
