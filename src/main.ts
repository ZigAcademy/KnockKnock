import { t, tx, zetTaal, opTaal } from './i18n';
import './style.css';
import * as THREE from 'three';
import { applyCssVariables } from './theme';
import { loadScenarios, huisnummer } from './content/load';
import { Overlay, showTitleScreen } from './ui/overlay';
import { Input } from './player/input';
import { StreetScene } from './scenes/streetScene';
import { HuurderFase, heeftInterieur, type View } from './scenes/huurderfase';
import { Cards } from './ui/cards';
import { Progress } from './game/progress';
import { CorporatieFase } from './scenes/corporatiefase';
import { Zig365Scherm } from './ui/zig365';
import { Transition } from './ui/transition';
import { Settings } from './game/settings';
import { Hud } from './ui/hud';
import { Eindscherm, InstellingenPaneel } from './ui/panelen';
import { Scorm } from './scorm/scorm';
import type { Scenarios, Woning } from './content/types';
import { laadModellen, MODELLEN } from './assets/modellen';
import { geluid } from './audio/geluid';
import { SpelerMaker } from './ui/maker';
import { STANDAARD_KEUZE, bewaarLokaal, codeVan, keuzeUitCode, laadLokaal, lookVan, type SpelerKeuze } from './game/speler';
import { Interior } from './world/interior';
import { INRICHTING } from './world/interiors';
import { HUURDER_LOOK, MEDEWERKER_LOOK } from './world/looks';
import { Office } from './world/office';
import { Laadscherm } from './ui/laadscherm';

