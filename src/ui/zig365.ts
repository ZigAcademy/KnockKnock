import { geluid } from '../audio/geluid';
import type { Stap, KeuzeStap, VolgordeStap } from '../content/types';
import { shuffle } from './cards';
import { t, tx, stapOpties, stapItems } from '../i18n';

/**
 * Gestileerd, fictief Zig365-scherm. Geen echte UI of screenshots: alleen de
 * herkenbare modulenamen als decor. De opdrachten en uitleg komen uit scenarios.json.
 */
export interface Zig365Context {
  medewerker: { naam: string; rol: string; portret: string };
  huurder: { naam: string; adres: string };
  titel: string;
}

const MODULES = ['Customer', 'Operations', 'Maintenance'];

export class Zig365Scherm {
  private oefen = false;
  private el: HTMLElement;
  private main!: HTMLElement;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'z365-wrap';
    this.el.hidden = true;
    this.el.dataset.testid = 'zig365';
    root.appendChild(this.el);
  }

  get open(): boolean { return !this.el.hidden; }

  toon(ctx: Zig365Context): void {
    this.el.innerHTML = `
      <section class="z365" role="region" aria-label="${t('zig365Regio')}">
        <header class="z365-top">
          <span class="z365-naam">Zig365</span>
          <nav class="z365-tabs" aria-hidden="true">${MODULES.map((m) => `<span>${m}</span>`).join('')}</nav>
          <span class="z365-gebruiker"><img src="${ctx.medewerker.portret}" alt="" /><span><b></b><small></small></span></span>
        </header>
        <div class="z365-body">
          <aside class="z365-side">
            <p class="z365-label">${t('klant')}</p>
            <p class="z365-klant"></p>
            <p class="z365-adres"></p>
            <p class="z365-label">${t('onderwerp')}</p>
            <p class="z365-titel"></p>
          </aside>
          <main class="z365-main"></main>
        </div>
      </section>`;
    const q = (s: string) => this.el.querySelector<HTMLElement>(s)!;
    q('.z365-gebruiker b').textContent = ctx.medewerker.naam;
    q('.z365-gebruiker small').textContent = ctx.medewerker.rol;
    q('.z365-klant').textContent = ctx.huurder.naam;
    q('.z365-adres').textContent = ctx.huurder.adres;
    q('.z365-titel').textContent = ctx.titel;
    this.main = q('.z365-main');
    this.el.hidden = false;
    geluid.speel('scherm-open', { vol: 0.35 });
  }

  sluit(): void {
    if (!this.el.hidden) geluid.speel('scherm-dicht', { vol: 0.3 });
    this.setKeys(null);
    this.el.hidden = true;
    this.el.innerHTML = '';
  }

  /** Toont één stap. Resolvet met true als het bij de eerste poging goed was. */
  stap(stap: Stap, nr: number, totaal: number, punten: number, laatste: boolean, oefen = false): Promise<boolean> {
    this.oefen = oefen;
    this.main.innerHTML = `
      <div class="z365-kop"><span class="z365-stapnr">${oefen ? t('oefenvraagVan', nr, totaal) : t('opdrachtVan', nr, totaal)}</span>${oefen ? `<span class="z365-punten z365-oefen" data-testid="oefenmodus">${t('telNietMee')}</span>` : `<span class="z365-punten" data-testid="proceskennis">${t('proceskennisPunten', punten)}</span>`}</div>
      <h2 class="z365-vraag" tabindex="-1"></h2>
      <div class="z365-stap"></div>
      <div class="z365-feedback" role="status"></div>
      <div class="z365-acties"></div>`;
    const vraag = this.main.querySelector<HTMLElement>('.z365-vraag')!;
    vraag.textContent = tx(stap.vraag);
    return stap.type === 'volgorde' ? this.volgorde(stap, laatste) : this.keuze(stap, laatste);
  }

  private async keuze(stap: KeuzeStap, laatste: boolean): Promise<boolean> {
    const box = this.main.querySelector<HTMLElement>('.z365-stap')!;
    box.classList.add(stap.type === 'systeem' ? 'z365-tegels' : 'z365-lijst');
    const opties = stapOpties(stap);
    const volgorde = shuffle(opties.map((_, i) => i));
    const knoppen = volgorde.map((idx, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'z365-optie';
      b.dataset.testid = 'z365-optie';
      b.innerHTML = `<span class="z365-optie-nr">${i + 1}</span><span class="z365-optie-tekst"></span>`;
      b.querySelector('.z365-optie-tekst')!.textContent = opties[idx];
      box.appendChild(b);
      return b;
    });
    knoppen[0].focus();
    const gekozen = await new Promise<number>((resolve) => {
      knoppen.forEach((b, i) => b.addEventListener('click', () => resolve(i), { once: true }));
      this.setKeys((e) => { const n = Number(e.key); if (n >= 1 && n <= knoppen.length) { e.preventDefault(); resolve(n - 1); } });
    });
    this.setKeys(null);
    const goed = volgorde[gekozen] === stap.goed;
    knoppen.forEach((b, i) => {
      b.disabled = true;
      if (volgorde[i] === stap.goed) { b.classList.add('is-juist'); b.insertAdjacentHTML('beforeend', `<span class="z365-badge">${t('juistAntwoord')}</span>`); }
      if (i === gekozen) { b.classList.add('gekozen'); if (!goed) b.classList.add('is-fout'); b.setAttribute('aria-pressed', 'true'); }
    });
    await this.feedback(goed, tx(stap.uitleg), stap.bron, laatste);
    return goed;
  }

  private async volgorde(stap: VolgordeStap, laatste: boolean): Promise<boolean> {
    const box = this.main.querySelector<HTMLElement>('.z365-stap')!;
    box.classList.add('z365-volgorde');
    const items = stapItems(stap);
    let orde = shuffle(items.map((_, i) => i));
    if (orde.length > 1 && orde.every((v, i) => v === i)) orde = [...orde.slice(1), orde[0]];
    const ol = document.createElement('ol');
    ol.className = 'z365-sorteer';
    ol.setAttribute('aria-label', t('zetVolgorde'));
    box.appendChild(ol);
    const live = document.createElement('p');
    live.className = 'sr-only'; live.setAttribute('aria-live', 'polite');
    box.appendChild(live);

    const render = (focus?: { idx: number; richting: 'op' | 'neer' }) => {
      ol.innerHTML = '';
      orde.forEach((itemIdx, pos) => {
        const li = document.createElement('li');
        li.className = 'z365-item';
        li.dataset.testid = 'z365-item';
        li.dataset.idx = String(itemIdx);
        li.innerHTML = `<span class="z365-greep" aria-hidden="true">⋮⋮</span><span class="z365-pos">${pos + 1}</span><span class="z365-item-tekst"></span>
          <span class="z365-pijlen"><button type="button" class="z365-pijl" data-r="op" aria-label="${t('omhoog')}">↑</button><button type="button" class="z365-pijl" data-r="neer" aria-label="${t('omlaag')}">↓</button></span>`;
        li.querySelector('.z365-item-tekst')!.textContent = items[itemIdx];
        const op = li.querySelector<HTMLButtonElement>('[data-r="op"]')!;
        const neer = li.querySelector<HTMLButtonElement>('[data-r="neer"]')!;
        op.disabled = pos === 0; neer.disabled = pos === orde.length - 1;
        op.setAttribute('aria-label', `${items[itemIdx]}: ${t('omhoog')}`);
        neer.setAttribute('aria-label', `${items[itemIdx]}: ${t('omlaag')}`);
        op.onclick = () => verplaats(pos, -1, 'op');
        neer.onclick = () => verplaats(pos, 1, 'neer');
        li.querySelector('.z365-greep')!.addEventListener('pointerdown', (e) => sleep(e as PointerEvent, li));
        ol.appendChild(li);
      });
      if (focus) {
        const li = ol.querySelector<HTMLElement>(`[data-idx="${focus.idx}"]`)!;
        const b = li.querySelector<HTMLButtonElement>(`[data-r="${focus.richting}"]`)!;
        (b.disabled ? li.querySelector<HTMLButtonElement>('.z365-pijl:not(:disabled)')! : b).focus();
      }
    };
    const verplaats = (pos: number, d: number, richting: 'op' | 'neer') => {
      const np = pos + d;
      if (np < 0 || np >= orde.length) return;
      const idx = orde[pos];
      [orde[pos], orde[np]] = [orde[np], orde[pos]];
      render({ idx, richting });
      live.textContent = `${items[idx]}: ${np + 1}.`;
    };
    // slepen met muis of vinger
    const sleep = (e: PointerEvent, li: HTMLElement) => {
      e.preventDefault();
      const idx = Number(li.dataset.idx);
      li.classList.add('sleept');
      const move = (ev: PointerEvent) => {
        const items = [...ol.children] as HTMLElement[];
        const doel = items.findIndex((it) => { const r = it.getBoundingClientRect(); return ev.clientY < r.top + r.height / 2; });
        const van = orde.indexOf(idx);
        let naar = doel === -1 ? orde.length - 1 : doel;
        if (naar > van) naar -= 1;
        if (naar !== van) {
          orde.splice(van, 1); orde.splice(naar, 0, idx);
          render();
          ol.querySelector<HTMLElement>(`[data-idx="${idx}"]`)!.classList.add('sleept');
        }
      };
      const up = () => {
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
        ol.querySelector(`[data-idx="${idx}"]`)?.classList.remove('sleept');
      };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    };
    render();

    const acties = this.main.querySelector<HTMLElement>('.z365-acties')!;
    const check = document.createElement('button');
    check.type = 'button'; check.className = 'btn'; check.textContent = t('controleer'); check.dataset.testid = 'z365-controleer';
    acties.appendChild(check);
    ol.querySelector<HTMLButtonElement>('.z365-pijl:not(:disabled)')?.focus();
    await new Promise<void>((r) => check.addEventListener('click', () => r(), { once: true }));
    check.remove();
    const goed = orde.every((v, i) => v === i);
    [...ol.children].forEach((li, pos) => {
      li.classList.add(Number((li as HTMLElement).dataset.idx) === pos ? 'is-juist' : 'is-fout');
      li.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    });
    let extra = '';
    if (!goed) extra = `<p class="z365-label">${t('goedeVolgorde')}</p><ol class="z365-juist">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`;
    await this.feedback(goed, tx(stap.uitleg), stap.bron, laatste, extra);
    return goed;
  }

  private feedback(goed: boolean, uitleg: string, bron: string, laatste: boolean, extraHtml = ''): Promise<void> {
    const fb = this.main.querySelector<HTMLElement>('.z365-feedback')!;
    fb.className = `z365-feedback ${goed ? 'is-goed' : 'is-fout'}`;
    geluid.oordeel(goed);
    fb.dataset.testid = 'z365-feedback';
    fb.innerHTML = `<p class="z365-oordeel">${goed ? t('goed') : t('nietHelemaal')}</p><p class="z365-uitleg"></p>${extraHtml}<p class="z365-bron"></p>`;
    fb.querySelector('.z365-uitleg')!.textContent = uitleg;
    fb.querySelector('.z365-bron')!.textContent = t('bron', bron);
    const acties = this.main.querySelector<HTMLElement>('.z365-acties')!;
    acties.innerHTML = '';
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn'; b.dataset.testid = 'z365-volgende';
    b.textContent = laatste ? t(this.oefen ? 'klaarMetOefenen' : 'afronden') : t('volgende');
    acties.appendChild(b);
    b.focus();
    fb.scrollIntoView({ block: 'nearest' });
    return new Promise((r) => b.addEventListener('click', () => r(), { once: true }));
  }

  private setKeys(fn: ((e: KeyboardEvent) => void) | null): void {
    if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
    this.keyHandler = fn;
    if (fn) window.addEventListener('keydown', fn);
  }
}

function esc(t: string): string {
  return t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
