// Enemy + hazard + moving-platform entities. All original designs.
import { TILE, T } from './constants.js';
import { SPR } from './sprites.js';
import { blit } from './renderer.js';
import { sfx } from './audio.js';

// ---------- shared helpers ----------
function entGravity(e, lv) {
  e.vy += 0.26;
  if (e.vy > 4) e.vy = 4;
  e.y += e.vy;
  const feet = e.y + e.h;
  if (e.vy >= 0 && (lv.solidAtPx(e.x + 1, feet) || lv.solidAtPx(e.x + e.w - 1, feet))) {
    e.y = Math.floor(feet / TILE) * TILE - e.h;
    e.vy = 0;
    e.grounded = true;
  } else e.grounded = false;
}

function walkPatrol(e, lv, speed) {
  e.x += e.dir * speed;
  const front = e.dir > 0 ? e.x + e.w + 1 : e.x - 1;
  const wall = lv.solidAtPx(front, e.y + e.h - 4);
  const ledge = e.grounded && !lv.solidAtPx(front, e.y + e.h + 4) &&
    lv.tilePhysAt(front, e.y + e.h + 4) !== T.PLATFORM;
  if (wall || ledge || e.x <= 0 || e.x + e.w >= lv.pxWidth) e.dir *= -1;
}

function anim2(a, b, t, n = 10) { return Math.floor(t / n) % 2 ? SPR[b] : SPR[a]; }

function drawEnt(e, cam, spr) {
  blit(spr, Math.round(e.x + e.w / 2 - spr.w / 2 - cam.x), Math.round(e.y + e.h - spr.h - cam.y), e.dir > 0);
}

function base(type, x, y, w, h, extra = {}) {
  return {
    kind: 'enemy', type, x: x + (TILE - w) / 2, y: y + TILE - h, w, h,
    vx: 0, vy: 0, dir: -1, t: 0, alive: true, grounded: false,
    stompable: true, rollable: true, armored: false, deadly: false, barrelKills: true,
    ...extra,
  };
}

