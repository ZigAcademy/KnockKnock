import type { Tekst, Stap, Hotspot, Huurder, Medewerker, Meta } from './content/types';

/**
 * Taal (NL/EN). Leerinhoud komt uit scenarios.json ({ nl, en } en de *_en-velden);
 * hier staan alleen interfacelabels. Ontbreekt een Engelse tekst, dan valt hij terug op NL.
 */
export type Taal = 'nl' | 'en';
let taal: Taal = 'nl';
const luisteraars: (() => void)[] = [];

export function getTaal(): Taal { return taal; }
export function zetTaal(t: Taal): void {
  if (t === taal) return;
  taal = t;
  document.documentElement.lang = t;
  luisteraars.forEach((f) => f());
}
export function opTaal(f: () => void): void { luisteraars.push(f); }

/** Tekst uit de JSON in de huidige taal. */
export const tx = (t: Tekst | string | undefined | null): string =>
  t == null ? '' : typeof t === 'string' ? t : (taal === 'en' && t.en) || t.nl;

/** Opties en volgorde-items van een corporatiestap (zelfde volgorde in beide talen). */
export function stapOpties(s: Stap): string[] {
  const x = s as Stap & { opties?: string[]; opties_en?: string[] };
  return (taal === 'en' && x.opties_en) || x.opties || [];
}
export function stapItems(s: Stap): string[] {
  const x = s as Stap & { items?: string[]; items_en?: string[] };
  return (taal === 'en' && x.items_en) || x.items || [];
}
export const objectNaam = (h: Hotspot) => (taal === 'en' && (h as Hotspot & { object_en?: string }).object_en) || h.object;
export const huurderNaam = (h: Huurder | undefined) => (h ? (taal === 'en' && (h as Huurder & { naam_en?: string }).naam_en) || h.naam : '');
export const rolVan = (m: Medewerker) => (taal === 'en' && (m as Medewerker & { rol_en?: string }).rol_en) || m.rol;

/** Naam van de corporatie zonder "(fictief)" / "(fictional)". */
export function corporatieNaam(meta: Meta): string {
  return tx(meta.corporatie as Tekst | string).replace(/\s*\((fictief|fictional)\)\s*$/i, '').trim();
}

