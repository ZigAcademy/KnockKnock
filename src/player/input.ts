/**
 * Invoer: toetsenbord (WASD/pijltjes), muis (slepen = camera, klikken = lopen,
 * wiel = zoom) en touch (joystick + slepen + tikken).
 */
export interface MoveIntent { forward: number; right: number; turn: number; run: boolean }

export class Input {
  private keys = new Set<string>();
  /** Joystick: x = rechts, y = vooruit, beide -1..1. */
  joy = { x: 0, y: 0 };
  /** Opgespaarde camerabeweging (pixels) sinds de vorige frame. */
  look = { dx: 0, dy: 0 };
  zoom = 0;
  /** Klik/tik op het canvas zonder slepen (schermcoördinaten). */
  clicks: { x: number; y: number }[] = [];
  onAction: (() => void) | null = null;
  enabled = true;

  constructor(private canvas: HTMLCanvasElement, joystick: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (isTyping(e)) return;
      if ((e.key === 'e' || e.key === 'E') && !e.repeat) { this.onAction?.(); return; }
      const k = keyName(e);
      if (k) { this.keys.add(k); if (k.startsWith('Arrow')) e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => { const k = keyName(e); if (k) this.keys.delete(k); });
    window.addEventListener('blur', () => this.keys.clear());

    this.setupPointer();
    this.setupJoystick(joystick);
  }

  intent(): MoveIntent {
    const k = (n: string) => (this.enabled && this.keys.has(n) ? 1 : 0);
    let forward = k('w') + k('ArrowUp') - k('s') - k('ArrowDown');
    let right = k('d') - k('a');
    const turn = k('ArrowRight') - k('ArrowLeft');
    if (this.enabled && (this.joy.x || this.joy.y)) { forward += this.joy.y; right += this.joy.x; }
    return { forward: clamp(forward), right: clamp(right), turn, run: k('Shift') === 1 };
  }

  private setupPointer(): void {
    const pointers = new Map<number, { x: number; y: number; sx: number; sy: number; dragged: boolean }>();
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      capture(c, e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, dragged: false });
      if (e.pointerType === 'touch') document.body.classList.add('touch');
    });
    c.addEventListener('pointermove', (e) => {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (!p.dragged && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > 6) p.dragged = true;
      if (p.dragged) { this.look.dx += dx; this.look.dy += dy; }
    });
    const end = (e: PointerEvent) => {
      const p = pointers.get(e.pointerId);
      pointers.delete(e.pointerId);
      if (p && !p.dragged && e.type === 'pointerup' && (e.pointerType !== 'mouse' || e.button === 0)) {
        const r = c.getBoundingClientRect();
        this.clicks.push({ x: e.clientX - r.left, y: e.clientY - r.top });
      }
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('wheel', (e) => { e.preventDefault(); this.zoom += Math.sign(e.deltaY); }, { passive: false });
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private setupJoystick(el: HTMLElement): void {
    const knob = el.querySelector<HTMLElement>('.knob')!;
    let id: number | null = null;
    const update = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const max = r.width / 2;
      let x = e.clientX - (r.left + max), y = e.clientY - (r.top + max);
      const len = Math.hypot(x, y);
      if (len > max) { x *= max / len; y *= max / len; }
      knob.style.transform = `translate(${x}px, ${y}px)`;
      const dead = 0.12;
      const nx = x / max, ny = -y / max;
      this.joy.x = Math.abs(nx) < dead ? 0 : nx;
      this.joy.y = Math.abs(ny) < dead ? 0 : ny;
    };
    el.addEventListener('pointerdown', (e) => {
      id = e.pointerId; capture(el, e.pointerId); update(e);
      document.body.classList.add('touch');
    });
    el.addEventListener('pointermove', (e) => { if (e.pointerId === id) update(e); });
    const stop = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = null; this.joy.x = 0; this.joy.y = 0; knob.style.transform = '';
    };
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
  }
}

function keyName(e: KeyboardEvent): string | null {
  if (e.key === 'Shift') return 'Shift';
  if (e.key.startsWith('Arrow')) return e.key;
  const map: Record<string, string> = { KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd' };
  return map[e.code] ?? null;
}

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

const clamp = (v: number) => Math.max(-1, Math.min(1, v));

function capture(el: Element, id: number): void {
  try { el.setPointerCapture(id); } catch { /* pointer al weg: geen probleem */ }
}
