import * as THREE from 'three';
import { THEME } from '../theme';

/** Canvas-texture met tekst in Poppins (font moet al geladen zijn). */
export function textTexture(text: string, opts: {
  width: number; height: number; font: string; color: string; background?: string; radius?: number; border?: string;
}): THREE.CanvasTexture {
  const scale = 2;
  const cv = document.createElement('canvas');
  cv.width = opts.width * scale; cv.height = opts.height * scale;
  const ctx = cv.getContext('2d')!;
  ctx.scale(scale, scale);
  if (opts.background) {
    ctx.fillStyle = opts.background;
    roundRect(ctx, 0, 0, opts.width, opts.height, opts.radius ?? 0);
    ctx.fill();
    if (opts.border) { ctx.strokeStyle = opts.border; ctx.lineWidth = 4; roundRect(ctx, 2, 2, opts.width - 4, opts.height - 4, Math.max(0, (opts.radius ?? 0) - 2)); ctx.stroke(); }
  }
  ctx.fillStyle = opts.color;
  ctx.font = opts.font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, opts.width / 2, opts.height / 2 + 2);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Markering boven de deur: oranje speld met wit uitroepteken. */
export function markerTexture(): THREE.CanvasTexture {
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = s; cv.height = s * 1.3;
  const ctx = cv.getContext('2d')!;
  const cx = s / 2, cy = s / 2, r = s * 0.42;
  ctx.fillStyle = THEME.orange;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.8, Math.PI * 0.2);
  ctx.lineTo(cx, s * 1.26);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = THEME.white; ctx.lineWidth = 6; ctx.stroke();
  ctx.fillStyle = THEME.white;
  ctx.font = `700 ${Math.round(s * 0.6)}px Poppins, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('!', cx, cy + 4);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Afgeronde woning: blauwe cirkel met wit vinkje. */
export function checkTexture(): THREE.CanvasTexture {
  const s = 128;
  const cv = document.createElement('canvas');
  cv.width = s; cv.height = s * 1.3;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = THEME.blue;
  ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.42, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = THEME.white; ctx.lineWidth = 6; ctx.stroke();
  ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(s * 0.3, s * 0.52); ctx.lineTo(s * 0.45, s * 0.66); ctx.lineTo(s * 0.72, s * 0.36); ctx.stroke();
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
