/**
 * Geluid (fase 5): korte effecten uit Kenney-packs (public/assets/geluid, zie tools/geluiden.mjs)
 * en geluiden die hier met de Web Audio API worden gemaakt (deurbel, auto, gebrabbel,
 * dreun, druppel, regen, sfeer). Alles faalt stil: zonder geluidskaart, zonder bestanden
 * of met geluid uit blijft het spel gewoon werken. De AudioContext start pas na de eerste
 * klik of toets (autoplay-regels van de browser).
 */

export type Ondergrond = 'steen' | 'gras' | 'hout';
export type Sfeer = 'straat' | 'binnen' | 'regen' | 'avond' | 'kantoor' | null;

const BESTANDEN = [
  ...[0, 1, 2, 3, 4].flatMap((i) => [`stap-steen-${i}`, `stap-gras-${i}`, `stap-hout-${i}`]),
  'deur-open', 'deur-dicht', 'klik', 'hotspot', 'goed', 'minder', 'leerpunt', 'scherm-open', 'scherm-dicht', 'blad',
  'toets-1', 'toets-2', 'toets-3', 'toets-4',
];

interface Laag { gain: GainNode; stop: () => void }

class Geluid {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfx!: GainNode;
  private sfeerBus!: GainNode;
  private buffers = new Map<string, AudioBuffer>();
  private ruis: AudioBuffer | null = null;
  private aan = true;
  private sfeer: Sfeer = null;
  private lagen = new Map<Exclude<Sfeer, null>, Laag>();
  private brabbelGain: GainNode | null = null;
  private motorNodes: { gain: GainNode; osc: OscillatorNode[]; pan: StereoPannerNode } | null = null;
  private vogelTimer = 2;
  private typTimer = 1;
  private laatsteStap = 0;
  /** Luide stukken (starttijden, s) in het praatgeluid, om lettergrepen uit te knippen. */
  private praatStukken: number[] = [];

  /** Registreert de ontgrendeling op de eerste klik/toets. */
  init(aan: boolean): void {
    this.aan = aan;
    const start = () => { this.ontgrendel(); };
    window.addEventListener('pointerdown', start, { capture: true });
    window.addEventListener('keydown', start, { capture: true });
  }

  /** Geluid aan/uit (instelling). */
  setAan(aan: boolean): void {
    this.aan = aan;
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(aan ? 0.9 : 0, this.ctx.currentTime, 0.05);
    if (!aan) this.stopBrabbel();
  }

  get actief(): boolean { return !!this.ctx && this.aan && this.ctx.state === 'running'; }

