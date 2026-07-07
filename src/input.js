// Keyboard input with edge detection + programmatic injection for tests.
import { KEYMAP } from './constants.js';

const down = new Set();
const prev = new Set();
let attached = false;

export function attachInput() {
  if (attached) return;
  attached = true;
  window.addEventListener('keydown', (e) => {
    const b = KEYMAP[e.code];
    if (b) { down.add(b); e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => {
    const b = KEYMAP[e.code];
    if (b) { down.delete(b); e.preventDefault(); }
  });
}

// Called once per simulated frame, after update logic reads input.
export function latchInput() {
  prev.clear();
  for (const b of down) prev.add(b);
}

export const input = {
  held: (b) => down.has(b),
  pressed: (b) => down.has(b) && !prev.has(b),
  released: (b) => !down.has(b) && prev.has(b),
  // test API
  hold: (b) => down.add(b),
  release: (b) => down.delete(b),
  clearAll: () => { down.clear(); prev.clear(); },
};
