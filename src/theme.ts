/** Zig Grow-huisstijl. Alleen deze merkkleuren; oranje uitsluitend als accent. */
export const THEME = {
  blue: '#1F5AFF',
  orange: '#FF9000',
  navy: '#152330',
  white: '#FFFFFF',
  grey: '#595959',
  tint: '#EAF0FF',
  line: '#D6E0FF',
} as const;

export const FONT = {
  family: "'Poppins', system-ui, sans-serif",
  regular: 400,
  semibold: 600,
  bold: 700,
} as const;

/** Gedempte wereldkleuren (geen merkkleuren), zodat blauw en oranje opvallen. */
export const WORLD = {
  sky: '#CFDDF7',
  fog: '#DCE6F8',
  grass: '#8FA67A',
  grassDark: '#7E9669',
  asphalt: '#5E6166',
  roadLine: '#E4E4DF',
  sidewalk: '#B9B4AA',
  kerb: '#9C978E',
  path: '#C7B9A4',
  bricks: ['#9C6B5A', '#A7775F', '#8F6455', '#A88470', '#94705E', '#9F7A66', '#8C6A5C'],
  roof: '#4A4E55',
  roofEdge: '#3D4046',
  frame: '#F1EFEA',
  doorway: '#2B2F35',
  floor: '#B89A7A',
  wall: '#EFEBE4',
  wallAccent: '#DCD6CC',
  counter: '#D9D6D0',
  cabinet: '#8A9A8C',
  wood: '#9A7B5F',
  fabric: '#7F8A99',
  water: '#9CC3E0',
  glass: '#A9BBD0',
  doors: ['#3F6157', '#6E3B3B', '#59633C', '#4C4F63', '#7A6A45', '#5A4A5E', '#3E5A6B'],
  hedge: '#5F7F4E',
  trunk: '#6B5443',
  leaves: ['#6F8F5A', '#7C9A62', '#668752', '#86A06B'],
  metal: '#7D838A',
  office: '#E9E7E2',
  officeDark: '#C9CDD3',
  skin: ['#E0B394', '#C68B65', '#8D5A3E'],
  hairGrey: '#A7A7A3',
  trousers: '#2E3A48',
  shoes: '#2A2A2A',
} as const;

/** Schrijft de merkkleuren als CSS-variabelen op :root (zelfde bron als de CSS). */
export function applyCssVariables(root: HTMLElement = document.documentElement): void {
  for (const [k, v] of Object.entries(THEME)) root.style.setProperty(`--${k}`, v);
}
