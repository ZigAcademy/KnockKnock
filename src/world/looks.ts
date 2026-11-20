import type { Look } from '../player/character';
import { THEME } from '../theme';

/**
 * Uiterlijk van de personages, afgestemd op de portretten (huidskleur, haar,
 * kleding). Alleen vormgeving, geen inhoud. Zonder model valt elk personage
 * terug op een figuur uit primitieven met shirt/skin/hair/trousers.
 */

/** Gedempte kledingkleuren (geen merkkleuren, behalve Zig-blauw bij de speler). */
const K = {
  marine: '#2C3850',
  marineDonker: '#232C3F',
  lichtblauw: '#B8CBE2',
  grijs: '#5B6068',
  antraciet: '#33373D',
  grijsHaar: '#A9A8A3',
  witHaar: '#DAD7D0',
  zwartHaar: '#24201D',
  bruinHaar: '#8A643F',
  terracotta: '#A9603F',
};

/** Speler ("jij"): Zig-blauw shirt als herkenningspunt, verder neutraal. */
export const SPELER_LOOK: Partial<Look> = {
  mens: 'm04', outfit: 'man-casual', shirt: THEME.blue, skin: '#D7AE8C', hair: '#4A3526', trousers: K.marine,
  kleuren: { schoenen: '#E6E3DC', zool: '#BDB8AF' },
};

export const HUURDER_LOOK: Record<string, Partial<Look>> = {
  // grijs haar, snor, marineblauw colbert over een lichtblauw overhemd
  farouk: { mens: 'mm3', outfit: 'man-suit', shirt: K.marine, skin: '#C49A78', hair: K.grijsHaar, trousers: K.antraciet,
    kleuren: { binnen: K.lichtblauw, das: K.lichtblauw, schoenen: '#3A2E26' }, accessoires: [{ soort: 'snor', kleur: '#5E5A55' }] },
  // donkere huid, kort grijs haar, grijze sik, lichtblauw overhemd met donkere das
  mensah: { mens: 'mb5', outfit: 'man-suit', shirt: K.lichtblauw, skin: '#6E4631', hair: '#8F8D88', trousers: K.antraciet,
    kleuren: { binnen: K.lichtblauw, das: K.marineDonker }, accessoires: [{ soort: 'sik', kleur: '#A3A19C' }], kapsel: 'man-kort' },
  // kort wit haar, marineblauwe trui, sjaal (gedempt, geen merkoranje)
  hansen: { mens: 'fb2', outfit: 'vrouw-casual', shirt: K.marine, skin: '#E2BFA5', hair: K.witHaar, trousers: K.grijs,
    accessoires: [{ soort: 'sjaal', kleur: K.terracotta }], lengte: 1.66, kapsel: 'vrouw-pixie' },
  // jong, bruin warrig haar, marineblauwe hoodie
  mulder: { mens: 'm06', outfit: 'man-hoodie', shirt: K.marine, skin: '#E0B394', hair: '#6B4A33', trousers: '#4A5060', kapsel: 'man-krul' },
  // kalend grijs, bril, korte grijze baard, trui over een lichtblauw overhemd
  vandijk: { mens: 'm13', outfit: 'man-suit', shirt: K.marine, skin: '#E3BFA2', hair: '#B8B6B0', trousers: K.antraciet,
    kleuren: { binnen: K.lichtblauw, das: K.lichtblauw, schoenen: '#3A2E26' }, kapsel: 'man-kort',
    accessoires: [{ soort: 'bril', kleur: '#2A2420' }, { soort: 'baard', kleur: '#B8B6B0' }] },
  // grijsbruin haar met scheiding, lichtblauwe col onder een marineblauw colbert
  volkov: { mens: 'm03', outfit: 'man-suit', shirt: K.marine, skin: '#E3BFA2', hair: '#9A8F80', trousers: K.antraciet,
    kleuren: { binnen: K.lichtblauw, das: K.lichtblauw }, kapsel: 'man-scheiding' },
  // lang golvend donkerbruin haar, marineblauw jasje, witte blouse
  yilmaz: { mens: 'f15', outfit: 'vrouw-suit', shirt: K.marine, skin: '#D9AE8C', hair: '#3E2A1E', trousers: K.marine, kleuren: { binnen: '#F1EFEA' }, kapsel: 'vrouw-bob' },
};

