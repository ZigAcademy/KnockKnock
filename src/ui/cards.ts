import { geluid } from '../audio/geluid';
import { t, getTaal } from '../i18n';
/**
 * Dialoogkaarten (HTML-overlay). Alle inhoudelijke teksten komen binnen als
 * parameter uit scenarios.json; hier staan alleen interfacelabels.
 */
export interface Spreker { naam: string; portret?: string; /** Toonhoogte van het gebrabbel (Hz). */ stem?: number }
export interface Hartjes { score: number; max: number }
export interface Optie { tekst: string; score: number; feedback: string }

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const KOP_DIT_NEEM_JE_MEE = './assets/titels/kop-dit-neem-je-mee.png';

export class Cards {
  private el: HTMLElement;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'card';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-labelledby', 'card-titel');
    this.el.dataset.testid = 'kaart';
    this.el.hidden = true;
    root.appendChild(this.el);
  }

  get open(): boolean { return !this.el.hidden; }

  hide(): void {
    geluid.stopBrabbel();
    this.el.hidden = true;
    this.el.innerHTML = '';
    this.setKeys(null);
  }

  /** Huurder doet open: portret + deurtekst. */
  deur(spreker: Spreker, tekst: string, knop: string): Promise<void> {
    this.render('card--spreker', this.kop(spreker), `<p class="spraak"></p>`);
    this.q('.spraak').textContent = tekst;
    geluid.brabbel(tekst, spreker.stem);
    return this.knop(knop);
  }

  /** Medewerker stelt zich voor: portret, naam, rol en intro. */
  intro(spreker: Spreker, rol: string, tekst: string, knop: string): Promise<void> {
    this.render('card--spreker card--intro', this.kop(spreker), `<p class="rol"></p><p class="spraak"></p>`);
    this.q('.rol').textContent = rol;
    this.q('.spraak').textContent = tekst;
    geluid.brabbel(tekst, spreker.stem);
    return this.knop(knop);
  }

  /** Kaart met een titel en een korte tekst (bijv. de intro van de finale). */
  info(titel: string, tekst: string, knop: string): Promise<void> {
    this.render('card--hotspot', `<h2 id="card-titel" class="hotspot-titel"></h2>`, `<p></p>`);
    this.q('h2').textContent = titel;
    this.q('.card-body p').textContent = tekst;
    return this.knop(knop);
  }

  /** Popup bij een hotspot. */
  hotspot(object: string, tekst: string): Promise<void> {
    this.render('card--hotspot', `<h2 id="card-titel" class="hotspot-titel"></h2>`, `<p></p>`);
    this.q('h2').textContent = object;
    this.q('.card-body p').textContent = tekst;
    geluid.speel('hotspot', { vol: 0.4 });
    return this.knop(t('verder'));
  }

  /** Vraag van de huurder met geschudde opties; toont daarna de feedback. Geeft de score terug. */
  async vraag(spreker: Spreker, vraag: string, opties: Optie[], hartjes: Hartjes, nr: number, totaal: number): Promise<number> {
    const geschud = shuffle(opties);
    this.render('card--spreker card--vraag', this.kop(spreker, hartjes),
      `<p class="voortgang">${t('vraagVan', nr, totaal)}</p><p class="spraak"></p><div class="opties" role="group" aria-label="${t('kiesAntwoord')}"></div>`);
    this.q('.spraak').textContent = vraag;
    geluid.brabbel(vraag, spreker.stem);
    const lijst = this.q('.opties');
    const knoppen = geschud.map((o, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'optie';
      b.dataset.testid = 'optie';
      b.innerHTML = `<span class="optie-nr">${i + 1}</span><span class="optie-tekst"></span>`;
      b.querySelector('.optie-tekst')!.textContent = o.tekst;
      lijst.appendChild(b);
      return b;
    });
    knoppen[0]?.focus();

    const gekozen = await new Promise<number>((resolve) => {
      knoppen.forEach((b, i) => b.addEventListener('click', () => resolve(i), { once: true }));
      this.setKeys((e) => {
        const n = Number(e.key);
        if (n >= 1 && n <= knoppen.length) { e.preventDefault(); resolve(n - 1); }
      });
    });
    this.setKeys(null);
    const keuze = geschud[gekozen];
    knoppen.forEach((b, i) => {
      b.disabled = true;
      b.classList.toggle('gekozen', i === gekozen);
      b.setAttribute('aria-pressed', String(i === gekozen));
    });
    knoppen[gekozen].classList.add(keuze.score > 0 ? 'is-goed' : 'is-minder');
    geluid.stopBrabbel();
    geluid.oordeel(keuze.score > 0);

    const nieuw = { score: hartjes.score + keuze.score, max: hartjes.max };
    this.q('.hartjes').outerHTML = hartjesHtml(nieuw);
    const fb = document.createElement('div');
    fb.className = `feedback ${keuze.score > 0 ? 'feedback--goed' : 'feedback--minder'}`;
    fb.setAttribute('role', 'status');
    fb.dataset.testid = 'feedback';
    fb.innerHTML = `<p></p>`;
    fb.querySelector('p')!.textContent = keuze.feedback;
    lijst.after(fb);
    await this.knop(t('verder'));
    return keuze.score;
  }

  /** Leerpunt-kaart "Dit neem je mee". */
  leerpunt(tekst: string, hartjes: Hartjes, knop: string, noot?: string): Promise<void> {
    this.render('card--leerpunt',
      `<div class="leerpunt-kop"><img class="kop-img" alt="${t('ditNeemJeMee')}" hidden /><h2 id="card-titel">${t('ditNeemJeMee')}</h2>${hartjesHtml(hartjes)}</div>`,
      `<p class="leerpunt-tekst"></p>${noot ? '<p class="noot"></p>' : ''}`);
    const img = this.q<HTMLImageElement>('.kop-img');
    img.onload = () => { img.hidden = false; this.q('h2').classList.add('sr-only'); };
    if (getTaal() === 'nl') img.src = KOP_DIT_NEEM_JE_MEE;
    this.q('.leerpunt-tekst').textContent = tekst;
    if (noot) this.q('.noot').textContent = noot;
    geluid.speel('leerpunt', { vol: 0.45 });
    return this.knop(knop);
  }

  private render(cls: string, kop: string, body: string): void {
    this.el.className = `card ${cls}`;
    this.el.innerHTML = `<div class="card-kop">${kop}</div><div class="card-body">${body}</div><div class="card-acties"></div>`;
    this.el.hidden = false;
  }

  private kop(s: Spreker, hartjes?: Hartjes): string {
    return `${s.portret ? `<img class="portret" src="${s.portret}" alt="" />` : ''}
      <h2 id="card-titel" class="naam">${escapeHtml(s.naam)}</h2>${hartjes ? hartjesHtml(hartjes) : ''}`;
  }

  private knop(label: string): Promise<void> {
    const acties = this.q('.card-acties');
    acties.innerHTML = '';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.dataset.testid = 'kaart-knop';
    b.textContent = label;
    acties.appendChild(b);
    b.focus();
    return new Promise((resolve) => b.addEventListener('click', () => resolve(), { once: true }));
  }

  private setKeys(fn: ((e: KeyboardEvent) => void) | null): void {
    if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
    this.keyHandler = fn;
    if (fn) window.addEventListener('keydown', fn);
  }

  private q<T extends HTMLElement = HTMLElement>(sel: string): T { return this.el.querySelector<T>(sel)!; }
}

export function hartjesHtml(h: Hartjes): string {
  let s = '';
  for (let i = 0; i < h.max; i++) s += `<span class="hart${i < h.score ? ' vol' : ''}" aria-hidden="true">♥</span>`;
  return `<span class="hartjes" data-testid="hartjes" role="img" aria-label="${t('hartjes', h.score, h.max)}">${s}</span>`;
}

function escapeHtml(t: string): string {
  return t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
