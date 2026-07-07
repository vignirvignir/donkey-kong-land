// Global constants: display, palette, physics, input mapping.

export const SCREEN_W = 160;
export const SCREEN_H = 144;
export const TILE = 16;
export const FPS = 60;

// Classic DMG green ramp, index 0 = lightest, 3 = darkest.
export const PALETTE = ['#9bbc0f', '#8bac0f', '#306230', '#0f380f'];

// Physics (px/frame at 60 Hz, 16 px tiles)
export const PHYS = {
  gravity: 0.26,
  gravityHold: 0.15,     // while rising and A held
  gravityRelease: 0.5,   // rising, A released (caps the jump)
  maxFall: 4.2,
  jumpVel: -4.6,
  bounceVel: -3.4,
  bounceVelHold: -5.4,
  walkBruno: 1.3,
  walkPip: 1.45,
  accel: 0.18,
  friction: 0.22,
  rollSpeed: 2.5,
  rollFrames: 26,
  rollCooldown: 8,
  climbSpeed: 1.0,
  swimGravity: 0.045,
  swimMaxSink: 0.8,
  swimStroke: -1.6,
  swimDrift: 1.1,
  swimMaxRise: 1.8,
  tireBounce: -6.4,
  hurtInvuln: 90,
  coyoteFrames: 5,
};

export const HERO = {
  BRUNO: 0, // big gorilla: slower, defeats armored enemies
  PIP: 1,   // small monkey: faster
};

export const BTN = { LEFT: 'LEFT', RIGHT: 'RIGHT', UP: 'UP', DOWN: 'DOWN', A: 'A', B: 'B', START: 'START', SELECT: 'SELECT' };

export const KEYMAP = {
  ArrowLeft: BTN.LEFT, ArrowRight: BTN.RIGHT, ArrowUp: BTN.UP, ArrowDown: BTN.DOWN,
  KeyA: BTN.LEFT, KeyD: BTN.RIGHT, KeyW: BTN.UP, KeyS: BTN.DOWN,
  KeyX: BTN.A, KeyK: BTN.A, Space: BTN.A,
  KeyZ: BTN.B, KeyJ: BTN.B,
  Enter: BTN.START, ShiftLeft: BTN.SELECT, ShiftRight: BTN.SELECT,
};

// Tile physics classes
export const T = {
  EMPTY: 0, SOLID: 1, PLATFORM: 2, ROPE: 3, SPIKE: 4, WATER: 5, CRACKED: 6,
};

export const START_LIVES = 5;
export const BANANAS_PER_LIFE = 100;