type Waarde = string | ((...a: (string | number)[]) => string);
const UI: Record<string, { nl: Waarde; en: Waarde }> = {
  start: { nl: 'Start', en: 'Start' },
  laden: { nl: 'Laden', en: 'Loading' },
  help: { nl: '<b>WASD</b> of <b>pijltjes</b>: lopen · <b>Shift</b>: rennen · <b>slepen</b>: camera · <b>klik</b>: loop erheen · <b>E</b>: aanbellen',
    en: '<b>WASD</b> or <b>arrows</b>: walk · <b>Shift</b>: run · <b>drag</b>: camera · <b>click</b>: walk there · <b>E</b>: ring the bell' },
  aanbellen: { nl: 'Aanbellen', en: 'Ring the bell' },
  aanbellenHint: { nl: (a) => `${a}. Druk op E om aan te bellen.`, en: (a) => `${a}. Press E to ring the bell.` },
  sluiten: { nl: 'Sluiten', en: 'Close' },
  verder: { nl: 'Verder', en: 'Continue' },
  naarBinnen: { nl: 'Naar binnen', en: 'Go inside' },
  terugStraat: { nl: 'Terug naar de straat', en: 'Back to the street' },
  openZig: { nl: 'Open Zig365', en: 'Open Zig365' },
  vraagVan: { nl: (n, t) => `Vraag ${n} van ${t}`, en: (n, t) => `Question ${n} of ${t}` },
  kiesAntwoord: { nl: 'Kies een antwoord', en: 'Choose an answer' },
  ditNeemJeMee: { nl: 'Dit neem je mee', en: 'Key takeaway' },
  praatMet: { nl: (n) => `Praat met ${n}`, en: (n) => `Talk to ${n}` },
  kijkRond: { nl: (a, b) => `Kijk rond: ${a} van ${b} bekeken`, en: (a, b) => `Look around: ${a} of ${b} checked` },
  ondertussen: { nl: (c) => `Ondertussen bij ${c} ...`, en: (c) => `Meanwhile at ${c} ...` },
  jeBentNu: { nl: 'Je bent nu', en: 'You are now' },
  huurderstevredenheid: { nl: 'Huurderstevredenheid', en: 'Tenant satisfaction' },
  proceskennis: { nl: 'Proceskennis', en: 'Process knowledge' },
  geluid: { nl: 'Geluid', en: 'Sound' },
  voiceOver: { nl: 'Voice-over', en: 'Voice-over' },
  overzicht: { nl: 'Overzicht', en: 'Overview' },
  instellingen: { nl: 'Instellingen', en: 'Settings' },
  terugzetten: { nl: 'Personage terugzetten', en: 'Reset character' },
  terugzettenTitel: { nl: 'Personage terugzetten (vastgelopen? Je voortgang blijft bewaard)', en: 'Reset character (stuck? Your progress is kept)' },
  minderBeweging: { nl: 'Minder beweging', en: 'Reduce motion' },
  taal: { nl: 'Taal', en: 'Language' },
  personageAanpassen: { nl: 'Personage aanpassen', en: 'Customise character' },
  noot: { nl: 'Voice-over: je hoort hem bij \'Achter de schermen\' na elke woning.', en: "Voice-over: you'll hear it in 'Behind the scenes' after each house." },
  klaar: { nl: 'Klaar', en: 'Done' },
  achterDeSchermen: { nl: 'Achter de schermen', en: 'Behind the scenes' },
  achterIntro: { nl: 'Zo liep deze vraag van de huurder door Zig365 naar de medewerkers van de corporatie.', en: "This is how the tenant's request travelled through Zig365 to the housing association's staff." },
  huurderRol: { nl: 'huurder', en: 'tenant' },
  beeldkwaliteit: { nl: 'Beeldkwaliteit', en: 'Graphics quality' },
  kwaliteitAuto: { nl: 'Automatisch', en: 'Automatic' },
  kwaliteitHoog: { nl: 'Hoog', en: 'High' },
  kwaliteitLaag: { nl: 'Laag (sneller)', en: 'Low (faster)' },
  voiceOverUit: { nl: 'Voice-over uit', en: 'Voice-over off' },
  voiceOverAan: { nl: 'Voice-over aan', en: 'Voice-over on' },
  herkansingTitel: { nl: 'Nog even oefenen?', en: 'Practise a bit more?' },
  herkansingTekst: { nl: (n, m) => `${n} van de ${m} vragen had je niet in één keer goed. Wil je die nog een keer proberen? Je score blijft gelijk.`, en: (n, m) => `You didn't get ${n} of the ${m} questions right first time. Want to try them again? Your score stays the same.` },
  oefenen: { nl: 'Ja, oefenen', en: 'Yes, practise' },
  overslaan: { nl: 'Nee, verder', en: 'No, continue' },
  oefenvraagVan: { nl: (n, t) => `Oefenvraag ${n} van ${t}`, en: (n, t) => `Practice question ${n} of ${t}` },
  telNietMee: { nl: 'Oefenen · telt niet mee', en: 'Practice · not scored' },
  klaarMetOefenen: { nl: 'Klaar met oefenen', en: 'Done practising' },
  opnieuwBeginnen: { nl: 'Opnieuw beginnen', en: 'Start over' },
  zekerWeten: { nl: 'Zeker weten? Klik nog eens', en: 'Are you sure? Click again' },
  voortgangBrowser: { nl: 'Je voortgang wordt in deze browser bewaard.', en: 'Your progress is saved in this browser.' },
  nogNiet: { nl: 'Nog niet geholpen', en: 'Not helped yet' },
  straatCompleet: { nl: 'De straat is compleet!', en: 'The street is complete!' },
  verderRondlopen: { nl: 'Verder rondlopen', en: 'Keep exploring' },
  wieBenJij: { nl: 'Wie ben jij?', en: 'Who are you?' },
  wieIntro: { nl: 'Kies hoe je eruitziet in de straat. Aanpassen kan later bij Instellingen.', en: 'Choose how you look in the street. You can change this later in Settings.' },
  kiesVoorMij: { nl: 'Kies voor mij', en: 'Choose for me' },
  figuur: { nl: 'Figuur', en: 'Figure' },
  man: { nl: 'Man', en: 'Man' },
  vrouw: { nl: 'Vrouw', en: 'Woman' },
  huidskleur: { nl: 'Huidskleur', en: 'Skin tone' },
  kapsel: { nl: 'Kapsel', en: 'Hairstyle' },
  haarkleur: { nl: 'Haarkleur', en: 'Hair colour' },
  hoofddoek: { nl: 'Hoofddoek', en: 'Headscarf' },
  kleding: { nl: 'Kleding', en: 'Clothes' },
  klant: { nl: 'Klant', en: 'Customer' },
  onderwerp: { nl: 'Onderwerp', en: 'Subject' },
  opdrachtVan: { nl: (n, t) => `Opdracht ${n} van ${t}`, en: (n, t) => `Task ${n} of ${t}` },
  proceskennisPunten: { nl: (p) => `Proceskennis: ${p}`, en: (p) => `Process knowledge: ${p}` },
  juistAntwoord: { nl: 'Juist antwoord', en: 'Correct answer' },
  zetVolgorde: { nl: 'Zet de stappen in de goede volgorde', en: 'Put the steps in the right order' },
  omhoog: { nl: 'omhoog', en: 'up' },
  omlaag: { nl: 'omlaag', en: 'down' },
  controleer: { nl: 'Controleer', en: 'Check' },
  goedeVolgorde: { nl: 'Goede volgorde', en: 'Correct order' },
  goed: { nl: 'Goed!', en: 'Correct!' },
  nietHelemaal: { nl: 'Niet helemaal.', en: 'Not quite.' },
  bron: { nl: (b) => `Bron: e-learning ${b}`, en: (b) => `Source: e-learning ${b}` },
  afronden: { nl: 'Afronden', en: 'Finish' },
  volgende: { nl: 'Volgende', en: 'Next' },
  zig365Regio: { nl: 'Zig365 (fictief oefenscherm)', en: 'Zig365 (fictional practice screen)' },
  hartjes: { nl: (s, m) => `Huurderstevredenheid: ${s} van ${m}`, en: (s, m) => `Tenant satisfaction: ${s} of ${m}` },
  startFout: { nl: (e) => `Het spel kon niet starten: ${e}`, en: (e) => `The game could not start: ${e}` },
};

