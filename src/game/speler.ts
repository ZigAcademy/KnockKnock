import type { Look } from '../player/character';
import { THEME } from '../theme';
import { MODELLEN, type Kapsel, type Mens } from '../assets/modellen';

/**
 * Het uiterlijk van de speler ("jij"), gekozen bij de start. Geen inhoud: alleen vormgeving.
 * Bewust geen keuze voor "afkomst" (dat leidt tot stereotypen); wel figuur, huidskleur,
 * haar (of hoofddoek) en kleding. Zig-blauw komt altijd terug in de kleding.
 */
export interface SpelerKeuze {
  figuur: 'man' | 'vrouw';
  huid: number;
  haar: number;
  hoofddoek: boolean;
  kleding: number;
  kapsel: number;
  /** Realistisch personage (index in SPELER_MENSEN[figuur]). */
  mens: number;
}

export const HUIDTINTEN = ['#F1CDB3', '#E0B394', '#C9966F', '#A8744F', '#7E5235', '#5A3A26'];
export const HAARKLEUREN = ['#24201D', '#4A3526', '#8A643F', '#C9A86A', '#8E4B2E', '#A9A8A3'];
export const HAARNAMEN = ['zwart', 'donkerbruin', 'bruin', 'blond', 'rood', 'grijs'];
export const HUIDNAMEN = ['heel licht', 'licht', 'licht getint', 'getint', 'donker', 'heel donker'];
export const KLEDINGNAMEN: Record<SpelerKeuze['figuur'], string[]> = {
  man: ['T-shirt', 'Hoodie', 'Pak'],
  vrouw: ['T-shirt', 'Jurk', 'Pak'],
};

/** Kapsels per figuur (losse hoofden uit de Quaternius-packs). */
export const KAPSELS: Record<SpelerKeuze['figuur'], { kapsel: Kapsel; naam: string }[]> = {
  man: [{ kapsel: 'man-krul', naam: 'Krullen' }, { kapsel: 'man-kort', naam: 'Kort' }, { kapsel: 'man-scheiding', naam: 'Scheiding' }, { kapsel: 'man-golf', naam: 'Kuif' }, { kapsel: 'man-lang', naam: 'Lang met baard' }],
  vrouw: [{ kapsel: 'vrouw-bob', naam: 'Bob' }, { kapsel: 'vrouw-staart', naam: 'Staart' }, { kapsel: 'vrouw-opgestoken', naam: 'Opgestoken' }, { kapsel: 'vrouw-pixie', naam: 'Pixie' }, { kapsel: 'vrouw-kort', naam: 'Kort' }],
};

const MARINE = '#2C3850';

/** Realistische personages (Rocketbox) waaruit de speler kiest. */
export const SPELER_MENSEN: Record<SpelerKeuze['figuur'], { mens: Mens; naam: string }[]> = {
  man: [{ mens: 'm04', naam: 'Zwart jack' }, { mens: 'm09', naam: 'Donker T-shirt' }, { mens: 'm12', naam: 'Spijkerjack' }, { mens: 'm16', naam: 'Blauw T-shirt' }],
  vrouw: [{ mens: 'f01', naam: 'Roze blouse' }, { mens: 'f08', naam: 'Grijs shirt' }, { mens: 'f03', naam: 'Paars topje' }, { mens: 'f11', naam: 'Bruine jurk' }, { mens: 'f06', naam: 'Hoofddoek' }],
};
/** Zijn de realistische personages geladen? Anders kiest de speler zoals voorheen (figuur, huid, haar, kleding). */
export const heeftMensen = () => MODELLEN.mensen.size > 0;

export const STANDAARD_KEUZE: SpelerKeuze = { figuur: 'man', huid: 1, haar: 1, hoofddoek: false, kleding: 0, kapsel: 0, mens: 0 };

/** Keuze → uiterlijk van het personage. */
export function lookVan(k: SpelerKeuze): Partial<Look> {
  const oud = lookZonderMens(k);
  const m = SPELER_MENSEN[k.figuur][k.mens] ?? SPELER_MENSEN[k.figuur][0];
  return m && MODELLEN.mensen.has(m.mens) ? { ...oud, mens: m.mens } : oud;
}

function lookZonderMens(k: SpelerKeuze): Partial<Look> {
  const huid = HUIDTINTEN[k.huid] ?? HUIDTINTEN[1];
  const haar = k.hoofddoek ? MARINE : HAARKLEUREN[k.haar] ?? HAARKLEUREN[1];
  const accessoires = k.hoofddoek ? [{ soort: 'hoofddoek' as const, kleur: MARINE }] : [];
  const basis = { skin: huid, hair: haar, accessoires, kapsel: KAPSELS[k.figuur][k.kapsel]?.kapsel ?? KAPSELS[k.figuur][0].kapsel };
  if (k.figuur === 'man') {
    if (k.kleding === 1) return { ...basis, outfit: 'man-hoodie', shirt: THEME.blue, trousers: MARINE, kleuren: { schoenen: '#E6E3DC', zool: '#BDB8AF' } };
    if (k.kleding === 2) return { ...basis, outfit: 'man-suit', shirt: MARINE, trousers: MARINE, kleuren: { binnen: '#F1EFEA', das: THEME.blue, schoenen: '#2B2622' } };
    return { ...basis, outfit: 'man-casual', shirt: THEME.blue, trousers: MARINE, kleuren: { schoenen: '#E6E3DC', zool: '#BDB8AF' } };
  }
  if (k.kleding === 1) return { ...basis, outfit: 'vrouw-formal', shirt: THEME.blue, trousers: MARINE, kleuren: { accent: MARINE, schoenen: '#2B2622' }, lengte: 1.7 };
  if (k.kleding === 2) return { ...basis, outfit: 'vrouw-suit', shirt: MARINE, trousers: MARINE, kleuren: { binnen: THEME.blue }, lengte: 1.7 };
  return { ...basis, outfit: 'vrouw-casual', shirt: THEME.blue, trousers: MARINE, kleuren: { schoenen: '#E6E3DC' }, lengte: 1.7 };
}

/** Compacte code (bijv. "m2101") voor de browser en SCORM suspend_data. */
export function codeVan(k: SpelerKeuze): string {
  return `${k.figuur[0]}${k.huid}${k.haar}${k.hoofddoek ? 1 : 0}${k.kleding}${k.kapsel}r${k.mens}`;
}

export function keuzeUitCode(code: string | null | undefined): SpelerKeuze | null {
  const m = /^([mv])([0-5])([0-5])([01])([0-2])([0-4])?(?:r([0-9]))?$/.exec(code ?? '');
  if (!m) return null;
  return { figuur: m[1] === 'm' ? 'man' : 'vrouw', huid: +m[2], haar: +m[3], hoofddoek: m[4] === '1', kleding: +m[5], kapsel: +(m[6] ?? 0), mens: +(m[7] ?? 0) };
}

export function willekeurigeKeuze(): SpelerKeuze {
  const r = (n: number) => Math.floor(Math.random() * n);
  const figuur = r(2) ? 'vrouw' : 'man';
  return { figuur, huid: r(6), haar: r(6), hoofddoek: r(6) === 0, kleding: r(3), kapsel: r(5), mens: r(SPELER_MENSEN[figuur].length) };
}

const KEY = 'wijkwijs-speler';
export function bewaarLokaal(k: SpelerKeuze): void { try { localStorage.setItem(KEY, codeVan(k)); } catch { /* geen opslag */ } }
export function laadLokaal(): SpelerKeuze | null { try { return keuzeUitCode(localStorage.getItem(KEY)); } catch { return null; } }
