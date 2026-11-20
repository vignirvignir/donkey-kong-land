// Compact 4x5 pixel font (uppercase, digits, punctuation).
// Each glyph: 5 rows of 4 chars, 'X' = pixel on.

const G = {
  A: ['.XX.', 'X..X', 'XXXX', 'X..X', 'X..X'],
  B: ['XXX.', 'X..X', 'XXX.', 'X..X', 'XXX.'],
  C: ['.XXX', 'X...', 'X...', 'X...', '.XXX'],
  D: ['XXX.', 'X..X', 'X..X', 'X..X', 'XXX.'],
  E: ['XXXX', 'X...', 'XXX.', 'X...', 'XXXX'],
  F: ['XXXX', 'X...', 'XXX.', 'X...', 'X...'],
  G: ['.XXX', 'X...', 'X.XX', 'X..X', '.XX.'],
  H: ['X..X', 'X..X', 'XXXX', 'X..X', 'X..X'],
  I: ['XXX.', '.X..', '.X..', '.X..', 'XXX.'],
  J: ['..XX', '...X', '...X', 'X..X', '.XX.'],
  K: ['X..X', 'X.X.', 'XX..', 'X.X.', 'X..X'],
  L: ['X...', 'X...', 'X...', 'X...', 'XXXX'],
  M: ['X..X', 'XXXX', 'XXXX', 'X..X', 'X..X'],
  N: ['X..X', 'XX.X', 'X.XX', 'X..X', 'X..X'],
  O: ['.XX.', 'X..X', 'X..X', 'X..X', '.XX.'],
  P: ['XXX.', 'X..X', 'XXX.', 'X...', 'X...'],
  Q: ['.XX.', 'X..X', 'X..X', 'X.X.', '.X.X'],
  R: ['XXX.', 'X..X', 'XXX.', 'X.X.', 'X..X'],
  S: ['.XXX', 'X...', '.XX.', '...X', 'XXX.'],
  T: ['XXX.', '.X..', '.X..', '.X..', '.X..'],
  U: ['X..X', 'X..X', 'X..X', 'X..X', '.XX.'],
  V: ['X..X', 'X..X', 'X..X', '.XX.', '.XX.'],
  W: ['X..X', 'X..X', 'XXXX', 'XXXX', 'X..X'],
  X: ['X..X', 'X..X', '.XX.', 'X..X', 'X..X'],
  Y: ['X.X.', 'X.X.', '.X..', '.X..', '.X..'],
  Z: ['XXXX', '..X.', '.X..', 'X...', 'XXXX'],
  '0': ['.XX.', 'X..X', 'X..X', 'X..X', '.XX.'],
  '1': ['.X..', 'XX..', '.X..', '.X..', 'XXX.'],
  '2': ['XXX.', '...X', '.XX.', 'X...', 'XXXX'],
  '3': ['XXX.', '...X', '.XX.', '...X', 'XXX.'],
  '4': ['X..X', 'X..X', 'XXXX', '...X', '...X'],
  '5': ['XXXX', 'X...', 'XXX.', '...X', 'XXX.'],
  '6': ['.XX.', 'X...', 'XXX.', 'X..X', '.XX.'],
  '7': ['XXXX', '...X', '..X.', '.X..', '.X..'],
  '8': ['.XX.', 'X..X', '.XX.', 'X..X', '.XX.'],
  '9': ['.XX.', 'X..X', '.XXX', '...X', '.XX.'],
  '!': ['.X..', '.X..', '.X..', '....', '.X..'],
  '?': ['XXX.', '...X', '.XX.', '....', '.X..'],
  '.': ['....', '....', '....', '....', '.X..'],
  ',': ['....', '....', '....', '.X..', 'X...'],
  ':': ['....', '.X..', '....', '.X..', '....'],
  "'": ['.X..', '.X..', '....', '....', '....'],
  '-': ['....', '....', 'XXX.', '....', '....'],
  '+': ['....', '.X..', 'XXX.', '.X..', '....'],
  '/': ['...X', '..X.', '.X..', 'X...', 'X...'],
  '*': ['X.X.', '.X..', 'X.X.', '....', '....'],
  '>': ['X...', '.X..', '..X.', '.X..', 'X...'],
  '<': ['..X.', '.X..', 'X...', '.X..', '..X.'],
  '&': ['.X..', 'X.X.', '.X..', 'X.X.', '.X.X'], // used as tiny heart-ish mark
  ' ': ['....', '....', '....', '....', '....'],
};

export const FONT_H = 5;
export const FONT_W = 4; // advance (glyphs are 4 wide incl. spacing col)

const cache = {};
export function glyph(ch) {
  const up = ch.toUpperCase();
  const src = G[up] || G['?'];
  if (cache[up]) return cache[up];
  const data = new Int8Array(4 * 5).fill(-1);
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 4; x++)
      if (src[y][x] === 'X') data[y * 4 + x] = 1; // shade set at draw time
  cache[up] = data;
  return data;
}
