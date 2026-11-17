import { AANRECHT, TAFEL, type Inrichting, type MeubelPlaatsing } from './vrijeZones';

export type { Inrichting, PropPlaatsing } from './vrijeZones';

/**
 * Inrichting per woning (alleen vormgeving en plaatsing; de teksten van de hotspots
 * komen uit scenarios.json via het hotspot-id). Zie docs/INRICHTING.md voor het plan.
 * Maten in meters: [breedte, hoogte, diepte] vóór draaiing.
 */

const PI = Math.PI;
const lijst = (x: number, y: number, z: number, rotY: number, w: number, h: number, kleur: string): MeubelPlaatsing =>
  ({ model: 'proc:lijst', pos: [x, z], y, rotY, maat: [w, h, 0.03], kleur: { vlak: kleur } });

export const INRICHTING: Record<string, Inrichting> = {
  // Lindelaan 14 – de heer Farouk: lichte woonkeuken, alles draait om de eettafel
  w1: {
    kamer: {
      binnendeur: { wand: 'links', pos: 1.6, breedte: 1.0 },
      ramen: [{ wand: 'achter', pos: 2.0, breedte: 1.8 }],
      kleuren: { muur: '#EDE3D3', vloer: '#B89A7A', keuken: '#7F8C6E', stof: '#8B7D6B' },
      licht: 'dag',
      keuken: { x0: -3.95, x1: -0.95, koelkast: true, spoelbakX: -1.8, ovenX: -1.24, bovenkast: [-2.95, -1.25] },
    },
    hotspots: {
      kraan: { prop: 'kraan', pos: [-1.81, AANRECHT, -2.75] },
      telefoon: { prop: 'telefoon', pos: [0.5, TAFEL, 0.55] },
      laptop: { prop: 'laptop', pos: [3.42, TAFEL, -0.9], rotY: -1.0 },
    },
    huurder: { pos: [-0.55, 0.9], rotY: 0.35 },
    meubels: [
      { model: 'proc:kleed-rond', pos: [0.6, 0.35], maat: [2.3, 0.02, 2.3], kleur: { vlak: '#B48A72', rand: '#8F6A57' } },
      { model: 'tafel-rond-klein', pos: [0.6, 0.35], maat: [1.25, TAFEL, 1.25], kleur: { Wood: '#9A7B5F' } },
      { model: 'stoel-2', pos: [0.6, -0.5], maat: [0.46, 0.92, 0.5], kleur: { Cushin: '#8B7D6B' } },
      { model: 'stoel-2', pos: [1.48, 0.35], rotY: -PI / 2, maat: [0.46, 0.92, 0.5], kleur: { Cushin: '#8B7D6B' } },
      { model: 'stoel-2', pos: [0.6, 1.22], rotY: PI, maat: [0.46, 0.92, 0.5], kleur: { Cushin: '#8B7D6B' } },
      { model: 'schaal', kit: 'eten', pos: [0.82, 0.12], y: TAFEL, maat: [0.32, 0.1, 0.32] },
      { model: 'appel', kit: 'eten', pos: [0.78, 0.1], y: TAFEL + 0.05, maat: [0.08, 0.08, 0.08] },
      { model: 'sinaasappel', kit: 'eten', pos: [0.88, 0.16], y: TAFEL + 0.05, maat: [0.08, 0.08, 0.08] },
      { model: 'peer', kit: 'eten', pos: [0.84, 0.04], y: TAFEL + 0.05, maat: [0.08, 0.1, 0.08] },
      { model: 'lamp-hang-2', pos: [0.6, 0.35], y: 2.2, maat: [0.55, 0.6, 0.55], licht: true },
      { model: 'bureau', pos: [3.62, -0.9], rotY: -PI / 2, maat: [1.3, TAFEL, 0.7] },
      { model: 'bureaustoel', pos: [2.85, -0.9], rotY: PI / 2, maat: [0.6, 0.95, 0.6], kleur: { Chair: '#5F6670' } },
      { model: 'lamp-bureau', pos: [3.72, -1.38], y: TAFEL, rotY: -PI / 2, maat: [0.18, 0.4, 0.3] },
      { model: 'ladekast', pos: [-3.62, -0.25], rotY: PI / 2, maat: [1.6, 0.8, 0.65] },
      { model: 'radio', pos: [-3.62, -0.75], y: 0.8, rotY: PI / 2, maat: [0.32, 0.22, 0.12] },
      { model: 'plant-3', pos: [-3.62, 0.25], y: 0.8, maat: [0.3, 0.28, 0.3] },
      lijst(-3.97, 1.25, -0.6, PI / 2, 0.45, 0.55, '#9FB2A0'),
      lijst(-3.97, 1.35, 0.05, PI / 2, 0.55, 0.4, '#C9B89A'),
      { model: 'plantje-1', pos: [1.45, -2.87], y: 1.0, maat: [0.16, 0.26, 0.16] },
      { model: 'plantje-2', pos: [2.55, -2.87], y: 1.0, maat: [0.16, 0.26, 0.16] },
      { model: 'gordijn', pos: [2.0, -2.93], y: 0.9, maat: [2.7, 1.75, 0.12], kleur: { Couch_Blue: '#C9BBA6' } },
      { model: 'plant-4', pos: [3.5, -2.55], maat: [0.75, 0.95, 0.75] },
      { model: 'fauteuil-relax', pos: [3.15, 1.95], rotY: -PI / 2, maat: [0.8, 0.9, 0.8], kleur: { carpet: '#8B7D6B' } },
      { model: 'lamp-vloer', pos: [3.65, 2.65], maat: [0.32, 1.5, 0.32] },
      lijst(0.15, 1.45, -2.98, 0, 0.6, 0.45, '#B9A27E'),
    ],
  },

  // Lindelaan 16 – de heer Mensah: praktisch, grauw regenlicht, zithoek + werkplek
  w2: {
    kamer: {
      binnendeur: { wand: 'achter', pos: -3.0, breedte: 1.0 },
      ramen: [],
      hotspotRamen: [{ wand: 'achter', pos: 2.2, breedte: 1.8 }],
      kleuren: { muur: '#E1E4E7', vloer: '#8E7A66', keuken: '#8C939B', stof: '#6E7884' },
      licht: 'regen',
      keuken: { x0: -2.25, x1: 0.75, spoelbakX: -1.3, ovenX: -0.1, bovenkast: [-1.6, 0.15] },
    },
    hotspots: {
      raam: { prop: 'raamLek', pos: [2.2, 0.9, -3] },
      notitie: { prop: 'notitie', pos: [-3.45, 0.55, 1.95] },
      laptop: { prop: 'laptop', pos: [3.42, TAFEL, 0.4], rotY: -1.0 },
    },
    huurder: { pos: [0.3, 1.0], rotY: -0.2 },
    meubels: [
      { model: 'proc:kleed', pos: [-2.4, 0.4], maat: [2.0, 0.02, 2.6], kleur: { vlak: '#7D8794', rand: '#5E6672' } },
      { model: 'sofa', pos: [-3.5, 0.35], rotY: PI / 2, maat: [2.1, 0.82, 0.9], kleur: { Sofa: '#6E7884', Legs: '#4A4038' } },
      { model: 'kussen', pos: [-3.55, -0.3], y: 0.42, rotY: PI / 2, maat: [0.42, 0.36, 0.14], kleur: { carpet: '#A3A9B0' } },
      { model: 'kussen', pos: [-3.55, 0.95], y: 0.42, rotY: PI / 2, maat: [0.42, 0.36, 0.14], kleur: { carpet: '#8C7A6B' } },
      { model: 'salontafel', pos: [-2.2, 0.35], rotY: PI / 2, maat: [1.0, 0.42, 0.6] },
      { model: 'mok', kit: 'eten', pos: [-2.15, 0.15], y: 0.42, maat: [0.1, 0.1, 0.09] },
      { model: 'nachtkastje', pos: [-3.45, 1.95], maat: [0.55, 0.55, 0.55] },
      { model: 'lamp-vloer', pos: [-3.72, -1.15], maat: [0.32, 1.5, 0.32] },
      { model: 'kapstok', pos: [-3.8, -2.0], maat: [0.4, 1.75, 0.4] },
      { model: 'lamp-hang', pos: [-2.2, 0.4], y: 2.1, maat: [0.42, 0.7, 0.42], licht: true },
      { model: 'bureau', pos: [3.62, 0.4], rotY: -PI / 2, maat: [1.3, TAFEL, 0.7], kleur: { Wood: '#6E5644', DarkWood: '#4E4038' } },
      { model: 'bureaustoel', pos: [2.85, 0.4], rotY: PI / 2, maat: [0.6, 0.95, 0.6], kleur: { Chair: '#4A5058' } },
      { model: 'kast-laag', pos: [3.6, -2.3], rotY: -PI / 2, maat: [1.2, 0.85, 0.6] },
      { model: 'boeken', pos: [3.62, -2.0], y: 0.85, rotY: -PI / 2, maat: [0.3, 0.2, 0.18] },
      { model: 'plank', pos: [3.88, -0.9], y: 1.45, rotY: -PI / 2, maat: [1.1, 0.3, 0.25] },
      { model: 'boeken', pos: [3.86, -1.1], y: 1.5, rotY: -PI / 2, maat: [0.3, 0.2, 0.18] },
      { model: 'plant-1', pos: [1.0, -2.7], maat: [0.45, 0.7, 0.45] },
      { model: 'proc:radiator', pos: [2.2, -2.93], maat: [1.2, 0.6, 0.1] },
      lijst(-3.97, 1.35, 0.35, PI / 2, 0.9, 0.5, '#8A97A6'),
      lijst(-0.9, 1.6, -2.98, 0, 0.4, 0.5, '#A6A08F'),
    ],
  },

  // Lindelaan 18 – mevrouw Hansen: avond, warm lamplicht, de muur naar de buren vrij
  w3: {
    kamer: {
      binnendeur: { wand: 'links', pos: -1.6, breedte: 1.0 },
      ramen: [],
      hotspotRamen: [{ wand: 'achter', pos: 2.2, breedte: 1.8 }],
      kleuren: { muur: '#EFE6D8', vloer: '#C2A88A', stof: '#7C8F7A' },
      licht: 'avond',
    },
    hotspots: {
      muur: { prop: 'muur', pos: [3.99, 0, 0.6], rotY: -PI / 2 },
      raam: { prop: 'raamStalling', pos: [2.2, 0.9, -3] },
      laptop: { prop: 'laptop', pos: [1.55, TAFEL, -1.3], rotY: 0.25 },
    },
    huurder: { pos: [-0.6, 0.9], rotY: 0.4 },
    meubels: [
      { model: 'proc:kleed-rond', pos: [-2.3, 1.0], maat: [2.2, 0.02, 2.2], kleur: { vlak: '#7F8EA3', rand: '#5A6A80' } },
      { model: 'bank-2', pos: [-3.5, 1.0], rotY: PI / 2, maat: [2.1, 0.85, 0.95], kleur: { Couch_Mustard: '#7C8F7A', Wood: '#6E5644' } },
      { model: 'kussen', pos: [-3.55, 0.35], y: 0.44, rotY: PI / 2, maat: [0.4, 0.34, 0.14], kleur: { carpet: '#C9BBA6' } },
      { model: 'salontafel', pos: [-2.3, 1.0], rotY: PI / 2, maat: [1.0, 0.42, 0.6], kleur: { wood: '#8A6E55' } },
      { model: 'theekop', kit: 'eten', pos: [-2.25, 0.8], y: 0.42, maat: [0.1, 0.07, 0.1] },
      { model: 'boeken', pos: [-2.35, 1.25], y: 0.42, maat: [0.25, 0.12, 0.18] },
      { model: 'lamp-vloer', pos: [-3.65, 2.6], maat: [0.34, 1.55, 0.34], licht: true },
      { model: 'boekenkast-boeken', pos: [-0.9, -2.7], maat: [1.15, 1.9, 0.36] },
      { model: 'plant-4', pos: [-3.45, -2.6], maat: [0.7, 0.9, 0.7] },
      { model: 'kapstok', pos: [-3.75, -0.45], maat: [0.4, 1.75, 0.4] },
      { model: 'proc:helm', pos: [-3.6, -0.45], y: 1.42, maat: [0.26, 0.16, 0.3], kleur: { vlak: '#3E5A6B' } },
      { model: 'tafel-rond-klein', pos: [1.55, -1.35], maat: [1.1, TAFEL, 1.1], kleur: { Wood: '#A88A6B' } },
      { model: 'stoel-3', pos: [1.55, -0.5], rotY: PI, maat: [0.46, 0.92, 0.5], kleur: { Cushin: '#7C8F7A' } },
      { model: 'stoel-3', pos: [0.7, -1.35], rotY: PI / 2, maat: [0.46, 0.92, 0.5], kleur: { Cushin: '#7C8F7A' } },
      { model: 'lamp-hang-2', pos: [1.55, -1.35], y: 2.05, maat: [0.5, 0.75, 0.5], licht: true },
      { model: 'plant-2', pos: [3.6, -2.6], maat: [0.35, 0.85, 0.35] },
      lijst(-3.97, 1.45, 1.0, PI / 2, 0.8, 0.55, '#8796A6'),
      lijst(0.2, 1.55, -2.98, 0, 0.45, 0.6, '#B8A48A'),
    ],
  },

  // Lindelaan 20 – de heer Mulder: lichte woonkeuken, brief op tafel, zicht op de achtertuin
  w4: {
    kamer: {
      binnendeur: { wand: 'links', pos: -1.4, breedte: 1.0 },
      ramen: [],
      hotspotRamen: [{ wand: 'achter', pos: 2.2, breedte: 1.8 }],
      kleuren: { muur: '#E6EAE4', vloer: '#B08E6A', keuken: '#7D8A99', stof: '#7A8A6E' },
      licht: 'dag',
      keuken: { x0: -3.25, x1: -0.95, koelkast: true, spoelbakX: -2.0, ovenX: -1.25, bovenkast: [-2.2] },
    },
    hotspots: {
      brief: { prop: 'brief', pos: [0.35, TAFEL, 0.45] },
      tuin: { prop: 'raamTuin', pos: [2.2, 0.9, -3] },
    },
    huurder: { pos: [-1.35, 1.0], rotY: 0.4 },
    meubels: [
      { model: 'proc:kleed', pos: [0.5, 0.45], maat: [2.4, 0.02, 1.8], kleur: { vlak: '#A9B39E', rand: '#7A8A6E' } },
      { model: 'tafel-2', pos: [0.5, 0.45], maat: [1.5, TAFEL, 0.85], kleur: { Wood: '#B08F6A', DarkWood: '#7A5E45' } },
      { model: 'stoel-3', pos: [0.15, -0.25], maat: [0.46, 0.92, 0.5], kleur: { Cushin: '#7A8A6E' } },
      { model: 'stoel-3', pos: [0.85, -0.25], maat: [0.46, 0.92, 0.5], kleur: { Cushin: '#7A8A6E' } },
      { model: 'stoel-3', pos: [1.55, 0.45], rotY: -PI / 2, maat: [0.46, 0.92, 0.5], kleur: { Cushin: '#7A8A6E' } },
      { model: 'mok', kit: 'eten', pos: [0.8, 0.55], y: TAFEL, maat: [0.1, 0.1, 0.09] },
      { model: 'lamp-hang', pos: [0.5, 0.45], y: 2.1, maat: [0.42, 0.7, 0.42], licht: true },
      { model: 'bank-2', pos: [3.5, 1.15], rotY: -PI / 2, maat: [2.0, 0.85, 0.95], kleur: { Couch_Mustard: '#7A8A6E', Wood: '#6E5644' } },
      { model: 'salontafel', pos: [2.45, 1.15], rotY: PI / 2, maat: [0.9, 0.4, 0.55] },
      { model: 'boeken', pos: [2.45, 1.0], y: 0.4, maat: [0.24, 0.12, 0.18] },
      { model: 'boekenkast', pos: [0.15, -2.78], maat: [0.95, 1.85, 0.34] },
      { model: 'proc:radiator', pos: [2.2, -2.93], maat: [1.2, 0.6, 0.1] },
      { model: 'plant-1', pos: [3.55, -2.6], maat: [0.5, 0.75, 0.5] },
      { model: 'kapstok', pos: [-3.75, 0.0], maat: [0.4, 1.75, 0.4] },
      lijst(-3.97, 1.5, 1.4, PI / 2, 0.7, 0.5, '#9FB2A0'),
      lijst(3.97, 1.55, 1.15, -PI / 2, 0.9, 0.5, '#B9A27E'),
    ],
  },

  // Lindelaan 22 – de heer Van Dijk: compact en wat rommelig, post bij de deur, werkplek met laptop
  w5: {
    kamer: {
      binnendeur: { wand: 'achter', pos: -2.6, breedte: 1.0 },
      ramen: [{ wand: 'achter', pos: 1.6, breedte: 1.8 }],
      kleuren: { muur: '#ECE6DA', vloer: '#9C8268', keuken: '#8E7258', stof: '#8C7A66' },
      licht: 'dag',
      keuken: { x0: -1.9, x1: 0.5, spoelbakX: -1.3, ovenX: -0.1, bovenkast: [-1.3] },
    },
    hotspots: {
      post: { prop: 'post', pos: [-3.62, 0.55, -2.55] },
      laptop: { prop: 'laptop', pos: [-3.45, TAFEL, 0.55], rotY: 1.0 },
    },
    huurder: { pos: [-1.1, 1.25], rotY: 0.3 },
    meubels: [
      { model: 'nachtkastje', pos: [-3.62, -2.55], maat: [0.6, 0.55, 0.55] },
      { model: 'bureau', pos: [-3.62, 0.55], rotY: PI / 2, maat: [1.3, TAFEL, 0.7], kleur: { Wood: '#8E7258', DarkWood: '#5E4B3C' } },
      { model: 'bureaustoel', pos: [-2.85, 0.55], rotY: -PI / 2, maat: [0.6, 0.95, 0.6], kleur: { Chair: '#4A5058' } },
      { model: 'proc:kleed', pos: [2.4, 0.7], maat: [2.0, 0.02, 2.2], kleur: { vlak: '#B9A58C', rand: '#8C7A66' } },
      { model: 'sofa-2', pos: [3.5, 0.7], rotY: -PI / 2, maat: [2.0, 0.8, 0.85], kleur: { Sofa: '#8C7A66', Legs: '#4A4038' } },
      { model: 'kussen', pos: [3.55, 0.1], y: 0.42, rotY: -PI / 2, maat: [0.4, 0.34, 0.14], kleur: { carpet: '#C9BBA6' } },
      { model: 'salontafel', pos: [2.4, 0.7], rotY: PI / 2, maat: [0.9, 0.4, 0.55] },
      { model: 'mok', kit: 'eten', pos: [2.35, 0.5], y: 0.4, maat: [0.1, 0.1, 0.09] },
      { model: 'tv-meubel', pos: [3.3, -2.75], maat: [1.1, 0.5, 0.42] },
      { model: 'tv', pos: [3.3, -2.8], y: 0.5, maat: [0.9, 0.55, 0.1] },
      { model: 'tafel-rond-klein', pos: [0.2, 0.6], maat: [1.0, TAFEL, 1.0] },
      { model: 'stoel', pos: [0.2, -0.15], maat: [0.44, 0.9, 0.48] },
      { model: 'stoel', pos: [0.95, 0.6], rotY: -PI / 2, maat: [0.44, 0.9, 0.48] },
      { model: 'schaal', kit: 'eten', pos: [0.25, 0.75], y: TAFEL, maat: [0.3, 0.1, 0.3] },
      { model: 'lamp-hang-2', pos: [0.2, 0.6], y: 2.2, maat: [0.5, 0.6, 0.5], licht: true },
      { model: 'plant-3', pos: [1.0, -2.85], y: 0.97, maat: [0.3, 0.28, 0.3] },
      { model: 'lamp-vloer', pos: [3.65, 2.5], maat: [0.32, 1.5, 0.32] },
      lijst(3.97, 1.5, 0.7, -PI / 2, 0.8, 0.5, '#A6A08F'),
    ],
  },

  // Lindelaan 24 – de heer Volkov: woning met trap en overloop; de lege hoek is boven
  w6: {
    kamer: {
      binnendeur: { wand: 'rechts', pos: 1.6, breedte: 1.0 },
      ramen: [],
      kleuren: { muur: '#E8E4DC', vloer: '#A88B6C', stof: '#6E6A78' },
      licht: 'dag',
      verdieping: { y: 2.6, diepte: 1.5 },
    },
    hotspots: {
      overloop: { prop: 'overloop', pos: [2.6, 2.6, -3] },
      folder: { prop: 'folder', pos: [0.55, TAFEL, 0.75] },
    },
    huurder: { pos: [-1.6, 1.4], rotY: 0.35 },
    meubels: [
      { model: 'proc:kleed', pos: [0.7, 0.6], maat: [2.4, 0.02, 1.9], kleur: { vlak: '#9E9AAE', rand: '#6E6A78' } },
      { model: 'tafel', pos: [0.7, 0.6], maat: [1.6, TAFEL, 0.85] },
      { model: 'stoel-2', pos: [0.35, -0.1], maat: [0.46, 0.92, 0.5], kleur: { Cushin: '#6E6A78' } },
      { model: 'stoel-2', pos: [1.05, -0.1], maat: [0.46, 0.92, 0.5], kleur: { Cushin: '#6E6A78' } },
      { model: 'stoel-2', pos: [-0.35, 0.6], rotY: PI / 2, maat: [0.46, 0.92, 0.5], kleur: { Cushin: '#6E6A78' } },
      { model: 'sofa', pos: [3.5, -0.55], rotY: -PI / 2, maat: [1.9, 0.82, 0.9], kleur: { Sofa: '#6E6A78', Legs: '#4A4038' } },
      { model: 'kast-laag', pos: [0.9, -2.7], maat: [1.4, 0.85, 0.55] },
      { model: 'plant-2', pos: [-0.2, -2.75], maat: [0.35, 0.85, 0.35] },
      { model: 'plant-4', pos: [-0.9, -2.5], y: 2.6, maat: [0.6, 0.8, 0.6] },
      { model: 'lamp-vloer', pos: [3.65, 0.75], maat: [0.32, 1.5, 0.32], licht: true },
      lijst(-0.2, 3.9, -2.98, 0, 0.6, 0.45, '#9E9AAE'),
      lijst(3.97, 1.5, -0.55, -PI / 2, 0.9, 0.5, '#B8A48A'),
    ],
  },
};
