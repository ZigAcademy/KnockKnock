/** Voortgang per woning. Wordt via SCORM (suspend_data) bewaard. */
export interface Resultaat { score: number; max: number }
export interface WoningVoortgang { huurder?: Resultaat; proces?: Resultaat; af: boolean }

export class Progress {
  readonly woningen = new Map<string, WoningVoortgang>();
  onChange: (() => void) | null = null;
  /** Uiterlijk van de speler (code uit src/game/speler.ts), zodat het in SCORM bewaard blijft. */
  speler: string | null = null;

  private get(id: string): WoningVoortgang {
    let w = this.woningen.get(id);
    if (!w) { w = { af: false }; this.woningen.set(id, w); }
    return w;
  }

  /** Alleen de eerste keer telt; opnieuw spelen verandert de score niet. */
  huurderKlaar(id: string, r: Resultaat): void {
    const w = this.get(id);
    if (!w.huurder) { w.huurder = r; this.onChange?.(); }
  }

  procesKlaar(id: string, r: Resultaat): void {
    const w = this.get(id);
    if (!w.proces) w.proces = r;
    w.af = true;
    this.onChange?.();
  }

  isAf(id: string): boolean { return this.woningen.get(id)?.af === true; }

  /** Compacte vorm voor cmi.suspend_data. */
  serialize(): string {
    const o: Record<string, [number, number, number, number, number]> = {};
    for (const [id, w] of this.woningen) {
      o[id] = [w.huurder?.score ?? -1, w.huurder?.max ?? 0, w.proces?.score ?? -1, w.proces?.max ?? 0, w.af ? 1 : 0];
    }
    return JSON.stringify(this.speler ? { v: 1, w: o, p: this.speler } : { v: 1, w: o });
  }

  restore(data: string): void {
    try {
      const o = JSON.parse(data) as { v: number; w: Record<string, number[]>; p?: string };
      if (o.v !== 1) return;
      if (typeof o.p === 'string') this.speler = o.p;
      for (const [id, [hs, hm, ps, pm, af]] of Object.entries(o.w)) {
        this.woningen.set(id, {
          huurder: hs >= 0 ? { score: hs, max: hm } : undefined,
          proces: ps >= 0 ? { score: ps, max: pm } : undefined,
          af: af === 1,
        });
      }
    } catch { /* ongeldige data: begin opnieuw */ }
  }
}
