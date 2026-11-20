// Collectibles, barrels, cannons, checkpoints, portals, tires, crates, bonus triggers.
import { TILE } from './constants.js';
import { SPR } from './sprites.js';
import { blit, fillRect, text } from './renderer.js';
import { sfx } from './audio.js';
import { poof } from './enemies.js';

function item(type, x, y, w, h, extra = {}) {
  return {
    kind: 'item', type, x: x + (TILE - w) / 2, y: y + TILE - h, w, h,
    t: 0, alive: true, vx: 0, vy: 0, dir: 1, ...extra,
  };
}

function bobDraw(e, cam, spr, amp = 1.5, sp = 20) {
  const dy = Math.sin(e.t / sp + e.x / 13) * amp;
  blit(spr, Math.round(e.x + e.w / 2 - spr.w / 2 - cam.x), Math.round(e.y + e.h - spr.h - cam.y + dy));
}

export const ITEM_FACTORIES = {
  o: (x, y) => ({
    ...item('banana', x, y, 8, 10),
    update() { this.t++; },
    onTouch(lv) { lv.collectBanana(1); this.alive = false; },
    draw(lv, cam) { bobDraw(this, cam, SPR.banana); },
  }),
  O: (x, y) => ({
    ...item('bunch', x, y, 10, 11),
    update() { this.t++; },
    onTouch(lv) { lv.collectBanana(10); this.alive = false; },
    draw(lv, cam) { bobDraw(this, cam, SPR.bunch); },
  }),
  M: (x, y) => ({
    ...item('medal', x, y, 10, 10),
    update() { this.t++; },
    onTouch(lv) { lv.collectMedal(); this.alive = false; },
    draw(lv, cam) { bobDraw(this, cam, SPR.medal, 1, 26); },
  }),
  L: (x, y) => ({
    ...item('balloon', x, y, 8, 14),
    update(lv) { this.t++; this.y -= 0.25; if (this.y < -40) this.alive = false; },
    onTouch(lv) { lv.addLife(); this.alive = false; },
    draw(lv, cam) { bobDraw(this, cam, SPR.balloon, 1, 15); },
  }),

  // A-P-E-X letters (the K-O-N-G analog); collecting all four unlocks saving
  A: letterFactory('A'), P: letterFactory('P'), E: letterFactory('E'), X: letterFactory('X'),

  // Buddy Barrel — restores the missing partner
  B: (x, y) => ({
    ...item('buddy', x, y, 12, 10),
    update() { this.t++; },
    onTouch(lv) {
      lv.player.restorePartner();
      lv.addEntity(poof(this.x + 6, this.y + 5));
      sfx.break();
      this.alive = false;
    },
    draw(lv, cam) { bobDraw(this, cam, SPR.buddy_barrel, 1, 30); },
  }),

  // Throwable wooden barrel
  b: (x, y) => throwableBarrel(x, y, false),
  // TNT barrel — bigger blast, opens cracked walls
  T: (x, y) => throwableBarrel(x, y, true),

  // Cannons: c = up, < = arc left, > = arc right, R = rotating (A to fire)
  c: (x, y) => cannonFactory(x, y, 0, -8.6, true, false),
  '<': (x, y) => cannonFactory(x, y, -3.1, -5.8, true, false),
  '>': (x, y) => cannonFactory(x, y, 3.1, -5.8, true, false),
  R: (x, y) => cannonFactory(x, y, 0, -7.2, false, true),

  // Bounce tire
  t: (x, y) => ({
    ...item('tire', x, y, 14, 8, { bounceT: 0 }),
    update() { this.t++; if (this.bounceT > 0) this.bounceT--; },
    draw(lv, cam) {
      const squash = this.bounceT > 0 ? 2 : 0;
      blit(SPR.tire, Math.round(this.x + this.w / 2 - SPR.tire.w / 2 - cam.x), Math.round(this.y + this.h - SPR.tire.h + squash - cam.y));
    },
  }),

  // Checkpoint post
  '!': (x, y) => ({
    ...item('checkpoint', x, y, 10, 24, { active: false }),
    update() { this.t++; },
    onTouch(lv) {
      if (this.active) return;
      this.active = true;
      lv.setCheckpoint(this.x, this.y);
      sfx.checkpoint();
    },
    draw(lv, cam) {
      const spr = SPR.checkpoint;
      blit(spr, Math.round(this.x - cam.x), Math.round(this.y + this.h - spr.h - cam.y), this.active);
      if (this.active) fillRect(Math.round(this.x + 1 - cam.x), Math.round(this.y - cam.y + 2), 4, 3, 0);
    },
  }),

  // End-of-stage portal
  D: (x, y) => ({
    ...item('portal', x, y, 16, 26),
    update() { this.t++; },
    onTouch(lv) { lv.clearLevel(); },
    draw(lv, cam) {
      const spr = SPR.portal;
      const pulse = Math.floor(this.t / 15) % 2;
      blit(spr, Math.round(this.x + this.w / 2 - spr.w / 2 - cam.x), Math.round(this.y + this.h - spr.h - cam.y - pulse));
    },
  }),

  // Animal crates
  '@': (x, y) => animalCrate(x, y, 'rocky', SPR.crate_rocky),
  $: (x, y) => animalCrate(x, y, 'ozzie', SPR.crate_ozzie),

  // Bonus entrances (invisible trigger; often hidden behind cracked walls)
  1: (x, y) => bonusTrigger(x, y, 0),
  2: (x, y) => bonusTrigger(x, y, 1),
  3: (x, y) => bonusTrigger(x, y, 2),
};

