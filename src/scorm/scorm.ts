/**
 * SCORM 2004-wrapper. Zonder LMS (lokaal, GitHub Pages) faalt alles stil
 * en blijft het spel speelbaar.
 */
interface Api1484 {
  Initialize(p: ''): string;
  Terminate(p: ''): string;
  GetValue(k: string): string;
  SetValue(k: string, v: string): string;
  Commit(p: ''): string;
  GetLastError(): string;
}

function zoekApi(): Api1484 | null {
  const probeer = (w: Window | null): Api1484 | null => {
    let n = 0;
    while (w && n++ < 500) {
      try {
        const api = (w as unknown as { API_1484_11?: Api1484 }).API_1484_11;
        if (api) return api;
        if (w.parent === w) break;
        w = w.parent;
      } catch { break; } // andere origin
    }
    return null;
  };
  return probeer(window) ?? probeer(window.opener as Window | null);
}

export interface ScormRapport {
  /** Alle verplichte woningen af. */
  compleet: boolean;
  /** 0..1 */
  voortgang: number;
  proces: number;
  procesMax: number;
  suspend: string;
}

export class Scorm {
  private api: Api1484 | null = null;
  private klaar = false;

  /** Start de sessie; geeft eerder bewaarde suspend_data terug (of null). */
  init(): string | null {
    try {
      this.api = zoekApi();
      if (!this.api || this.api.Initialize('') !== 'true') { this.api = null; return null; }
      const status = this.api.GetValue('cmi.completion_status');
      if (status === 'not attempted' || status === 'unknown' || status === '') this.set('cmi.completion_status', 'incomplete');
      const data = this.api.GetValue('cmi.suspend_data');
      window.addEventListener('pagehide', () => this.stop());
      window.addEventListener('beforeunload', () => this.stop());
      return data || null;
    } catch { this.api = null; return null; }
  }

  get verbonden(): boolean { return this.api !== null; }

  rapporteer(r: ScormRapport): void {
    if (!this.api) return;
    const scaled = r.procesMax ? r.proces / r.procesMax : 0;
    this.set('cmi.score.min', '0');
    this.set('cmi.score.max', String(r.procesMax));
    this.set('cmi.score.raw', String(r.proces));
    this.set('cmi.score.scaled', scaled.toFixed(4));
    this.set('cmi.progress_measure', r.voortgang.toFixed(4));
    this.set('cmi.completion_status', r.compleet ? 'completed' : 'incomplete');
    this.set('cmi.success_status', r.compleet ? (scaled >= 0.7 ? 'passed' : 'failed') : 'unknown');
    this.set('cmi.suspend_data', r.suspend.slice(0, 4000));
    try { this.api.Commit(''); } catch { /* stil */ }
  }

  stop(): void {
    if (!this.api || this.klaar) return;
    this.klaar = true;
    this.set('cmi.exit', 'suspend');
    try { this.api.Commit(''); this.api.Terminate(''); } catch { /* stil */ }
  }

  private set(k: string, v: string): void {
    try { this.api?.SetValue(k, v); } catch { /* stil */ }
  }
}
