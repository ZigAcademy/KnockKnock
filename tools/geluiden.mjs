#!/usr/bin/env node
/**
 * Geluiden voor Wijkwijs (fase 5): selecteert Kenney-geluiden uit tools/bron-assets/audio-*,
 * decodeert ze (Chromium via Playwright), maakt ze mono 22,05 kHz, knipt stilte weg,
 * en zet ze om naar AAC (.m4a, speelt ook in Safari) met afconvert (macOS).
 * Zonder afconvert blijft het WAV. Het origineel (.ogg) gaat ook mee; de game kiest wat de browser kan.   Gebruik: node tools/geluiden.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const BRON = path.join(ROOT, 'tools/bron-assets');
const UIT = path.join(ROOT, 'public/assets/geluid');
const IMP = 'audio-impact-sounds', INT = 'audio-interface-sounds', RPG = 'audio-rpg-audio', UI = 'audio-ui-audio';

/** [uitvoernaam, pack, bestand] */
const LIJST = [
  ...[0, 1, 2, 3, 4].map((i) => [`stap-steen-${i}`, IMP, `footstep_concrete_00${i}.ogg`]),
  ...[0, 1, 2, 3, 4].map((i) => [`stap-gras-${i}`, IMP, `footstep_grass_00${i}.ogg`]),
  ...[0, 1, 2, 3, 4].map((i) => [`stap-hout-${i}`, IMP, `footstep_wood_00${i}.ogg`]),
  ['deur-open', RPG, 'doorOpen_1.ogg'],
  ['deur-dicht', RPG, 'doorClose_2.ogg'],
  ['klik', INT, 'click_002.ogg'],
  ['hotspot', INT, 'open_002.ogg'],
  ['goed', INT, 'confirmation_002.ogg'],
  ['minder', INT, 'bong_001.ogg'],
  ['leerpunt', INT, 'maximize_003.ogg'],
  ['scherm-open', INT, 'maximize_006.ogg'],
  ['scherm-dicht', INT, 'minimize_006.ogg'],
  ['blad', RPG, 'bookFlip2.ogg'],
  ...[1, 2, 3, 4].map((i) => [`toets-${i}`, UI, `click${i}.ogg`]),
];

const findFile = (pack, naam) => {
  const stack = [path.join(BRON, pack)];
  while (stack.length) {
    const d = stack.pop();
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p); else if (e.name === naam) return p;
    }
  }
  throw new Error(`Niet gevonden: ${pack}/${naam}`);
};

function wav(pcm, rate) {
  const b = Buffer.alloc(44 + pcm.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + pcm.length * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(pcm.length * 2, 40);
  pcm.forEach((v, i) => b.writeInt16LE(v, 44 + i * 2));
  return b;
}

const heeftAfconvert = (() => { try { execFileSync('which', ['afconvert']); return true; } catch { return false; } })();
fs.mkdirSync(UIT, { recursive: true });
for (const f of fs.readdirSync(UIT)) if (/\.(m4a|wav|ogg)$/.test(f)) fs.unlinkSync(path.join(UIT, f));

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<html></html>');
let totaal = 0;
for (const [naam, pack, bestand] of LIJST) {
  const bron = findFile(pack, bestand);
  // origineel Ogg Vorbis voor browsers die dat kunnen (Chrome, Firefox, nieuwe Safari)
  fs.copyFileSync(bron, path.join(UIT, `${naam}.ogg`));
  totaal += fs.statSync(bron).size;
  const b64 = fs.readFileSync(bron).toString('base64');
  const pcm = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const ctx = new OfflineAudioContext(1, 1, 22050);
    const buf = await ctx.decodeAudioData(bytes.buffer);
    const n = buf.length, mono = new Float32Array(n);
    for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) mono[i] += d[i] / buf.numberOfChannels; }
    // stilte voor en achter wegknippen
    let a = 0, z = n - 1; const drempel = 0.004;
    while (a < n && Math.abs(mono[a]) < drempel) a++;
    while (z > a && Math.abs(mono[z]) < drempel) z--;
    return Array.from(mono.subarray(Math.max(0, a - 20), Math.min(n, z + 200)), (v) => Math.round(Math.max(-1, Math.min(1, v)) * 32767));
  }, b64);
  const wavPad = path.join(UIT, `${naam}.wav`);
  fs.writeFileSync(wavPad, wav(pcm, 22050));
  let uit = wavPad;
  if (heeftAfconvert) {
    uit = path.join(UIT, `${naam}.m4a`);
    execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '48000', wavPad, uit]);
    fs.unlinkSync(wavPad);
  }
  totaal += fs.statSync(uit).size;
}
// muziek van de buren (nr 18): fragment van 45 s, mono, naadloos te herhalen (overvloei aan de randen)
const muziek = path.join(BRON, 'muziek/buren.mp3');
if (fs.existsSync(muziek)) {
  const b64 = fs.readFileSync(muziek).toString('base64');
  const pcm = await page.evaluate(async (b64) => {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const ctx = new OfflineAudioContext(1, 1, 22050);
    const buf = await ctx.decodeAudioData(bytes.buffer);
    const sr = buf.sampleRate, start = Math.floor(60 * sr), lengte = Math.floor(45 * sr), fade = Math.floor(1.5 * sr);
    const mono = new Float32Array(lengte + fade);
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < mono.length; i++) mono[i] += (d[start + i] ?? 0) / buf.numberOfChannels;
    }
    const uit = mono.slice(0, lengte);
    for (let i = 0; i < fade; i++) { const t = i / fade; uit[i] = uit[i] * t + mono[lengte + i] * (1 - t); }
    return Array.from(uit, (v) => Math.round(Math.max(-1, Math.min(1, v * 0.9)) * 32767));
  }, b64);
  const wavPad = path.join(UIT, 'buren-muziek.wav');
  fs.writeFileSync(wavPad, wav(pcm, 22050));
  if (heeftAfconvert) {
    execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '32000', wavPad, path.join(UIT, 'buren-muziek.m4a')]);
    fs.unlinkSync(wavPad);
    totaal += fs.statSync(path.join(UIT, 'buren-muziek.m4a')).size;
  }
}
await browser.close();
// gebrabbel: aangeleverd mp3-bestand (speelt overal), ongewijzigd
const praten = path.join(BRON, 'praten/praten.mp3');
if (fs.existsSync(praten)) { fs.copyFileSync(praten, path.join(UIT, 'praten.mp3')); totaal += fs.statSync(praten).size; }
console.log(`${LIJST.length} geluiden, ${(totaal / 1024).toFixed(0)} kB, formaat ${heeftAfconvert ? 'm4a' : 'wav'}`);