  private ontgrendel(): void {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        const c = this.ctx;
        this.master = c.createGain(); this.master.gain.value = this.aan ? 0.9 : 0; this.master.connect(c.destination);
        this.sfx = c.createGain(); this.sfx.gain.value = 1; this.sfx.connect(this.master);
        this.sfeerBus = c.createGain(); this.sfeerBus.gain.value = 0.8; this.sfeerBus.connect(this.master);
        const n = c.sampleRate * 2;
        this.ruis = c.createBuffer(1, n, c.sampleRate);
        const d = this.ruis.getChannelData(0);
        let b = 0;
        for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b = 0.97 * b + 0.03 * w; d[i] = w * 0.5 + b * 2; }
        void this.laad();
        const s = this.sfeer; this.sfeer = null; this.setSfeer(s);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch { /* geen geluid mogelijk */ }
  }

  private async laad(): Promise<void> {
    const c = this.ctx!;
    const ogg = new Audio().canPlayType('audio/ogg; codecs="vorbis"') !== '';
    const ext = ogg ? 'ogg' : 'm4a';
    await Promise.all(BESTANDEN.map(async (naam) => {
      try {
        const r = await fetch(new URL(`assets/geluid/${naam}.${ext}`, document.baseURI).href);
        if (!r.ok) return;
        this.buffers.set(naam, await c.decodeAudioData(await r.arrayBuffer()));
      } catch { /* dit geluid ontbreekt; dan stil of een eigen terugval */ }
    }));
    // muziek van de buren (nr 18), als AAC; lukt dat niet, dan de gemaakte akkoorden
    try {
      const r = await fetch(new URL('assets/geluid/buren-muziek.m4a', document.baseURI).href);
      if (r.ok) {
        this.buffers.set('buren-muziek', await c.decodeAudioData(await r.arrayBuffer()));
        // speelt nr 18 al? Dan de laag opnieuw opbouwen met de echte muziek
        const oud = this.lagen.get('avond');
        if (oud) { oud.stop(); oud.gain.disconnect(); this.lagen.delete('avond'); if (this.sfeer === 'avond') { this.sfeer = null; this.setSfeer('avond'); } }
      }
    } catch { /* geen muziekbestand: terugval */ }
    // praatgeluid voor het gebrabbel (mp3 speelt in alle browsers)
    try {
      const r = await fetch(new URL('assets/geluid/praten.mp3', document.baseURI).href);
      if (r.ok) {
        const buf = await c.decodeAudioData(await r.arrayBuffer());
        this.buffers.set('praten', buf);
        const d = buf.getChannelData(0), w = Math.floor(buf.sampleRate * 0.04);
        for (let i = 0; i + w * 4 < d.length; i += w) {
          let e = 0;
          for (let k = i; k < i + w; k++) e += d[k] * d[k];
          if (Math.sqrt(e / w) > 0.06) this.praatStukken.push(i / buf.sampleRate);
        }
      }
    } catch { /* geen praatgeluid: dan het gemaakte gebrabbel */ }
  }

  /** Speel een kort effect. Geeft false als het (nog) niet kan. */
  speel(naam: string, o: { vol?: number; rate?: number; pan?: number; bus?: 'sfx' | 'sfeer' } = {}): boolean {
    if (!this.actief) return false;
    const buf = this.buffers.get(naam);
    if (!buf) return false;
    const c = this.ctx!;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = o.rate ?? 1;
    const g = c.createGain(); g.gain.value = o.vol ?? 1;
    const p = c.createStereoPanner(); p.pan.value = o.pan ?? 0;
    src.connect(g).connect(p).connect(o.bus === 'sfeer' ? this.sfeerBus : this.sfx);
    src.start();
    return true;
  }

  // ------------------------------------------------------------------ effecten

  /** Voetstap op een ondergrond (variatie in sample en toonhoogte). */
  stap(ondergrond: Ondergrond, vol = 0.5): void {
    if (!this.actief) return;
    const nu = this.ctx!.currentTime;
    if (nu - this.laatsteStap < 0.12) return;
    this.laatsteStap = nu;
    const i = Math.floor(Math.random() * 5);
    if (!this.speel(`stap-${ondergrond}-${i}`, { vol, rate: 0.92 + Math.random() * 0.16 })) this.tik(ondergrond === 'gras' ? 300 : 900, 0.05 * vol);
  }

  /** Klassieke ding-dong. */
  deurbel(): void {
    if (!this.actief) return;
    const c = this.ctx!, t = c.currentTime;
    const toon = (f: number, start: number) => {
      for (const [mul, v] of [[1, 0.22], [2.76, 0.05], [5.4, 0.02]]) {
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f * mul;
        const g = c.createGain();
        g.gain.setValueAtTime(0, t + start);
        g.gain.linearRampToValueAtTime(v, t + start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + start + 1.4);
        o.connect(g).connect(this.sfx); o.start(t + start); o.stop(t + start + 1.5);
      }
    };
    toon(659.3, 0); toon(523.3, 0.45);
  }

  deur(open: boolean): void {
    if (!this.speel(open ? 'deur-open' : 'deur-dicht', { vol: 0.55 })) this.tik(open ? 220 : 160, 0.12);
  }

  /** Waterdruppel (kraan bij nr 14). */
  druppel(vol = 0.18): void {
    if (!this.actief) return;
    const c = this.ctx!, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(1400 + Math.random() * 300, t);
    o.frequency.exponentialRampToValueAtTime(420, t + 0.07);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.14);
  }

  /** Dreun van de bas bij de buren (nr 18), gedempt door de muur. */
  dreun(vol = 0.55): void {
    if (!this.actief) return;
    // met de echte muziek erbij geen losse dreun (die zou uit de maat lopen)
    if (this.buffers.has('buren-muziek')) return;
    const c = this.ctx!, t = c.currentTime;
    const o = c.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
    o.connect(lp).connect(g).connect(this.sfx); o.start(t); o.stop(t + 0.4);
    this.ruisStoot(120, 0.08 * vol / 0.55, 0.12);
  }

  /** Zoef bij de perspectiefwissel. */
  zoef(): void {
    if (!this.actief || !this.ruis) return;
    const c = this.ctx!, t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.ruis;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(2600, t + 0.7); bp.frequency.exponentialRampToValueAtTime(900, t + 1.2);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    src.connect(bp).connect(g).connect(this.sfx); src.start(t); src.stop(t + 1.4);
  }

  /** Feedback: goed of minder goed (nooit hard of straffend). */
  oordeel(goed: boolean): void {
    if (!this.speel(goed ? 'goed' : 'minder', { vol: goed ? 0.5 : 0.4 })) {
      if (!this.actief) return;
      const c = this.ctx!, t = c.currentTime;
      const tonen = goed ? [523.3, 659.3, 784] : [392, 349.2];
      tonen.forEach((f, i) => {
        const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f;
        const g = c.createGain(); g.gain.setValueAtTime(0, t + i * 0.09); g.gain.linearRampToValueAtTime(0.12, t + i * 0.09 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.09 + 0.3);
        o.connect(g).connect(this.sfx); o.start(t + i * 0.09); o.stop(t + i * 0.09 + 0.35);
      });
    }
  }

  /**
   * Gebrabbel als iemand praat: korte lettergrepen in het ritme van de tekst,
   * met een eigen toonhoogte per personage. De ondertitel (de kaart) blijft leidend.
   */
  brabbel(tekst: string, stem = 180): void {
    this.stopBrabbel();
    if (!this.actief) return;
    const c = this.ctx!;
    const g = c.createGain(); g.gain.value = 0.14; g.connect(this.sfx);
    this.brabbelGain = g;
    const sample = this.buffers.get('praten');
    if (sample && this.praatStukken.length > 8) { this.brabbelSample(tekst, stem, sample, g); return; }
    const woorden = tekst.split(/\s+/).filter(Boolean);
    let t = c.currentTime + 0.12;
    const eind = t + Math.min(3.2, 0.5 + woorden.length * 0.16);
    let k = 0;
    for (const w of woorden) {
      const lettergrepen = Math.max(1, Math.min(3, Math.round(w.length / 3)));
      for (let s = 0; s < lettergrepen && t < eind; s++, k++) {
        const d = 0.06 + Math.random() * 0.05;
        const o = c.createOscillator(); o.type = 'triangle';
        // lichte zinsmelodie: omhoog bij een vraag aan het eind
        const vraag = /\?\s*$/.test(tekst) && t > eind - 0.3;
        o.frequency.value = stem * (0.86 + Math.random() * 0.3) * (vraag ? 1.25 : 1);
        const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 700 + Math.random() * 1300; f.Q.value = 2.5;
        const e = c.createGain();
        e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(1, t + 0.012); e.gain.setValueAtTime(1, t + d * 0.6); e.gain.linearRampToValueAtTime(0, t + d);
        o.connect(f).connect(e).connect(g); o.start(t); o.stop(t + d + 0.02);
        t += d + 0.025 + Math.random() * 0.03;
      }
      t += 0.06 + (/[.,!?]$/.test(w) ? 0.18 : 0);
      if (t >= eind) break;
    }
    void k;
  }

  /**
   * Gebrabbel uit het praatgeluid: korte stukjes uit de luide delen, per personage een eigen
   * toonhoogte (afspeelsnelheid), tempo en klankkleur (filter), zodat iedereen anders klinkt.
   */
  private brabbelSample(tekst: string, stem: number, buf: AudioBuffer, uit: GainNode): void {
    const c = this.ctx!;
    // stem 135–270 Hz → toonhoogte 0,8–1,4; klankkleur en tempo variëren mee
    const rate = 0.8 + ((stem - 135) / 135) * 0.6;
    const kleur = c.createBiquadFilter(); kleur.type = 'peaking';
    kleur.frequency.value = 600 + ((stem * 7) % 1400); kleur.Q.value = 1.2; kleur.gain.value = 6;
    const zacht = c.createBiquadFilter(); zacht.type = 'lowpass'; zacht.frequency.value = 3800 + ((stem * 13) % 2500);
    kleur.connect(zacht).connect(uit);
    uit.gain.value = 0.55;
    const tempo = 0.85 + ((stem * 3) % 30) / 100;
    const woorden = tekst.split(/\s+/).filter(Boolean);
    let t = c.currentTime + 0.1;
    const eind = t + Math.min(3.4, 0.5 + woorden.length * 0.17);
    const vraag = /\?\s*$/.test(tekst);
    for (const w of woorden) {
      const lettergrepen = Math.max(1, Math.min(3, Math.round(w.length / 3)));
      for (let s = 0; s < lettergrepen && t < eind; s++) {
        const d = (0.08 + Math.random() * 0.08) * tempo;
        const start = this.praatStukken[Math.floor(Math.random() * this.praatStukken.length)];
        const src = c.createBufferSource(); src.buffer = buf;
        src.playbackRate.value = rate * (0.94 + Math.random() * 0.12) * (vraag && t > eind - 0.35 ? 1.15 : 1);
        const e = c.createGain();
        e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(1, t + 0.012); e.gain.setValueAtTime(1, t + d - 0.02); e.gain.linearRampToValueAtTime(0, t + d);
        src.connect(e).connect(kleur);
        src.start(t, start, d * src.playbackRate.value + 0.05);
        src.stop(t + d + 0.02);
        t += d + 0.015 * tempo;
      }
      t += (0.05 + (/[.,!?]$/.test(w) ? 0.2 : 0)) * tempo;
      if (t >= eind) break;
    }
  }

  stopBrabbel(): void {
    const g = this.brabbelGain;
    if (!g || !this.ctx) return;
    g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.03);
    setTimeout(() => g.disconnect(), 300);
    this.brabbelGain = null;
  }

  /** Motorgeluid van de rijdende auto: afstand (m) tot de camera, snelheid (m/s), links/rechts (-1..1). */
  motor(afstand: number, snelheid: number, pan: number): void {
    if (!this.ctx) return;
    const c = this.ctx;
    if (!this.motorNodes) {
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
      const gain = c.createGain(); gain.gain.value = 0;
      const p = c.createStereoPanner();
      const osc = [c.createOscillator(), c.createOscillator()];
      osc[0].type = 'sawtooth'; osc[1].type = 'square';
      for (const o of osc) { o.connect(lp); o.start(); }
      lp.connect(gain).connect(p).connect(this.sfeerBus);
      this.motorNodes = { gain, osc, pan: p };
    }
    const m = this.motorNodes;
    const t = c.currentTime;
    const nabij = Math.max(0, 1 - afstand / 28) ** 2;
    const vol = this.sfeer === 'straat' ? nabij * (0.05 + 0.05 * Math.min(1, snelheid / 3)) : 0;
    m.gain.gain.setTargetAtTime(vol, t, 0.1);
    m.osc[0].frequency.setTargetAtTime(34 + snelheid * 7, t, 0.2);
    m.osc[1].frequency.setTargetAtTime(51 + snelheid * 10, t, 0.2);
    m.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)) * 0.7, t, 0.1);
  }

  // ------------------------------------------------------------------ sfeer

  /** Achtergrond per plek; lagen faden in en uit. */
  setSfeer(s: Sfeer): void {
    if (s === this.sfeer) return;
    this.sfeer = s;
    if (!this.ctx || !this.ruis) return;
    const t = this.ctx.currentTime;
    for (const [naam, laag] of this.lagen) laag.gain.gain.setTargetAtTime(naam === s ? 1 : 0, t, 0.6);
    if (s && !this.lagen.has(s)) {
      const laag = this.maakLaag(s);
      laag.gain.gain.setValueAtTime(0, t);
      laag.gain.gain.setTargetAtTime(1, t, 0.6);
      this.lagen.set(s, laag);
    }
  }

  private ruisLaag(lp: number, hp: number, vol: number, uit: AudioNode): () => void {
    const c = this.ctx!;
    const src = c.createBufferSource(); src.buffer = this.ruis; src.loop = true;
    src.playbackRate.value = 0.9 + Math.random() * 0.2;
    const f1 = c.createBiquadFilter(); f1.type = 'lowpass'; f1.frequency.value = lp;
    const f2 = c.createBiquadFilter(); f2.type = 'highpass'; f2.frequency.value = hp;
    const g = c.createGain(); g.gain.value = vol;
    src.connect(f1).connect(f2).connect(g).connect(uit);
    src.start();
    return () => src.stop();
  }

  private maakLaag(s: Exclude<Sfeer, null>): Laag {
    const c = this.ctx!;
    const gain = c.createGain(); gain.connect(this.sfeerBus);
    const stops: (() => void)[] = [];
    if (s === 'straat') stops.push(this.ruisLaag(420, 60, 0.05, gain));
    if (s === 'binnen' || s === 'kantoor') stops.push(this.ruisLaag(260, 40, s === 'kantoor' ? 0.05 : 0.025, gain));
    if (s === 'regen') { stops.push(this.ruisLaag(7000, 900, 0.09, gain)); stops.push(this.ruisLaag(500, 80, 0.03, gain)); }
    const muziek = this.buffers.get('buren-muziek');
    if (s === 'avond' && muziek) {
      // muziek van de buren, gedempt door de muur: vooral bas, de hoge tonen vallen weg
      stops.push(this.ruisLaag(200, 30, 0.02, gain));
      const src = c.createBufferSource(); src.buffer = muziek; src.loop = true;
      const muur = c.createBiquadFilter(); muur.type = 'lowpass'; muur.frequency.value = 320; muur.Q.value = 0.7;
      const bas = c.createBiquadFilter(); bas.type = 'lowshelf'; bas.frequency.value = 110; bas.gain.value = 7;
      const pan = c.createStereoPanner(); pan.pan.value = 0.55; // de buren zitten rechts (achter de muur)
      const g = c.createGain(); g.gain.value = 0.5;
      src.connect(muur).connect(bas).connect(g).connect(pan).connect(gain);
      src.start(0, Math.random() * 40);
      stops.push(() => src.stop());
    } else if (s === 'avond') {
      // gedempte muziek van de buren: een lage akkoordlus achter de muur
      stops.push(this.ruisLaag(200, 30, 0.02, gain));
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
      const g = c.createGain(); g.gain.value = 0.03;
      const lfo = c.createOscillator(); lfo.frequency.value = 7.5 / (2 * Math.PI) * 1; const lfoG = c.createGain(); lfoG.gain.value = 0.015;
      lfo.connect(lfoG).connect(g.gain); lfo.start();
      for (const f of [55, 82.4, 110]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); stops.push(() => o.stop()); }
      lp.connect(g).connect(gain);
      stops.push(() => lfo.stop());
    }
    return { gain, stop: () => stops.forEach((f) => f()) };
  }

  /** Elke frame: willekeurige vogeltjes op straat, typen op kantoor. */
  update(dt: number): void {
    if (!this.actief) return;
    if (this.sfeer === 'straat') {
      this.vogelTimer -= dt;
      if (this.vogelTimer <= 0) { this.vogel(); this.vogelTimer = 2.5 + Math.random() * 6; }
    }
    if (this.sfeer === 'kantoor') {
      this.typTimer -= dt;
      if (this.typTimer <= 0) {
        const reeks = 3 + Math.floor(Math.random() * 8);
        for (let i = 0; i < reeks; i++) setTimeout(() => this.speel(`toets-${1 + Math.floor(Math.random() * 4)}`, { vol: 0.07, rate: 1.2 + Math.random() * 0.3, pan: -0.4, bus: 'sfeer' }) || this.tik(2400, 0.015), i * (70 + Math.random() * 70));
        this.typTimer = 1.5 + Math.random() * 3;
      }
    }
  }

  private vogel(): void {
    const c = this.ctx!, t0 = c.currentTime;
    const n = 2 + Math.floor(Math.random() * 3);
    const basis = 2600 + Math.random() * 1600;
    const pan = Math.random() * 1.6 - 0.8;
    for (let i = 0; i < n; i++) {
      const t = t0 + i * (0.09 + Math.random() * 0.05);
      const o = c.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(basis, t); o.frequency.exponentialRampToValueAtTime(basis * (1.3 + Math.random() * 0.4), t + 0.05);
      const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.035, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      const p = c.createStereoPanner(); p.pan.value = pan;
      o.connect(g).connect(p).connect(this.sfeerBus); o.start(t); o.stop(t + 0.08);
    }
  }

  // ------------------------------------------------------------------ hulpjes

  /** Kort tikje (terugval als een sample ontbreekt). */
  private tik(freq: number, vol: number): void {
    if (!this.actief) return;
    this.ruisStoot(freq, vol, 0.05);
  }

  private ruisStoot(freq: number, vol: number, duur: number): void {
    if (!this.ruis) return;
    const c = this.ctx!, t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.ruis;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1;
    const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + duur);
    src.connect(f).connect(g).connect(this.sfx); src.start(t, Math.random()); src.stop(t + duur + 0.02);
  }
}

/** Eén gedeelde geluidsmotor voor het hele spel. */
export const geluid = new Geluid();