// ---------- enemy types ----------
export const ENEMY_FACTORIES = {
  // Snapper: basic walking croc grunt
  K: (x, y) => ({
    ...base('snapper', x, y, 13, 14),
    update(lv) { this.t++; entGravity(this, lv); walkPatrol(this, lv, 0.42); },
    draw(lv, cam) { drawEnt(this, cam, anim2('snapper1', 'snapper2', this.t)); },
  }),

  // Bruiser: armored — only Bruno can defeat it directly
  U: (x, y) => ({
    ...base('bruiser', x, y, 14, 16, { armored: true }),
    update(lv) { this.t++; entGravity(this, lv); walkPatrol(this, lv, 0.3); },
    draw(lv, cam) { drawEnt(this, cam, anim2('bruiser1', 'bruiser2', this.t, 12)); },
  }),

  // Chomper: fast little walker
  G: (x, y) => ({
    ...base('chomper', x, y, 12, 10),
    update(lv) { this.t++; entGravity(this, lv); walkPatrol(this, lv, 0.85); },
    draw(lv, cam) { drawEnt(this, cam, anim2('chomper1', 'chomper2', this.t, 6)); },
  }),

  // Rollo: charges in a rolling ball when it spots the hero
  W: (x, y) => ({
    ...base('rollo', x, y, 14, 10, { charging: false }),
    update(lv) {
      this.t++;
      entGravity(this, lv);
      const p = lv.player;
      if (!this.charging && Math.abs(p.cy - (this.y + this.h / 2)) < 24 &&
          Math.abs(p.cx - (this.x + this.w / 2)) < 70) {
        this.charging = true;
        this.dir = p.cx < this.x ? -1 : 1;
      }
      if (this.charging) {
        this.x += this.dir * 1.7;
        const front = this.dir > 0 ? this.x + this.w + 1 : this.x - 1;
        if (lv.solidAtPx(front, this.y + this.h - 4) || this.x <= 0 || this.x + this.w >= lv.pxWidth) {
          this.charging = false; this.dir *= -1;
        }
        if (this.grounded && !lv.solidAtPx(front, this.y + this.h + 4)) this.charging = false;
      } else walkPatrol(this, lv, 0.3);
    },
    draw(lv, cam) {
      drawEnt(this, cam, this.charging ? (this.t & 4 ? SPR.rollo_ball : SPR.rollo_ball) : anim2('rollo1', 'rollo1', this.t));
    },
  }),

  // Sly: low snake
  Q: (x, y) => ({
    ...base('sly', x, y, 15, 8),
    update(lv) { this.t++; entGravity(this, lv); walkPatrol(this, lv, 0.55); },
    draw(lv, cam) { drawEnt(this, cam, anim2('sly1', 'sly2', this.t, 8)); },
  }),

  // Stinger: wasp — untouchable, barrels/Rocky only. Vertical sine by default,
  // horizontal sine if placed with a solid tile directly below.
  Z: (x, y, lv) => ({
    ...base('stinger', x, y, 13, 13, {
      stompable: false, rollable: false, deadly: true,
      ox: x + 1.5, oy: y + 3,
      horiz: lv.solidAtPx(x + 8, y + TILE + 8),
    }),
    update() {
      this.t++;
      const s = Math.sin(this.t / 30) * 24;
      if (this.horiz) { this.x = this.ox + s; this.dir = Math.cos(this.t / 30) > 0 ? 1 : -1; }
      else this.y = this.oy + s;
    },
    draw(lv, cam) { drawEnt(this, cam, anim2('stinger1', 'stinger2', this.t, 4)); },
  }),

  // Beaky: vulture gliding a long horizontal path with a bob
  V: (x, y) => ({
    ...base('beaky', x, y, 16, 10, { rollable: false, ox: x, oy: y + 6, range: 70 }),
    update(lv) {
      this.t++;
      this.x += this.dir * 0.7;
      this.y = this.oy + Math.sin(this.t / 20) * 6;
      if (this.x < this.ox - this.range || this.x > this.ox + this.range) this.dir *= -1;
    },
    draw(lv, cam) { drawEnt(this, cam, anim2('beaky1', 'beaky2', this.t, 8)); },
  }),

  // Beaky Jr: waits, then dives at the hero in an arc
  v: (x, y) => ({
    ...base('beakyjr', x, y, 10, 9, { rollable: false, mode: 'wait', oy: y + 7 }),
    update(lv) {
      this.t++;
      const p = lv.player;
      if (this.mode === 'wait') {
        this.y = this.oy + Math.sin(this.t / 15) * 2;
        if (Math.abs(p.cx - this.x) < 70 && p.cy > this.y) {
          this.mode = 'dive';
          this.vx = (p.cx < this.x ? -1 : 1) * 1.3;
          this.vy = 0.4;
          this.dir = Math.sign(this.vx);
        }
      } else {
        this.vy += 0.05;
        this.x += this.vx; this.y += this.vy;
        if (this.y > this.oy + 90 || lv.solidAtPx(this.x + 5, this.y + this.h)) {
          this.mode = 'rise'; this.vy = -0.8;
        }
        if (this.mode === 'rise' && this.y <= this.oy) { this.mode = 'wait'; this.t = 0; }
      }
    },
    draw(lv, cam) { drawEnt(this, cam, SPR.beakyjr); },
  }),

  // Nibbles: bitey little croc — jump-only kill (rolling into it hurts)
  N: (x, y) => ({
    ...base('nibbles', x, y, 11, 9, { rollable: false }),
    update(lv) { this.t++; entGravity(this, lv); walkPatrol(this, lv, 0.75); },
    draw(lv, cam) { drawEnt(this, cam, SPR.nibbles); },
  }),

  // ---- water enemies: no attacks work underwater — avoid them ----
  J: (x, y) => ({
    ...base('jaws', x, y, 22, 10, { stompable: false, rollable: false, deadly: true, ox: x, range: 90 }),
    update() {
      this.t++;
      this.x += this.dir * 0.8;
      if (this.x < this.ox - this.range || this.x > this.ox + this.range) this.dir *= -1;
    },
    draw(lv, cam) { drawEnt(this, cam, SPR.jaws); },
  }),
  f: (x, y) => ({
    ...base('fang', x, y, 9, 7, { stompable: false, rollable: false, deadly: true, mode: 'idle', ox: x, oy: y + 4 }),
    update(lv) {
      this.t++;
      const p = lv.player;
      if (this.mode === 'idle') {
        this.y = this.oy + Math.sin(this.t / 18) * 3;
        if (Math.abs(p.cy - this.y) < 14 && Math.abs(p.cx - this.x) < 90) {
          this.mode = 'dash';
          this.dir = p.cx < this.x ? -1 : 1;
        }
      } else {
        this.x += this.dir * 1.8;
        if (this.x < this.ox - 130 || this.x > this.ox + 130 ||
            lv.solidAtPx(this.dir > 0 ? this.x + this.w + 1 : this.x - 1, this.y + 3)) {
          this.mode = 'idle'; this.ox = this.x;
        }
      }
    },
    draw(lv, cam) { drawEnt(this, cam, SPR.fang); },
  }),
  g: (x, y) => ({
    ...base('glub', x, y, 9, 7, { stompable: false, rollable: false, deadly: true, ox: x, oy: y }),
    update() {
      this.t++;
      this.x = this.ox + Math.sin(this.t / 40) * 40;
      this.y = this.oy + Math.sin(this.t / 17) * 8;
      this.dir = Math.cos(this.t / 40) > 0 ? 1 : -1;
    },
    draw(lv, cam) { drawEnt(this, cam, SPR.glub); },
  }),
  y: (x, y) => ({
    ...base('inky', x, y, 11, 13, { stompable: false, rollable: false, deadly: true, oy: y }),
    update() { this.t++; this.y = this.oy + Math.sin(this.t / 25) * 28; },
    draw(lv, cam) { drawEnt(this, cam, SPR.inky); },
  }),
  F: (x, y) => ({
    ...base('finley', x, y, 15, 8, { stompable: false, rollable: false, deadly: true, ox: x, range: 60 }),
    update() {
      this.t++;
      this.x += this.dir * 0.55;
      this.y += Math.sin(this.t / 22) * 0.4;
      if (this.x < this.ox - this.range || this.x > this.ox + this.range) this.dir *= -1;
    },
    draw(lv, cam) { drawEnt(this, cam, SPR.finley); },
  }),

  // Clampy: fixed clam spitting pearls
  p: (x, y) => ({
    ...base('clampy', x, y, 15, 10, { stompable: false, rollable: false, deadly: true, cycle: 0 }),
    update(lv) {
      this.t++;
      this.cycle = this.t % 160;
      if (this.cycle === 80) {
        const p = lv.player;
        const d = p.cx < this.x ? -1 : 1;
        lv.addEntity(pearlProjectile(this.x + this.w / 2, this.y + 4, d * 1.4, 0));
      }
    },
    draw(lv, cam) {
      drawEnt(this, cam, this.cycle > 60 && this.cycle < 100 ? SPR.clampy_open : SPR.clampy_closed);
    },
  }),

  // Hamhock: swooping flying pig
  H: (x, y) => ({
    ...base('hamhock', x, y, 15, 11, { rollable: false, ox: x, oy: y, range: 80 }),
    update() {
      this.t++;
      this.x += this.dir * 0.9;
      this.y = this.oy + Math.abs(Math.sin(this.t / 35)) * 40;
      if (this.x < this.ox - this.range || this.x > this.ox + this.range) this.dir *= -1;
    },
    draw(lv, cam) { drawEnt(this, cam, anim2('hamhock1', 'hamhock2', this.t, 6)); },
  }),

  // Twister: invulnerable wandering tornado (Rocky can destroy it)
  x: (x, y) => ({
    ...base('twister', x, y, 11, 15, { stompable: false, rollable: false, deadly: true }),
    update(lv) { this.t++; entGravity(this, lv); walkPatrol(this, lv, 0.65); },
    draw(lv, cam) { drawEnt(this, cam, anim2('twister1', 'twister2', this.t, 4)); },
  }),

  // Mole: pops out of the ground, tosses a rock, ducks back
  m: (x, y) => ({
    ...base('mole', x, y, 13, 13, { rollable: false, homeY: y + TILE - 13 }),
    update(lv) {
      this.t++;
      const c = this.t % 200;
      if (c < 90) { this.y = this.homeY + 13; this.stompable = false; } // hidden
      else {
        this.y = this.homeY;
        this.stompable = true;
        if (c === 120) {
          const d = lv.player.cx < this.x ? -1 : 1;
          lv.addEntity(rockProjectile(this.x + 6, this.y, d * 1.1, -2.6));
        }
      }
    },
    draw(lv, cam) {
      const c = this.t % 200;
      if (c < 90) return;
      drawEnt(this, cam, SPR.mole1);
    },
  }),
};