function letterFactory(ch) {
  return (x, y) => ({
    ...item('letter', x, y, 10, 10, { letter: ch }),
    update() { this.t++; },
    onTouch(lv) { lv.collectLetter(this.letter); this.alive = false; },
    draw(lv, cam) {
      const dy = Math.sin(this.t / 18) * 1.5;
      const dx = Math.round(this.x - cam.x), dyy = Math.round(this.y + dy - cam.y);
      blit(SPR.letter_bubble, dx, dyy);
      text(this.letter, dx + 3, dyy + 3, 3);
    },
  });
}

function throwableBarrel(x, y, isTnt) {
  return {
    ...item(isTnt ? 'tnt' : 'barrel', x, y, 12, 10, {
      held: false, thrown: false, pickup: true,
    }),
    update(lv) {
      this.t++;
      if (this.held) return;
      if (this.thrown) {
        this.vy += 0.2;
        this.x += this.vx; this.y += this.vy;
        // roll along the ground
        const feet = this.y + this.h;
        if (this.vy > 0 && (lv.solidAtPx(this.x + 2, feet) || lv.solidAtPx(this.x + this.w - 2, feet))) {
          this.y = Math.floor(feet / TILE) * TILE - this.h;
          this.vy = isTnt ? 0 : -0.4; // wooden barrels bounce-roll
          if (isTnt) return this.explode(lv);
        }
        const frontX = this.vx > 0 ? this.x + this.w + 1 : this.x - 1;
        if (lv.solidAtPx(frontX, this.y + this.h / 2)) return this.explode(lv);
        if (this.x < -20 || this.x > lv.pxWidth + 20 || this.y > lv.pxHeight + 20) this.alive = false;
      } else {
        // idle barrel obeys gravity
        this.vy = Math.min(this.vy + 0.26, 4);
        this.y += this.vy;
        const feet = this.y + this.h;
        if (this.vy >= 0 && (lv.solidAtPx(this.x + 2, feet) || lv.solidAtPx(this.x + this.w - 2, feet))) {
          this.y = Math.floor(feet / TILE) * TILE - this.h;
          this.vy = 0;
        }
      }
    },
    explode(lv) {
      this.alive = false;
      lv.addEntity(poof(this.x + 6, this.y + 5));
      sfx.break();
      const r = isTnt ? 26 : 10;
      lv.breakCrackedAround(this.x + this.w / 2, this.y + this.h / 2, r);
    },
    draw(lv, cam) {
      if (this.held) return; // drawn over hero's head by player-follow position anyway
      const spr = isTnt ? SPR.tnt : SPR.barrel;
      blit(spr, Math.round(this.x + this.w / 2 - spr.w / 2 - cam.x), Math.round(this.y + this.h - spr.h - cam.y));
    },
    drawHeld(cam) {
      const spr = isTnt ? SPR.tnt : SPR.barrel;
      blit(spr, Math.round(this.x + this.w / 2 - spr.w / 2 - cam.x), Math.round(this.y + this.h - spr.h - cam.y));
    },
  };
}

function cannonFactory(x, y, vx, vy, auto, rotating) {
  return {
    ...item('cannon', x, y, 16, 12, { auto, rotating, holdT: 0, cooldown: 0, angle: 0 }),
    update(lv) {
      this.t++;
      if (this.cooldown > 0) this.cooldown--;
      if (this.rotating) this.angle = Math.sin(this.t / 45) * 0.9; // sweep ±~50°
    },
    launchVec() {
      if (!this.rotating) return [vx, vy];
      return [Math.sin(this.angle) * 7.5, -Math.cos(this.angle) * 7.5];
    },
    onTouch(lv) {
      if (this.cooldown > 0) return;
      const p = lv.player;
      if (p.state === 'cannon') return;
      p.state = 'cannon';
      p.cannon = this;
      p.vx = 0; p.vy = 0;
      this.holdT = 0;
    },
    draw(lv, cam) {
      const spr = SPR.cannon;
      const dx = Math.round(this.x - cam.x), dy = Math.round(this.y - cam.y);
      blit(spr, dx, dy);
      if (this.rotating) {
        // aim pointer
        const ax = Math.round(dx + 8 + Math.sin(this.angle) * 10);
        const ay = Math.round(dy + 4 - Math.cos(this.angle) * 10);
        fillRect(ax, ay, 2, 2, 3);
      } else if (Math.abs(vx) > 0.1) {
        blit(SPR.arrow_r, dx + (vx > 0 ? 14 : -2), dy + 2, vx < 0);
      }
    },
  };
}

function animalCrate(x, y, animal, spr) {
  return {
    ...item('crate', x, y, 16, 12, { animal }),
    update(lv) {
      this.t++;
      this.vy = Math.min(this.vy + 0.26, 4);
      this.y += this.vy;
      const feet = this.y + this.h;
      if (this.vy >= 0 && lv.solidAtPx(this.x + 8, feet)) {
        this.y = Math.floor(feet / TILE) * TILE - this.h;
        this.vy = 0;
      }
    },
    onTouch(lv) {
      this.alive = false;
      lv.addEntity(poof(this.x + 8, this.y + 6));
      lv.spawnAnimal(this.animal, this.x, this.y - 8);
      sfx.break();
    },
    draw(lv, cam) {
      blit(spr, Math.round(this.x - cam.x), Math.round(this.y + this.h - spr.h - cam.y));
    },
  };
}

function bonusTrigger(x, y, index) {
  return {
    ...item('bonus', x, y, 16, 16, { index, invisible: true }),
    update() { this.t++; },
    onTouch(lv) {
      if (lv.inBonus) return;
      this.alive = false;
      lv.enterBonus(this.index);
    },
    draw(lv, cam) {
      // faint sparkle so found-once entrances are visible in bonus rooms; hidden in main map
      if (!lv.inBonus && !lv.game.debug) return;
    },
  };
}