/** Interfacelabel in de huidige taal. */
export function t(sleutel: keyof typeof UI | string, ...a: (string | number)[]): string {
  const w = UI[sleutel]?.[taal] ?? UI[sleutel]?.nl ?? sleutel;
  return typeof w === 'function' ? w(...a) : w;
}

/** Safiro-titel als PNG (tools/render_titels.py): NL = naam.png, EN = naam-en.png. */
export const titelPng = (pad: string) => (taal === 'en' ? pad.replace(/\.png$/, '-en.png') : pad);

/** Labels uit speler.ts (kleding, kapsels, kleuren) in het Engels. */
export const LABEL_EN: Record<string, string> = {
  'T-shirt': 'T-shirt', Hoodie: 'Hoodie', Pak: 'Suit', Jurk: 'Dress',
  Krullen: 'Curls', Kort: 'Short', Scheiding: 'Side parting', Kuif: 'Quiff', 'Lang met baard': 'Long with beard',
  Bob: 'Bob', Staart: 'Ponytail', Opgestoken: 'Updo', Pixie: 'Pixie',
  zwart: 'black', donkerbruin: 'dark brown', bruin: 'brown', blond: 'blond', rood: 'red', grijs: 'grey',
  'heel licht': 'very light', licht: 'light', 'licht getint': 'light tan', getint: 'tan', donker: 'dark', 'heel donker': 'very dark',
};
export const label = (nl: string) => (taal === 'en' ? LABEL_EN[nl] ?? nl : nl);
