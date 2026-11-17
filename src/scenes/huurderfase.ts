import { t, tx, objectNaam, huurderNaam } from '../i18n';
import type * as THREE from 'three';
import type { Scenarios, Woning } from '../content/types';
import { huurderVan, portretUrl } from '../content/load';
import { Interior } from '../world/interior';
import { INRICHTING } from '../world/interiors';
import { HUURDER_LOOK, stemVan } from '../world/looks';
import { geluid } from '../audio/geluid';
import type { DoorInfo } from '../world/street';
import type { StreetScene } from './streetScene';
import type { Cards } from '../ui/cards';
import { HotspotPins } from '../ui/hotspotPins';
import type { Progress } from '../game/progress';
import type { Transition } from '../ui/transition';

export interface View { scene: THREE.Scene; camera: THREE.Camera }

interface Ctx {
  content: Scenarios;
  street: StreetScene;
  cards: Cards;
  ui: HTMLElement;
  canvas: HTMLCanvasElement;
  progress: Progress;
  transition: Transition;
  reducedMotion: () => boolean;
  setView: (v: View | null) => void;
}

export function heeftInterieur(w: Woning): boolean {
  return !!w.huurderfase && !!INRICHTING[w.id];
}

/** Huurderfase: aanbellen → binnen rondkijken → gesprek → leerpunt → terug naar de straat. */
export class HuurderFase {
  private interior: Interior | null = null;
  private pins: HotspotPins;
  private balk: HTMLElement;
  private kies: ((id: string) => void) | null = null;
  private interiors = new Map<string, Interior>();

