// 160x144 indexed framebuffer, blitted to a scaled canvas.
import { SCREEN_W, SCREEN_H, PALETTE } from './constants.js';
import { glyph, FONT_W, FONT_H } from './font.js';

const fb = new Int8Array(SCREEN_W * SCREEN_H); // palette indices 0..3

let displayCanvas, displayCtx, backCanvas, backCtx, imageData, px32;
const PAL32 = new Uint32Array(4);

export function initRenderer(canvas) {
  displayCanvas = canvas;
  displayCtx = canvas.getContext('2d');
  displayCtx.imageSmoothingEnabled = false;
  backCanvas = document.createElement('canvas');
  backCanvas.width = SCREEN_W; backCanvas.height = SCREEN_H;
  backCtx = backCanvas.getContext('2d');
  imageData = backCtx.createImageData(SCREEN_W, SCREEN_H);
  px32 = new Uint32Array(imageData.data.buffer);
  for (let i = 0; i < 4; i++) {
    const hex = PALETTE[i];
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    PAL32[i] = (0xff << 24) | (b << 16) | (g << 8) | r; // little-endian ABGR
  }
  resize();
  window.addEventListener('resize', resize);
}

function resize() {
  const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / SCREEN_W, window.innerHeight / SCREEN_H)));
  displayCanvas.width = SCREEN_W * scale;
  displayCanvas.height = SCREEN_H * scale;
  displayCtx.imageSmoothingEnabled = false;
}

export function clear(idx = 0) { fb.fill(idx); }

export function pixel(x, y, idx) {
  if (x < 0 || y < 0 || x >= SCREEN_W || y >= SCREEN_H) return;
  fb[y * SCREEN_W + x] = idx;
}

export function fillRect(x, y, w, h, idx) {
  const x0 = Math.max(0, x | 0), y0 = Math.max(0, y | 0);
  const x1 = Math.min(SCREEN_W, (x + w) | 0), y1 = Math.min(SCREEN_H, (y + h) | 0);
  for (let yy = y0; yy < y1; yy++) fb.fill(idx, yy * SCREEN_W + x0, yy * SCREEN_W + x1);
}

export function rectOutline(x, y, w, h, idx) {
  fillRect(x, y, w, 1, idx); fillRect(x, y + h - 1, w, 1, idx);
  fillRect(x, y, 1, h, idx); fillRect(x + w - 1, y, 1, h, idx);
}

// Blit an Int8Array sprite ({w,h,data}, -1 = transparent). flip = horizontal mirror.
export function blit(spr, x, y, flip = false) {
  x |= 0; y |= 0;
  const { w, h, data } = spr;
  for (let sy = 0; sy < h; sy++) {
    const dy = y + sy;
    if (dy < 0 || dy >= SCREEN_H) continue;
    const row = sy * w;
    for (let sx = 0; sx < w; sx++) {
      const v = data[row + (flip ? w - 1 - sx : sx)];
      if (v < 0) continue;
      const dx = x + sx;
      if (dx < 0 || dx >= SCREEN_W) continue;
      fb[dy * SCREEN_W + dx] = v;
    }
  }
}

export function text(str, x, y, idx = 3) {
  let cx = x;
  for (const ch of String(str)) {
    if (ch === '\n') { y += FONT_H + 2; cx = x; continue; }
    const g = glyph(ch);
    for (let gy = 0; gy < FONT_H; gy++)
      for (let gx = 0; gx < FONT_W; gx++)
        if (g[gy * 4 + gx] > 0) pixel(cx + gx, y + gy, idx);
    cx += FONT_W;
  }
}

export function textCenter(str, y, idx = 3) {
  text(str, Math.floor((SCREEN_W - str.length * FONT_W) / 2), y, idx);
}

export function present() {
  for (let i = 0; i < fb.length; i++) px32[i] = PAL32[fb[i]];
  backCtx.putImageData(imageData, 0, 0);
  displayCtx.drawImage(backCanvas, 0, 0, displayCanvas.width, displayCanvas.height);
}

// Dithered darkening overlay (for pause / transitions)
export function dim() {
  for (let y = 0; y < SCREEN_H; y++)
    for (let x = (y & 1); x < SCREEN_W; x += 2)
      fb[y * SCREEN_W + x] = 3;
}