/** Medewerkers van de corporatie (afgestemd op de portretten). */
export const MEDEWERKER_LOOK: Record<string, Partial<Look>> = {
  // lichtbruin haar, marineblauw jasje, lichtblauwe blouse
  anna: { mens: 'f09', outfit: 'vrouw-suit', shirt: K.marine, skin: '#E3BFA2', hair: K.bruinHaar, trousers: K.marine, kleuren: { binnen: K.lichtblauw }, kapsel: 'vrouw-staart' },
  // marineblauwe hoofddoek, lichtblauwe blouse
  fatima: { mens: 'f06', outfit: 'vrouw-casual', shirt: K.lichtblauw, skin: '#C99A7A', hair: K.marineDonker, trousers: K.marine,
    accessoires: [{ soort: 'hoofddoek', kleur: K.marineDonker }] },
  // donker haar, baard, marineblauw over een lichtblauw overhemd
  tariq: { mens: 'm08', outfit: 'man-suit', shirt: '#2A3346', skin: '#C08F6C', hair: K.zwartHaar, trousers: K.antraciet,
    kleuren: { binnen: K.lichtblauw, das: K.lichtblauw, schoenen: '#2B2622' }, accessoires: [{ soort: 'baard', kleur: '#2A2420' }] },
  // zwart haar, bril, marineblauw colbert, wit overhemd
  wei: { mens: 'mb2', outfit: 'man-suit', shirt: K.marine, skin: '#E2BE9C', hair: '#1F1F22', trousers: K.antraciet,
    kleuren: { binnen: '#F1EFEA', das: '#F1EFEA' }, kapsel: 'man-kort', accessoires: [{ soort: 'bril', kleur: '#2A2420' }] },
  // krullend zwart haar, lichtblauw jasje, witte top
  amara: { mens: 'fb1', outfit: 'vrouw-suit', shirt: K.lichtblauw, skin: '#6E4631', hair: '#1F1F22', trousers: K.marine, kleuren: { binnen: '#F1EFEA' }, kapsel: 'vrouw-bob' },
  // rood haar en baard, geruit overhemd (hier marineblauw), wit T-shirt
  bram: { mens: 'm05', outfit: 'man-casual', shirt: '#33415E', skin: '#E9C3A6', hair: '#A85A2E', trousers: '#4A5060', kapsel: 'man-kort',
    accessoires: [{ soort: 'baard', kleur: '#A85A2E' }] },
  // blond-grijze bob, lichtblauw vest
  sanne: { mens: 'f13', outfit: 'vrouw-casual', shirt: K.lichtblauw, skin: '#EBC9AE', hair: '#CDB991', trousers: K.marine, kapsel: 'vrouw-bob' },
};

/** Toonhoogte (Hz) van het gebrabbel: hoger bij de vrouwelijke modellen, plus wat variatie per naam. */
export function stemVan(look: Partial<Look> | undefined, naam: string): number {
  let h = 0;
  for (const ch of naam) h = (h * 31 + ch.charCodeAt(0)) % 997;
  const vrouw = look?.mens ? look.mens.startsWith('f') : look?.outfit?.startsWith('vrouw');
  return (vrouw ? 225 : 135) + (h % 45);
}

/** Decorfiguren (voorbijgangers, collega's): geen inhoud, geen tekst, geen interactie. */
export const DECOR_LOOKS: Partial<Look>[] = [
  { mens: 'f08', outfit: 'vrouw-formal', shirt: '#6F7F6A', skin: '#D9B497', hair: '#5A3E2B', trousers: K.grijs, kleuren: { accent: '#8B7B5E', schoenen: '#4A3B30' } },
  { mens: 'm09', outfit: 'man-hoodie', shirt: '#7A6A58', skin: '#9C6B4E', hair: K.zwartHaar, trousers: '#4A5060' },
  { mens: 'f11', outfit: 'vrouw-casual', shirt: '#B9A58C', skin: '#E6C6AE', hair: '#B79B6B', trousers: '#556070' },
  { mens: 'm16', outfit: 'man-casual', shirt: '#8C8F86', skin: '#E0B89A', hair: '#A6A39C', trousers: '#5B5248' },
  { mens: 'f03', outfit: 'vrouw-suit', shirt: '#6E6A72', skin: '#B88464', hair: K.zwartHaar, trousers: '#3B3F48', kleuren: { binnen: '#DAD6CE' } },
  { mens: 'm12', outfit: 'man-suit', shirt: '#59626E', skin: '#E1BC9C', hair: '#6E5038', trousers: '#3A3E44', kleuren: { binnen: '#E2E0DA', das: '#7D6B57' } },
];