  constructor(private ctx: Ctx) {
    this.pins = new HotspotPins(ctx.ui);
    this.balk = document.createElement('div');
    this.balk.className = 'binnen-balk';
    this.balk.hidden = true;
    this.balk.dataset.testid = 'binnen-balk';
    this.balk.innerHTML = `<span class="status" aria-live="polite"></span><button class="btn btn--cta" type="button" data-testid="praat" hidden></button>`;
    ctx.ui.appendChild(this.balk);

    this.pins.onKies = (id) => this.kies?.(id);
    this.pins.onHover = (id) => { this.interior?.setHover(id); this.pins.setHover(id); };

    // muis/touch op objecten in de kamer
    const c = ctx.canvas;
    c.addEventListener('pointermove', (e) => {
      if (!this.interior || ctx.cards.open) return;
      const id = this.interior.pick(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
      this.interior.setHover(id); this.pins.setHover(id);
      c.style.cursor = id ? 'pointer' : '';
    });
    c.addEventListener('click', (e) => {
      if (!this.interior || ctx.cards.open) return;
      const id = this.interior.pick(e.clientX, e.clientY, window.innerWidth, window.innerHeight);
      if (id) this.kies?.(id);
    });
  }

  get actief(): boolean { return this.interior !== null; }

  async speel(woning: Woning, deur: DoorInfo): Promise<void> {
    const { content, street, cards, progress } = this.ctx;
    const fase = woning.huurderfase!;
    const huurder = huurderVan(content, woning);
    const look = HUURDER_LOOK[woning.huurder] ?? {};
    const spreker = { naam: huurderNaam(huurder) || woning.adres, portret: huurder ? portretUrl(huurder.portret) : undefined, stem: stemVan(look, huurder?.naam ?? '') };

    // 1. Deur
    await street.openDeur(deur, woning.huurder, look, this.ctx.reducedMotion());
    await cards.deur(spreker, tx(fase.deur), t('naarBinnen'));
    cards.hide();

    // 2. Binnen
    await this.fade(true);
    let interior = this.interiors.get(woning.id);
    if (!interior) {
      interior = new Interior(INRICHTING[woning.id], fase.hotspots.map((h) => h.id), look);
      this.interiors.set(woning.id, interior);
    }
    this.interior = interior;
    interior.resize(window.innerWidth, window.innerHeight);
    this.ctx.setView(interior);
    geluid.setSfeer(({ dag: 'binnen', regen: 'regen', avond: 'avond' } as const)[INRICHTING[woning.id].kamer.licht]);
    this.pins.set(fase.hotspots.filter((h) => interior!.hotspots.some((o) => o.id === h.id)).map((h) => ({ id: h.id, label: objectNaam(h) })));
    this.pins.show(true);
    await this.fade(false);

    // 3. Rondkijken tot de kernhotspots gevonden zijn en de speler het gesprek start
    await this.rondkijken(woning, spreker.naam);

    // 4. Gesprek
    this.pins.show(false);
    this.balk.hidden = true;
    const max = fase.dialoog.reduce((s, v) => s + Math.max(...v.opties.map((o) => o.score)), 0);
    let score = 0;
    for (const [i, v] of fase.dialoog.entries()) {
      score += await cards.vraag(spreker, tx(v.vraag),
        v.opties.map((o) => ({ tekst: tx(o.tekst), score: o.score, feedback: tx(o.feedback) })),
        { score, max }, i + 1, fase.dialoog.length);
    }

    // 5. Leerpunt; daarna neemt de corporatiefase het over
    await cards.leerpunt(tx(fase.leerpunt), { score, max }, t('verder'));
    cards.hide();
    progress.huurderKlaar(woning.id, { score, max });
  }

  private rondkijken(woning: Woning, naam: string): Promise<void> {
    const fase = woning.huurderfase!;
    const ids = new Set(this.interior!.hotspots.map((h) => h.id));
    const hotspots = fase.hotspots.filter((h) => ids.has(h.id));
    const gevonden = new Set<string>();
    const status = this.balk.querySelector<HTMLElement>('.status')!;
    const praat = this.balk.querySelector<HTMLButtonElement>('[data-testid="praat"]')!;
    praat.textContent = t('praatMet', naam);
    praat.hidden = true;
    this.balk.hidden = false;
    const kernKlaar = () => hotspots.filter((h) => h.kern).every((h) => gevonden.has(h.id));
    const updateStatus = () => {
      status.textContent = t('kijkRond', gevonden.size, hotspots.length);
      praat.hidden = !kernKlaar();
    };
    updateStatus();
    this.pins.focus(hotspots[0]?.id ?? '');

    return new Promise((resolve) => {
      let bezig = false;
      this.kies = async (id) => {
        const h = hotspots.find((x) => x.id === id);
        if (!h || bezig) return;
        bezig = true;
        this.pins.show(false);
        this.balk.hidden = true;
        this.interior?.setHover(id);
        await this.ctx.cards.hotspot(objectNaam(h), tx(h.tekst));
        this.ctx.cards.hide();
        this.interior?.setHover(null);
        gevonden.add(id);
        this.pins.markeer(id, true);
        this.pins.show(true);
        this.balk.hidden = false;
        updateStatus();
        const volgende = hotspots.find((x) => !gevonden.has(x.id));
        if (kernKlaar()) praat.focus(); else if (volgende) this.pins.focus(volgende.id);
        bezig = false;
      };
      praat.onclick = () => { this.kies = null; praat.onclick = null; resolve(); };
    });
  }

  private fade(aan: boolean): Promise<void> { return this.ctx.transition.fade(aan); }

  /** Kamer verlaten (de volgende scène heeft het beeld al overgenomen). */
  verlaat(): void {
    this.interior?.setHover(null);
    this.interior = null;
    this.pins.show(false);
    this.balk.hidden = true;
    this.ctx.canvas.style.cursor = '';
  }

  update(dt: number, t: number): void {
    const i = this.interior;
    if (!i) return;
    i.update(dt, t, this.ctx.reducedMotion());
    for (const h of i.hotspots) {
      const p = i.project(h.anker, window.innerWidth, window.innerHeight);
      this.pins.position(h.id, p.x, p.y);
    }
  }

  resize(w: number, h: number): void { this.interior?.resize(w, h); }
}
