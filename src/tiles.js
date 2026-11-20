// Procedural 16x16 theme tilesets rendered into Int8Array grids at boot.
import { T, TILE } from './constants.js';

// Deterministic PRNG so tiles look identical every boot (and in tests).
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function grid() { return new Int8Array(TILE * TILE).fill(-1); }
function px(g, x, y, v) { if (x >= 0 && y >= 0 && x < TILE && y < TILE) g[y * TILE + x] = v; }
function fill(g, v) { g.fill(v); return g; }

function speckle(g, rng, count, shade) {
  for (let i = 0; i < count; i++) px(g, (rng() * TILE) | 0, (rng() * TILE) | 0, shade);
}

// theme texture params: [bodyShade, speckleShade, topStyle]
const THEME_STYLE = {
  jungle:   { body: 2, spk: 3, top: 'grass' },
  snow:     { body: 1, spk: 0, top: 'snow' },
  ship:     { body: 2, spk: 3, top: 'plank' },
  temple:   { body: 2, spk: 3, top: 'brick' },
  reef:     { body: 2, spk: 1, top: 'coral' },
  mountain: { body: 2, spk: 3, top: 'rock' },
  sky:      { body: 1, spk: 0, top: 'cloud' },
  city:     { body: 2, spk: 3, top: 'steel' },
};

function makeSolidTop(style, rng) {
  const g = grid();
  fill(g, style.body);
  speckle(g, rng, 14, style.spk);
  switch (style.top) {
    case 'grass':
      for (let x = 0; x < TILE; x++) {
        px(g, x, 0, 1); px(g, x, 1, 1);
        if (rng() < 0.5) px(g, x, 0, 0);
        if (rng() < 0.3) px(g, x, 2, 1);
      }
      break;
    case 'snow':
      for (let x = 0; x < TILE; x++) { px(g, x, 0, 0); px(g, x, 1, 0); px(g, x, 2, 1); }
      break;
    case 'plank':
      for (let x = 0; x < TILE; x++) { px(g, x, 0, 3); px(g, x, 1, 1); }
      for (let y = 0; y < TILE; y += 4) for (let x = 0; x < TILE; x++) px(g, x, y, 3);
      px(g, 4, 6, 3); px(g, 12, 10, 3); px(g, 8, 14, 3);
      break;
    case 'brick':
      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
        if (y % 8 === 0) px(g, x, y, 3);
        else if ((x + (y & 8 ? 8 : 0)) % 16 === 0) px(g, x, y, 3);
      }
      for (let x = 0; x < TILE; x++) px(g, x, 0, 1);
      break;
    case 'coral':
      for (let x = 0; x < TILE; x++) { px(g, x, 0, 1); if (x % 3 === 0) px(g, x, 1, 1); }
      speckle(g, rng, 8, 0);
      break;
    case 'rock':
      for (let x = 0; x < TILE; x++) px(g, x, 0, 3);
      px(g, 3, 4, 3); px(g, 4, 4, 3); px(g, 5, 5, 3); px(g, 11, 8, 3); px(g, 12, 8, 3); px(g, 10, 12, 3);
      break;
    case 'cloud':
      fill(g, 0);
      for (let x = 0; x < TILE; x++) { px(g, x, 0, 1); px(g, x, TILE - 1, 1); }
      speckle(g, rng, 6, 1);
      break;
    case 'steel':
      for (let x = 0; x < TILE; x++) { px(g, x, 0, 3); px(g, x, 1, 1); }
      for (let y = 4; y < TILE; y += 6) for (let x = 0; x < TILE; x += 4) px(g, x, y, 3); // rivets
      break;
  }
  return g;
}

function makeSolidFill(style, rng) {
  const g = grid();
  fill(g, style.body);
  speckle(g, rng, 10, style.spk);
  if (style.top === 'brick' || style.top === 'steel') {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
      if (y % 8 === 0) px(g, x, y, 3);
      else if ((x + (y & 8 ? 8 : 0)) % 16 === 0) px(g, x, y, 3);
    }
  }
  return g;
}

