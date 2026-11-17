/** Toetsenbord- en touchvriendelijke pins boven de hotspots in de kamer. */
export interface PinInfo { id: string; label: string }

export class HotspotPins {
  readonly el: HTMLElement;
  private pins = new Map<string, HTMLButtonElement>();
  onKies: ((id: string) => void) | null = null;
  onHover: ((id: string | null) => void) | null = null;

  constructor(root: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'pins';
    this.el.hidden = true;
    root.appendChild(this.el);
  }

  set(items: PinInfo[]): void {
    this.el.innerHTML = '';
    this.pins.clear();
    for (const it of items) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pin';
      b.dataset.testid = `pin-${it.id}`;
      b.setAttribute('aria-label', it.label);
      b.innerHTML = `<span class="pin-dot" aria-hidden="true"></span><span class="pin-label"></span>`;
      b.querySelector('.pin-label')!.textContent = it.label;
      b.addEventListener('click', () => this.onKies?.(it.id));
      b.addEventListener('pointerenter', () => this.onHover?.(it.id));
      b.addEventListener('pointerleave', () => this.onHover?.(null));
      b.addEventListener('focus', () => this.onHover?.(it.id));
      b.addEventListener('blur', () => this.onHover?.(null));
      this.el.appendChild(b);
      this.pins.set(it.id, b);
    }
  }

  show(on: boolean): void { this.el.hidden = !on; }

  position(id: string, x: number, y: number): void {
    const b = this.pins.get(id);
    if (b) b.style.transform = `translate(${x}px, ${y}px)`;
  }

  markeer(id: string, gevonden: boolean): void {
    const b = this.pins.get(id);
    if (!b) return;
    b.classList.toggle('gevonden', gevonden);
    const label = b.querySelector('.pin-label')!.textContent ?? '';
    b.setAttribute('aria-label', gevonden ? `${label} (bekeken)` : label);
  }

  setHover(id: string | null): void {
    this.pins.forEach((b, k) => b.classList.toggle('hover', k === id));
  }

  focus(id: string): void { this.pins.get(id)?.focus(); }
}