// ---------- projectiles ----------
export function pearlProjectile(x, y, vx, vy) {
  return {
    kind: 'enemy', type: 'pearl', x, y, w: 5, h: 4, vx, vy, t: 0, alive: true, dir: 1,
    stompable: false, rollable: false, deadly: true, barrelKills: false, projectile: true,
    update(lv) {
      this.t++;
      this.x += this.vx; this.y += this.vy;
      if (this.t > 240 || lv.solidAtPx(this.x + 2, this.y + 2)) this.alive = false;
    },
    draw(lv, cam) { blit(SPR.pearl, Math.round(this.x - cam.x), Math.round(this.y - cam.y)); },
  };
}

export function rockProjectile(x, y, vx, vy) {
  return {
    kind: 'enemy', type: 'rock', x, y, w: 6, h: 6, vx, vy, t: 0, alive: true, dir: 1,
    stompable: false, rollable: false, deadly: true, barrelKills: false, projectile: true,
    update(lv) {
      this.t++;
      this.vy += 0.12;
      this.x += this.vx; this.y += this.vy;
      if (this.t > 300 || this.y > lv.pxHeight + 20) this.alive = false;
      if (this.vy > 0 && lv.solidAtPx(this.x + 3, this.y + this.h)) this.alive = false;
    },
    draw(lv, cam) { blit(SPR.rock, Math.round(this.x - cam.x), Math.round(this.y - cam.y)); },
  };
}

