import { onderdelenVan } from '../game/achterDeSchermen';
import type { AchterDeSchermen } from '../ui/achterschermen';
import type { Stap } from '../content/types';
import { t, tx, huurderNaam, corporatieNaam, rolVan as rolTekst, getTaal } from '../i18n';
import type { Look } from '../player/character';
import type { Scenarios, Woning } from '../content/types';
import { huurderVan, portretUrl } from '../content/load';
import { Office } from '../world/office';
import { HUURDER_LOOK, MEDEWERKER_LOOK, stemVan } from '../world/looks';
import { geluid } from '../audio/geluid';
import type { DoorInfo } from '../world/street';
import type { StreetScene } from './streetScene';
import type { Cards } from '../ui/cards';
import type { Zig365Scherm } from '../ui/zig365';
import type { Transition } from '../ui/transition';
import type { Progress } from '../game/progress';
import type { View } from './huurderfase';

interface Ctx {
  achter: AchterDeSchermen;
  content: Scenarios;
  street: StreetScene;
  cards: Cards;
  zig: Zig365Scherm;
  transition: Transition;
  progress: Progress;
  reducedMotion: () => boolean;
  setView: (v: View | null) => void;
}

/** Perspectiefwissel → kantoor met Zig365 (één of meer medewerkers) → afloop bij de huurder. */
export class CorporatieFase {
  private office: Office | null = null;
  private actief = false;

  constructor(private ctx: Ctx) {}

  get inKantoor(): boolean { return this.actief; }

  /**
   * @param finale bij de finale: de buren die in de afloop zwaaien (de speler geeft dan de sleutels).
   */
  async speel(woning: Woning, deur: DoorInfo, verlaatVorige: () => void, finale?: { buren: { deur: DoorInfo; look: Partial<Look> }[] }): Promise<void> {
    const { content, street, cards, zig, transition: tr, progress } = this.ctx;
    const corporatie = corporatieNaam(content.meta);
    const delen = woning.corporatiefase;
    const medewerker = (id: string) => content.personages.medewerkers.find((m) => m.id === id)!;
    const rolVan = (id: string) => { const m = medewerker(id); return { naam: m.naam, rol: rolTekst(m), portret: portretUrl(m.portret) }; };
    const huurder = huurderVan(content, woning);
    const rm = this.ctx.reducedMotion();

    // 1. Perspectiefwissel
    geluid.zoef();
    await tr.wissel(t('ondertussen', corporatie), rolVan(delen[0].medewerker));
    verlaatVorige();
    street.sluitDeur();
    this.ctx.setView(null);
    await tr.pauze(rm ? 1800 : 1500);
    if (!rm) {
      await tr.wisselWeg();
      await street.vliegNaarKantoor(false);
      await tr.fade(true);
    }

    // 2. Kantoor
    if (!this.office) this.office = new Office(MEDEWERKER_LOOK);
    const office = this.office;
    office.resize(window.innerWidth, window.innerHeight);
    this.actief = true;
    this.ctx.setView(office);
    geluid.setSfeer('kantoor');
    let goed = 0;
    const max = delen.reduce((s, d) => s + d.stappen.length, 0);
    let nr = 0;
    /** Vragen die niet in één keer goed waren: na afloop nog één keer oefenen (telt niet mee). */
    const gemist: { stap: Stap; m: string }[] = [];
    for (const [i, deel] of delen.entries()) {
      const m = medewerker(deel.medewerker);
      if (i > 0) await tr.fade(true);
      office.setMedewerker(m.id);
      if (i === 0 && rm) await tr.wisselWeg();
      await tr.fade(false);
      await cards.intro({ naam: m.naam, portret: portretUrl(m.portret), stem: stemVan(MEDEWERKER_LOOK[m.id], m.naam) }, rolTekst(m), tx(deel.intro), t('openZig'));
      cards.hide();
      zig.toon({
        medewerker: rolVan(m.id),
        huurder: { naam: huurderNaam(huurder), adres: woning.adres },
        titel: tx(woning.titel),
      });
      for (const stap of deel.stappen) {
        nr++;
        if (await zig.stap(stap, nr, max, goed, nr === max)) goed++;
        else gemist.push({ stap, m: m.id });
      }
      if (i < delen.length - 1 || !gemist.length) zig.sluit();
    }

    // 2b. Herkansing: oefenen met de gemiste vragen (de score blijft gelijk)
    if (gemist.length) {
      zig.sluit();
      const oefenen = await cards.keuze(t('herkansingTitel'), t('herkansingTekst', gemist.length, max), t('oefenen'), t('overslaan'));
      cards.hide();
      if (oefenen) {
        for (const [k, g] of gemist.entries()) {
          if (k === 0 || g.m !== gemist[k - 1].m) {
            office.setMedewerker(g.m);
            zig.toon({ medewerker: rolVan(g.m), huurder: { naam: huurderNaam(huurder), adres: woning.adres }, titel: tx(woning.titel) });
          }
          await zig.stap(g.stap, k + 1, gemist.length, 0, k === gemist.length - 1, true);
          if (k === gemist.length - 1 || gemist[k + 1].m !== g.m) zig.sluit();
        }
      }
    }

    // 3. Afloop bij de huurder
    await tr.fade(true);
    this.actief = false;
    this.ctx.setView(null);
    const spreker = { naam: huurderNaam(huurder) || woning.adres, portret: huurder ? portretUrl(huurder.portret) : undefined, stem: stemVan(HUURDER_LOOK[woning.huurder], huurder?.naam ?? '') };
    const deurOpen = street.openDeur(deur, woning.huurder, HUURDER_LOOK[woning.huurder] ?? {}, rm);
    await tr.fade(false);
    await deurOpen;
    progress.procesKlaar(woning.id, { score: goed, max });
    street.woningAf(woning);
    if (finale) {
      street.burenZwaaien(finale.buren, deur, rm);
      await street.geefSleutels(deur);
    }
    if (woning.afloop) {
      if (!finale) street.zwaai(woning.huurder);
      await cards.deur(spreker, tx(woning.afloop), t('verder'));
      cards.hide();
    }
    // 4. Achter de schermen: de route van de vraag door Zig365 (uit de teksten van deze casus)
    const onderdelen = onderdelenVan(woning, content.producten);
    if (onderdelen.length) {
      const ids = [...new Set(delen.map((d) => d.medewerker))];
      await this.ctx.achter.toon(
        { naam: huurderNaam(huurder) || woning.adres, rol: t('huurderRol'), portret: huurder ? portretUrl(huurder.portret) : undefined },
        onderdelen,
        ids.map((id) => { const m = medewerker(id); return { naam: m.naam, rol: rolTekst(m), portret: portretUrl(m.portret) }; }),
        t('terugStraat'),
        (() => {
          const st = (n: string) => `assets/stem/ads/${getTaal()}-${n}.mp3`;
          return { intro: st('intro'), stappen: [st(`h-${woning.huurder}`), ...onderdelen.map((p) => st(`p-${p.id}`)), ...ids.map((id) => st(`m-${id}`))] };
        })());
    }
    street.sluitDeur();
    street.player.setPose(deur.stand.clone().setZ(deur.stand.z + 0.4), 0);
  }

  update(dt: number): void { if (this.actief) this.office?.update(dt); }
  resize(w: number, h: number): void { this.office?.resize(w, h); }
}
