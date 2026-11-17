/** Typen voor public/content/scenarios.json. De code bevat geen leerinhoud. */
export interface Tekst { nl: string; en?: string }

export interface Meta {
  titel: Tekst; versie: string; datum: string; bron: string; privacy: string;
  corporatie: Tekst | string; straat: string; taal: string;
}

export interface Product { id: string; naam: string; kort: string; naam_en?: string; kort_en?: string; bron: string[] }

export interface Huurder { id: string; naam: string; naam_en?: string; voornaam?: string; portret: string; woning: string; noot?: string }
export interface Medewerker { id: string; naam: string; rol: string; rol_en?: string; portret: string }

export interface Hotspot { id: string; object: string; object_en?: string; kern: boolean; tekst: Tekst }
export interface DialoogOptie { tekst: Tekst; score: number; feedback: Tekst }
export interface DialoogVraag { vraag: Tekst; opties: DialoogOptie[] }

export interface Huurderfase {
  deur: Tekst;
  hotspots: Hotspot[];
  dialoog: DialoogVraag[];
  leerpunt: Tekst;
}

interface StapBasis { vraag: Tekst; uitleg: Tekst; bron: string }
export interface KeuzeStap extends StapBasis { type: 'keuze' | 'systeem'; opties: string[]; opties_en?: string[]; goed: number }
export interface VolgordeStap extends StapBasis { type: 'volgorde'; items: string[]; items_en?: string[] }
export type Stap = KeuzeStap | VolgordeStap;

export interface CorporatieDeel { medewerker: string; intro: Tekst; stappen: Stap[] }

export interface Woning {
  id: string;
  adres: string;
  mvp: boolean;
  bron: string[];
  huurder: string;
  titel: Tekst;
  huurderfase: Huurderfase | null;
  intro?: Tekst;
  corporatiefase: CorporatieDeel[];
  afloop?: Tekst;
}

export interface Scenarios {
  meta: Meta;
  producten: Product[];
  personages: { huurders: Huurder[]; medewerkers: Medewerker[] };
  woningen: Woning[];
  open_vragen: string[];
}