export function dropProjectile(x, y, sprName) {
  return {
    kind: 'enemy', type: 'drop', x, y, w: 10, h: 10, vx: 0, vy: 0, t: 0, alive: true, dir: 1,
    stompable: false, rollable: false, deadly: true, barrelKills: false, projectile: true,
    update(lv) {
      this.t++;
      this.vy = Math.min(this.vy + 0.2, 3.5);
      this.y += this.vy;
      if (this.y > lv.pxHeight + 20 || lv.solidAtPx(this.x + 5, this.y + this.h)) this.alive = false;
    },
    draw(lv, cam) { blit(SPR[sprName], Math.round(this.x - cam.x), Math.round(this.y - cam.y)); },
  };
}

// ---------- hazards & mechanisms ----------
export const HAZARD_FACTORIES = {
  // static mincer
  '*': (x, y) => ({
    kind: 'enemy', type: 'mincer', x: x + 1, y: y + 2, w: 14, h: 12, t: 0, alive: true, dir: 1, vx: 0, vy: 0,
    stompable: false, rollable: false, deadly: true, barrelKills: false,
    update() { this.t++; },
    draw(lv, cam) { drawEnt(this, cam, anim2('mincer1', 'mincer2', this.t, 5)); },
  }),
  // patrolling mincer (vertical bob)
  '&': (x, y) => ({
    kind: 'enemy', type: 'mincer', x: x + 1, y: y + 2, w: 14, h: 12, t: 0, alive: true, dir: 1, vx: 0, vy: 0,
    stompable: false, rollable: false, deadly: true, barrelKills: false, oy: y + 2,
    update() { this.t++; this.y = this.oy + Math.sin(this.t / 40) * 32; },
    draw(lv, cam) { drawEnt(this, cam, anim2('mincer1', 'mincer2', this.t, 5)); },
  }),
  // oil drum with periodic flame
  u: (x, y) => ({
    kind: 'enemy', type: 'oildrum', x: x + 1, y: y + TILE - 16, w: 14, h: 16, t: 0, alive: true, dir: 1, vx: 0, vy: 0,
    stompable: false, rollable: false, deadly: false, barrelKills: false, solidTop: true,
    update() { this.t++; this.deadly = false; },
    flameOn() { return (this.t % 180) < 90; },
    hazardBox() { return this.flameOn() ? { x: this.x + 2, y: this.y - 10, w: 10, h: 10 } : null; },
    draw(lv, cam) {
      drawEnt(this, cam, SPR.oildrum);
      if (this.flameOn()) {
        const f = anim2('flame1', 'flame2', this.t, 6);
        blit(f, Math.round(this.x + 2 - cam.x), Math.round(this.y - 9 - cam.y));
      }
    },
  }),
  // snake basket: spawns Slys
  k: (x, y) => ({
    kind: 'enemy', type: 'basket', x: x + 2, y: y + TILE - 9, w: 12, h: 9, t: 0, alive: true, dir: 1, vx: 0, vy: 0,
    stompable: false, rollable: false, deadly: false, barrelKills: true, spawned: 0,
    update(lv) {
      this.t++;
      if (this.t % 170 === 100 && Math.abs(lv.player.cx - this.x) < 130) {
        const snakes = lv.entities.filter(e => e.alive && e.type === 'sly' && e.fromBasket === this).length;
        if (snakes < 2) {
          const s = ENEMY_FACTORIES.Q(this.x - (TILE - 15) / 2, this.y + this.h - TILE);
          s.fromBasket = this;
          s.dir = lv.player.cx < this.x ? -1 : 1;
          s.vy = -2;
          lv.addEntity(s);
        }
      }
    },
    draw(lv, cam) { drawEnt(this, cam, SPR.basket); },
  }),
  // dropper zone: falling boulders (mountain/city) or coconuts (jungle)
  d: (x, y) => ({
    kind: 'enemy', type: 'dropper', x, y, w: 16, h: 8, t: 0, alive: true, dir: 1, vx: 0, vy: 0,
    stompable: false, rollable: false, deadly: false, barrelKills: false, invisible: true,
    update(lv) {
      this.t++;
      if (this.t % 140 === 60 && Math.abs(lv.player.cx - (this.x + 8)) < 60) {
        const spr = (lv.theme === 'jungle' || lv.theme === 'snow') ? 'coconut' : 'boulder';
        lv.addEntity(dropProjectile(this.x + 3, this.y, spr));
      }
    },
    draw() { /* invisible spawner */ },
  }),
};