async function start(): Promise<void> {
  applyCssVariables();
  const app = document.getElementById('app')!;
  const ui = document.getElementById('ui')!;

  // Laadscherm; modellen zijn optioneel (zonder modellen: figuren uit primitieven).
  const laad = new Laadscherm(document.body);
  const [content] = await Promise.all([
    loadScenarios(),
    laadModellen((f) => laad.zet(f)),
    document.fonts.load('600 32px Poppins'),
    document.fonts.load('700 32px Poppins'),
    document.fonts.load('400 16px Poppins'),
  ]);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', `${content.meta.straat}`);
  app.appendChild(renderer.domElement);

  // taal eerst: de overlay bouwt zijn labels meteen in de gekozen taal
  const settings = new Settings();
  zetTaal(settings.waarden.taal);
  const overlay = new Overlay(ui);
  const input = new Input(renderer.domElement, overlay.joystick);
  const reducedMotion = () => settings.minderBeweging;
  // geluid: start na de eerste klik/toets; de instelling zet het aan of uit
  geluid.init(settings.waarden.geluid);
  settings.onChange(() => geluid.setAan(settings.waarden.geluid));
  ui.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('button')) geluid.speel('klik', { vol: 0.3 }); });

  const street = new StreetScene(content, input, reducedMotion);
  const cards = new Cards(ui);
  const progress = new Progress();
  let view: View | null = null;
  let bezig = false;
  const transition = new Transition(ui, reducedMotion);
  const zig = new Zig365Scherm(ui);
  const setView = (v: View | null) => { view = v; };
  const huurderfase = new HuurderFase({
    content, street, cards, ui, canvas: renderer.domElement, progress, transition, reducedMotion, setView,
  });
  const corporatiefase = new CorporatieFase({ content, street, cards, zig, transition, progress, reducedMotion, setView });

  // HUD, panelen, SCORM
  const hud = new Hud(ui, settings);
  // taalwissel: vaste labels direct bijwerken; kaarten en Zig365 volgen bij het volgende scherm
  settings.onChange(() => zetTaal(settings.waarden.taal));
  opTaal(() => { overlay.vertaal(); hud.vertaal(); document.title = `${tx(content.meta.titel)} – Zig Grow`; });
  document.title = `${tx(content.meta.titel)} – Zig Grow`;
  const eindscherm = new Eindscherm(ui, content, progress);
  const instellingen = new InstellingenPaneel(ui, settings);
  hud.onOverzicht = () => eindscherm.openen(alleMvpAf(content, progress));
  hud.onInstellingen = () => instellingen.openen();
  // vastgelopen? Zet het personage terug op de stoep; de voortgang blijft staan
  hud.onReset = () => {
    if (bezig || view || overlay.meldingOpen || panelOpen()) return;
    street.resetSpeler();
    renderer.domElement.focus();
  };
  const maker = new SpelerMaker(ui);
  const panelOpen = () => eindscherm.open || instellingen.open || maker.isOpen;

  const scorm = new Scorm();
  const bewaard = scorm.init();
  if (bewaard) progress.restore(bewaard);
  for (const w of content.woningen) if (progress.isAf(w.id)) street.markers.setState(w.id, 'af');
  const bijwerken = () => {
    const t = totalen(content, progress);
    hud.zet(t);
    const mvp = content.woningen.filter((w) => w.mvp);
    scorm.rapporteer({
      compleet: alleMvpAf(content, progress),
      voortgang: mvp.filter((w) => progress.isAf(w.id)).length / Math.max(1, mvp.length),
      proces: t.proces, procesMax: t.procesMax,
      suspend: progress.serialize(),
    });
  };
  // De finale (woning zonder huurderfase) komt pas als alle andere woningen af zijn
  const isFinale = (w: Woning) => !w.huurderfase;
  const finaleOpen = () => content.woningen.filter((w) => !isFinale(w)).every((w) => progress.isAf(w.id));
  street.beschikbaar = (w) => !isFinale(w) || finaleOpen();
  const markeringen = () => { for (const w of content.woningen) if (isFinale(w)) street.markers.setZichtbaar(w.id, finaleOpen() || progress.isAf(w.id)); };
  progress.onChange = () => { bijwerken(); markeringen(); };
  markeringen();
  bijwerken();

  // Uiterlijk van de speler: uit SCORM of de browser, anders kiezen na het titelscherm
  let keuze: SpelerKeuze | null = keuzeUitCode(progress.speler) ?? laadLokaal();
  const pasKeuzeToe = (k: SpelerKeuze) => {
    keuze = k;
    street.setSpelerLook(lookVan(k));
    bewaarLokaal(k);
    progress.speler = codeVan(k);
    bijwerken();
  };
  if (keuze) pasKeuzeToe(keuze);
  instellingen.onPersonage = async () => {
    if (bezig || maker.isOpen) return;
    pasKeuzeToe(await maker.open(keuze ?? STANDAARD_KEUZE));
    renderer.domElement.focus();
  };

  const aanbellen = async () => {
    const hier = street.deurInRange();
    if (!hier || overlay.meldingOpen || bezig || panelOpen()) return;
    const { woning, deur } = hier;
    if (!woning.huurderfase && woning.intro && woning.corporatiefase.length) {
      // finale: intro, dan de corporatiefases achter elkaar, dan de sleutels
      bezig = true;
      input.clicks.length = 0;
      const wasCompleet = alleMvpAf(content, progress);
      try {
        await cards.info(woning.adres, tx(woning.intro), t('verder'));
        cards.hide();
        const buren = content.woningen.filter((w) => w.huurderfase && w.id !== woning.id).flatMap((w) => {
          const nr = huisnummer(w.adres);
          const d = nr !== null ? street.doors.get(nr) : undefined;
          return d ? [{ deur: d, look: HUURDER_LOOK[w.huurder] ?? {} }] : [];
        });
        await corporatiefase.speel(woning, deur, () => {}, { buren });
      } finally { bezig = false; input.clicks.length = 0; }
      if (!wasCompleet && alleMvpAf(content, progress)) eindscherm.openen(true);
      return;
    }
    if (heeftInterieur(woning)) {
      bezig = true;
      input.clicks.length = 0;
      const wasCompleet = alleMvpAf(content, progress);
      try {
        await huurderfase.speel(woning, deur);
        await corporatiefase.speel(woning, deur, () => huurderfase.verlaat());
      } finally { bezig = false; input.clicks.length = 0; }
      if (!wasCompleet && alleMvpAf(content, progress)) eindscherm.openen(true);
      return;
    }
  };
  overlay.onAanbellen(aanbellen);
  input.onAction = aanbellen;

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    street.resize(window.innerWidth, window.innerHeight);
    huurderfase.resize(window.innerWidth, window.innerHeight);
    corporatiefase.resize(window.innerWidth, window.innerHeight);
  });

  // Debug-/testhaak (geen inhoud): posities voor de Playwright-rooktest.
  (window as unknown as { __wijkwijs: unknown }).__wijkwijs = {
    ready: false,
    standPoint: (nr: number) => { const d = street.doors.get(nr); return d ? street.player.project(d.stand) : null; },
    player: () => ({ x: street.player.position.x, z: street.player.position.z }),
    drawCalls: () => renderer.info.render.calls,
    progress: () => Object.fromEntries(progress.woningen),
    scorm: () => scorm.verbonden,
    modellen: MODELLEN,
    geluid,
    straat: street,
    /** Alleen voor screenshots: open een woonkamer direct (null = terug naar de straat). */
    debugKamer: (id: string | null) => {
      const w = content.woningen.find((x) => x.id === id);
      if (!w || !id || !INRICHTING[id]) { setView(null); (huurderfase as unknown as { interior: Interior | null }).interior = null; return; }
      const i = new Interior(INRICHTING[id], w.huurderfase!.hotspots.map((h) => h.id), HUURDER_LOOK[w.huurder] ?? {});
      i.resize(window.innerWidth, window.innerHeight);
      (huurderfase as unknown as { interior: Interior | null }).interior = i;
      setView(i);
    },
    /** Alleen voor screenshots: toon het kantoor met een medewerker. */
    debugKantoor: (id: string) => {
      const o = new Office(MEDEWERKER_LOOK);
      o.setMedewerker(id);
      o.resize(window.innerWidth, window.innerHeight);
      const loop = () => { o.update(1 / 60); if (view === o) requestAnimationFrame(loop); };
      setView(o); loop();
      (window as unknown as { __kantoor: Office }).__kantoor = o;
    },
    /** Alleen voor screenshots: zet de speler en de camera ergens neer. */
    debugCam: (v: { x: number; z: number; yaw: number; pitch: number; dist: number; rot?: number }) => {
      street.player.setPose(new THREE.Vector3(v.x, 0, v.z), v.rot ?? 0);
      Object.assign(street.player, { yaw: v.yaw, pitch: v.pitch, distance: v.dist });
    },
  };

  const timer = new THREE.Timer();
  timer.connect(document);
  let fpsAcc = 0, fpsFrames = 0;
  renderer.setAnimationLoop((time) => {
    timer.update(time);
    const dt = Math.min(timer.getDelta(), 1 / 20);
    const t = timer.getElapsed();
    input.enabled = !overlay.meldingOpen && !bezig && !panelOpen();
    document.body.classList.toggle('in-scene', bezig);
    geluid.update(dt);
    if (!view) {
      geluid.setSfeer('straat');
      street.update(dt, t, reducedMotion());
      const hier = !bezig && !overlay.meldingOpen && !panelOpen() ? street.deurInRange() : null;
      overlay.showPrompt(hier ? hier.woning.adres : null);
      renderer.render(street.scene, street.camera);
    } else {
      overlay.showPrompt(null);
      huurderfase.update(dt, t);
      corporatiefase.update(dt);
      renderer.render(view.scene, view.camera);
    }
    fpsAcc += timer.getDelta(); fpsFrames++;
    if (fpsAcc > 0.5) { overlay.setFps(fpsFrames / fpsAcc); fpsAcc = 0; fpsFrames = 0; }
  });

  laad.weg();
  await showTitleScreen(ui, tx(content.meta.titel), (taal) => settings.zet('taal', taal));
  if (!keuze) pasKeuzeToe(await maker.open(STANDAARD_KEUZE, t('start')));
  hud.show(true);
  renderer.domElement.focus();
  (window as unknown as { __wijkwijs: { ready: boolean } }).__wijkwijs.ready = true;
}

function alleMvpAf(content: Scenarios, progress: Progress): boolean {
  return content.woningen.filter((w) => w.mvp).every((w) => progress.isAf(w.id));
}

/** Meters over de verplichte (MVP-)woningen; later: alle woningen. */
function totalen(content: Scenarios, progress: Progress) {
  let hart = 0, hartMax = 0, proces = 0, procesMax = 0;
  for (const w of content.woningen.filter((x) => x.mvp)) {
    const v = progress.woningen.get(w.id);
    hartMax += w.huurderfase ? w.huurderfase.dialoog.reduce((s, q) => s + Math.max(...q.opties.map((o) => o.score)), 0) : 0;
    procesMax += w.corporatiefase.reduce((s, d) => s + d.stappen.length, 0);
    hart += v?.huurder?.score ?? 0;
    proces += v?.proces?.score ?? 0;
  }
  return { hart, hartMax, proces, procesMax };
}

start().catch((err) => {
  console.error(err);
  document.querySelector('.laadscherm')?.remove();
  document.body.insertAdjacentHTML('beforeend', `<p style="position:fixed;inset:auto 16px 16px;color:#152330">${t('startFout', String(err))}</p>`);
});