function makePlatform(style) {
  const g = grid();
  for (let y = 0; y < 5; y++) for (let x = 0; x < TILE; x++) {
    px(g, x, y, y === 0 ? 3 : (y === 1 ? 1 : 2));
  }
  for (let x = 0; x < TILE; x += 5) px(g, x, 2, 3);
  return g;
}

function makeRope() {
  const g = grid();
  for (let y = 0; y < TILE; y++) {
    px(g, 7, y, 3); px(g, 8, y, 2);
    if (y % 4 === 0) { px(g, 6, y, 3); px(g, 9, y, 3); }
  }
  return g;
}

function makeSpikes() {
  const g = grid();
  for (let s = 0; s < TILE; s += 8) {
    for (let y = 0; y < 8; y++) for (let x = 0; x <= y; x++) {
      px(g, s + 3 + Math.floor(x / 2) + (y - x), 8 + y, x === 0 ? 3 : 2);
    }
  }
  // simpler: overwrite with clean triangles
  g.fill(-1);
  for (let s = 0; s < 2; s++) {
    const cx = s * 8 + 4;
    for (let y = 0; y < 10; y++) {
      const half = Math.floor(y * 0.4);
      for (let x = cx - half; x <= cx + half; x++) px(g, x, 6 + y, x === cx - half || x === cx + half ? 3 : 2);
    }
  }
  return g;
}

function makeWaterSurface(rng) {
  const g = grid();
  for (let x = 0; x < TILE; x++) {
    px(g, x, 0, (x % 4 < 2) ? 1 : 0);
    px(g, x, 1, 1);
    if (rng() < 0.15) px(g, x, 3 + ((rng() * 4) | 0), 1);
  }
  return g;
}

function makeWaterBody(rng) {
  const g = grid();
  speckle(g, rng, 3, 1);
  return g;
}

function makeCracked(style, rng) {
  const g = makeSolidFill(style, rng);
  // crack lines
  const pts = [[8, 0], [7, 3], [9, 6], [6, 9], [8, 12], [7, 15]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    for (let t = 0; t <= 4; t++) px(g, Math.round(x0 + (x1 - x0) * t / 4), Math.round(y0 + (y1 - y0) * t / 4), 0);
  }
  px(g, 5, 5, 0); px(g, 11, 8, 0); px(g, 10, 4, 0);
  return g;
}

// Physical class per map char (uniform across themes).
export const CHAR_PHYS = {
  '#': T.SOLID, '=': T.PLATFORM, '|': T.ROPE, '^': T.SPIKE,
  '~': T.WATER, 'w': T.WATER, '?': T.CRACKED,
};

const themes = {};
export function buildTiles() {
  const rng = makeRng(20260706);
  for (const [name, style] of Object.entries(THEME_STYLE)) {
    themes[name] = {
      solidTop: { w: TILE, h: TILE, data: makeSolidTop(style, rng) },
      solidFill: { w: TILE, h: TILE, data: makeSolidFill(style, rng) },
      platform: { w: TILE, h: TILE, data: makePlatform(style) },
      rope: { w: TILE, h: TILE, data: makeRope() },
      spikes: { w: TILE, h: TILE, data: makeSpikes() },
      waterSurf: { w: TILE, h: TILE, data: makeWaterSurface(rng) },
      waterBody: { w: TILE, h: TILE, data: makeWaterBody(rng) },
      cracked: { w: TILE, h: TILE, data: makeCracked(style, rng) },
    };
  }
  return themes;
}

export function tileSprite(theme, ch, isTop) {
  const t = themes[theme] || themes.jungle;
  switch (ch) {
    case '#': return isTop ? t.solidTop : t.solidFill;
    case '=': return t.platform;
    case '|': return t.rope;
    case '^': return t.spikes;
    case '~': return t.waterSurf;
    case 'w': return t.waterBody;
    case '?': return t.cracked;
    default: return null;
  }
}