export const PLATFORM_FACTORIES = {
  // horizontal patrol platform
  '-': (x, y) => carrier(x, y, 1, 0, 56),
  // vertical patrol platform
  '/': (x, y) => carrier(x, y, 0, 1, 48),
  // collapsing cloud
  ':': (x, y) => ({
    kind: 'carrier', type: 'cloud', x, y: y + 4, w: 18, h: 6, t: 0, alive: true, vx: 0, vy: 0, dir: 1,
    ox: x, oy: y + 4, standT: 0, falling: false, respawnT: 0,
    update(lv) {
      this.t++;
      if (this.respawnT > 0) {
        this.respawnT--;
        if (this.respawnT === 0) { this.falling = false; this.x = this.ox; this.y = this.oy; this.vy = 0; }
        return;
      }
      if (this.falling) {
        this.vy = Math.min(this.vy + 0.15, 3);
        this.y += this.vy;
        if (this.y > lv.pxHeight + 20) { this.respawnT = 150; this.y = -100; }
        return;
      }
      const p = lv.player;
      const on = p.platform === this;
      if (on) { this.standT++; if (this.standT > 22) this.falling = true; }
      else this.standT = Math.max(0, this.standT - 1);
    },
    solid() { return !this.falling && this.respawnT === 0; },
    draw(lv, cam) {
      if (this.respawnT > 0) return;
      const sh = this.standT > 10 ? Math.sin(this.t) * 1.2 : 0;
      blit(SPR.cloud, Math.round(this.x - cam.x + sh), Math.round(this.y - 2 - cam.y));
    },
  }),
};

function carrier(x, y, dx, dy, range) {
  return {
    kind: 'carrier', type: 'platform', x, y: y + 4, w: 24, h: 6, t: 0, alive: true, vx: 0, vy: 0, dir: 1,
    ox: x, oy: y + 4, dxu: dx, dyu: dy, range,
    update() {
      this.t++;
      const s = Math.sin(this.t / 60) * this.range;
      const nx = this.ox + this.dxu * s, ny = this.oy + this.dyu * s;
      this.vx = nx - this.x; this.vy = ny - this.y;
      this.x = nx; this.y = ny;
    },
    solid() { return true; },
    draw(lv, cam) { blit(SPR.platform, Math.round(this.x - cam.x), Math.round(this.y - cam.y)); },
  };
}

export function poof(x, y) {
  return {
    kind: 'fx', type: 'poof', x, y, w: 12, h: 12, t: 0, alive: true, vx: 0, vy: 0, dir: 1,
    update() { this.t++; if (this.t > 18) this.alive = false; },
    draw(lv, cam) {
      blit(this.t < 9 ? SPR.poof1 : SPR.poof2, Math.round(this.x - 6 - cam.x), Math.round(this.y - 6 - cam.y));
    },
  };
}
