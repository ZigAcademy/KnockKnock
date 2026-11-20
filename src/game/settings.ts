/** Instellingen van de speler (per browser bewaard). */
export interface Instellingen {
  geluid: boolean;
  voiceOver: boolean;
  /** null = volg de systeeminstelling (prefers-reduced-motion). */
  minderBeweging: boolean | null;
  taal: 'nl' | 'en';
  /** Beeldkwaliteit: auto zakt naar laag als de framerate te laag is. */
  kwaliteit: 'auto' | 'hoog' | 'laag';
  /** Standaard of lage resolutie (het eerdere beeld); geldt na opnieuw laden. */
  versie: 'standaard' | 'laag';
}

const KEY = 'wijkwijs-instellingen';
const STANDAARD: Instellingen = { geluid: true, voiceOver: true, minderBeweging: null, taal: 'nl', kwaliteit: 'auto', versie: 'standaard' };

export class Settings {
  waarden: Instellingen;
  private mq = matchMedia('(prefers-reduced-motion: reduce)');
  private luisteraars: (() => void)[] = [];

  constructor() {
    let opgeslagen: Partial<Instellingen> = {};
    try { opgeslagen = JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { /* geen opslag */ }
    this.waarden = { ...STANDAARD, ...opgeslagen };
    this.mq.addEventListener('change', () => this.melden());
    this.pasToe();
  }

  get minderBeweging(): boolean { return this.waarden.minderBeweging ?? this.mq.matches; }

  zet<K extends keyof Instellingen>(k: K, v: Instellingen[K]): void {
    this.waarden[k] = v;
    try { localStorage.setItem(KEY, JSON.stringify(this.waarden)); } catch { /* geen opslag */ }
    this.pasToe();
    this.melden();
  }

  onChange(fn: () => void): void { this.luisteraars.push(fn); }

  private pasToe(): void { document.body.classList.toggle('minder-beweging', this.minderBeweging); }
  private melden(): void { this.pasToe(); this.luisteraars.forEach((f) => f()); }
}
