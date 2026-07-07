// Hero FSM: walk/jump/roll/climb/swim/carry/cannon/hurt/dead + buddy system.
import { PHYS, HERO, BTN, T, TILE } from './constants.js';
import { input } from './input.js';
import { SPR } from './sprites.js';
import { blit } from './renderer.js';
import { sfx } from './audio.js';

const SIZES = {
  [HERO.BRUNO]: { w: 12, h: 16, rollH: 13 },
  [HERO.PIP]: { w: 10, h: 13, rollH: 10 },
};

export class Player {
  constructor(lv, x, y) {
    this.lv = lv;
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.hero = lv.game.run.activeHero;
    this.facing = 1;
    this.state = 'air'; // ground|air|roll|climb|swim|cannon|hurt|dead
    this.grounded = false;
    this.jumpHold = 0;
    this.rollT = 0; this.rollCd = 0;
    this.rollAirJump = false;
    this.coyote = 0;
    this.invuln = 0;
    this.carrying = null;      // barrel entity
    this.riding = null;        // animal entity
    this.cannon = null;
    this.anim = 0;
    this.swimT = 0;
    this.stunT = 0;
    this.deadT = 0;
    this.platform = null;      // carrier entity under feet
  }

  get w() { return SIZES[this.hero].w; }
  get h() { return this.state === 'roll' ? SIZES[this.hero].rollH : SIZES[this.hero].h; }
  get walkSpeed() { return this.hero === HERO.BRUNO ? PHYS.walkBruno : PHYS.walkPip; }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get bottom() { return this.y + this.h; }

  switchHero() {
    if (this.lv.game.run.heroesAlive < 2 || this.state === 'dead' || this.riding) return;
    this.hero = this.hero === HERO.BRUNO ? HERO.PIP : HERO.BRUNO;
    this.lv.game.run.activeHero = this.hero;
    this.y += (SIZES[this.hero === HERO.BRUNO ? HERO.PIP : HERO.BRUNO].h - SIZES[this.hero].h);
    sfx.select();
  }

  restorePartner() {
    const run = this.lv.game.run;
    if (run.heroesAlive < 2) { run.heroesAlive = 2; sfx.oneup(); }
    else this.lv.collectBanana(1);
  }

  hurt() {
    if (this.invuln > 0 || this.state === 'dead') return;
    if (this.riding) { this.riding.takeHit(this.lv); return; }
    const run = this.lv.game.run;
    if (this.carrying) this.dropBarrel();
    if (run.heroesAlive >= 2) {
      run.heroesAlive = 1;
      // partner takes over
      this.hero = this.hero === HERO.BRUNO ? HERO.PIP : HERO.BRUNO;
      run.activeHero = this.hero;
      this.invuln = PHYS.hurtInvuln;
      this.state = this.inWater() ? 'swim' : 'air';
      this.vy = -2.5; this.vx = -this.facing * 1.2;
      this.stunT = 18;
      sfx.hurt();
    } else {
      this.die();
    }
  }

  die() {
    if (this.state === 'dead') return;
    this.state = 'dead';
    this.deadT = 0;
    this.vy = -4; this.vx = 0;
    if (this.carrying) this.dropBarrel();
    sfx.die();
    this.lv.onPlayerDeath();
  }

  dropBarrel() {
    if (!this.carrying) return;
    this.carrying.held = false;
    this.carrying.vx = 0; this.carrying.vy = -1;
    this.carrying = null;
  }

  throwBarrel() {
    const b = this.carrying;
    if (!b) return;
    b.held = false;
    b.thrown = true;
    b.vx = 2.8 * this.facing;
    b.vy = -1.2;
    b.x = this.cx - b.w / 2 + this.facing * 8;
    b.y = this.y - 6;
    this.carrying = null;
    sfx.throw();
  }

  inWater() {
    return this.lv.inWater(this.cx, this.cy);
  }

  ropeAtHands() {
    return this.lv.tilePhysAt(this.cx, this.y + 3) === T.ROPE;
  }

  // ---- per-frame update ----
  update() {
    const lv = this.lv;
    this.anim++;
    if (this.invuln > 0) this.invuln--;
    if (this.rollCd > 0) this.rollCd--;
    if (this.stunT > 0) this.stunT--;

    if (this.state === 'dead') { this.updateDead(); return; }
    if (this.riding) { this.riding.control(this); return; }
    if (this.state === 'cannon') { this.updateCannon(); return; }

    if (input.pressed(BTN.SELECT)) this.switchHero();

    if (this.state === 'climb') { this.updateClimb(); return; }

    const water = this.inWater();
    if (water && this.state !== 'swim') {
      this.state = 'swim'; this.vy = Math.min(this.vy, 1); sfx.splash();
      if (this.carrying) this.dropBarrel();
    } else if (!water && this.state === 'swim') {
      this.state = 'air';
      if (this.vy < 0) this.vy = PHYS.jumpVel * 0.75;
    }

    if (this.state === 'swim') { this.updateSwim(); return; }
    if (this.state === 'roll') { this.updateRoll(); return; }
    this.updateNormal();
  }

  updateNormal() {
    const stunned = this.stunT > 0;
    const left = !stunned && input.held(BTN.LEFT);
    const right = !stunned && input.held(BTN.RIGHT);
    const target = left ? -this.walkSpeed : right ? this.walkSpeed : 0;
    if (target !== 0) this.facing = Math.sign(target);
    if (Math.abs(target) > 0.01) {
      this.vx += Math.sign(target - this.vx) * PHYS.accel;
      if (Math.abs(this.vx) > Math.abs(target)) this.vx = target;
    } else {
      const f = this.grounded ? PHYS.friction : PHYS.friction * 0.4;
      if (Math.abs(this.vx) <= f) this.vx = 0; else this.vx -= Math.sign(this.vx) * f;
    }

    // grab rope
    if ((input.held(BTN.UP) || input.held(BTN.DOWN)) && this.ropeAtHands() && !this.carrying) {
      this.state = 'climb';
      this.vx = 0; this.vy = 0;
      this.x = Math.floor(this.cx / TILE) * TILE + (TILE - this.w) / 2;
      return;
    }

    // jump
    if (!stunned && input.pressed(BTN.A) &&
        (this.grounded || this.coyote > 0 || this.rollAirJump)) {
      this.vy = PHYS.jumpVel;
      this.jumpHold = 16;
      this.grounded = false;
      this.coyote = 0;
      this.rollAirJump = false;
      sfx.jump();
    }
    if (this.jumpHold > 0) {
      if (input.held(BTN.A) && this.vy < 0) this.jumpHold--;
      else this.jumpHold = 0;
    }

    // roll / pickup / throw
    if (!stunned) {
      if (this.carrying) {
        if (input.released(BTN.B)) this.throwBarrel();
      } else if (input.pressed(BTN.B) && this.grounded && this.rollCd === 0) {
        const barrel = this.lv.barrelNear(this);
        if (barrel) {
          this.carrying = barrel; barrel.held = true;
        } else {
          this.state = 'roll';
          this.rollT = PHYS.rollFrames;
          this.vx = PHYS.rollSpeed * this.facing;
          sfx.roll();
          return;
        }
      }
    }

    this.applyGravity();
    this.moveAndCollide();

    if (this.grounded) { this.coyote = PHYS.coyoteFrames; this.rollAirJump = false; }
    else if (this.coyote > 0) this.coyote--;

    if (this.carrying) {
      this.carrying.x = this.cx - this.carrying.w / 2;
      this.carrying.y = this.y - this.carrying.h + 2;
    }
    this.state = this.grounded ? 'ground' : 'air';
  }

  updateRoll() {
    this.rollT--;
    this.vx = PHYS.rollSpeed * this.facing;
    const wasGrounded = this.grounded;
    this.applyGravity();
    this.moveAndCollide();
    if (wasGrounded && !this.grounded) {
      // rolled off a ledge: allow the classic mid-air jump
      this.rollAirJump = true;
    }
    if (input.pressed(BTN.A) && (this.grounded || this.rollAirJump)) {
      this.state = 'air';
      this.vy = PHYS.jumpVel;
      this.jumpHold = 16;
      this.rollAirJump = false;
      this.rollCd = PHYS.rollCooldown;
      sfx.jump();
      return;
    }
    if (this.rollT <= 0 || Math.abs(this.vx) < 0.2) {
      this.state = this.grounded ? 'ground' : 'air';
      this.rollCd = PHYS.rollCooldown;
    }
  }

  updateClimb() {
    if (!this.ropeAtHands()) { this.state = 'air'; return; }
    this.vx = 0; this.vy = 0;
    if (input.held(BTN.UP)) this.y -= PHYS.climbSpeed;
    if (input.held(BTN.DOWN)) this.y += PHYS.climbSpeed;
    // hop between ropes / off
    if (input.pressed(BTN.A)) {
      this.state = 'air';
      this.vy = PHYS.jumpVel * 0.85;
      this.jumpHold = 10;
      if (input.held(BTN.LEFT)) { this.vx = -this.walkSpeed; this.facing = -1; }
      if (input.held(BTN.RIGHT)) { this.vx = this.walkSpeed; this.facing = 1; }
      sfx.jump();
      return;
    }
    // straddle solid ground below → dismount
    if (input.held(BTN.DOWN) && this.lv.solidAtPx(this.cx, this.bottom + 1)) {
      this.state = 'ground'; this.grounded = true;
    }
    this.moveAndCollide(true);
  }

  updateSwim() {
    this.swimT++;
    const left = input.held(BTN.LEFT), right = input.held(BTN.RIGHT);
    if (left) this.facing = -1;
    if (right) this.facing = 1;
    if (input.pressed(BTN.A)) {
      this.vy = PHYS.swimStroke;
      this.vx = (left ? -1 : right ? 1 : 0) * PHYS.swimDrift;
      sfx.swim();
    }
    // drift
    this.vx *= 0.97;
    if (left) this.vx = Math.max(this.vx - 0.05, -PHYS.swimDrift);
    if (right) this.vx = Math.min(this.vx + 0.05, PHYS.swimDrift);
    this.vy += PHYS.swimGravity;
    if (this.vy > PHYS.swimMaxSink) this.vy = PHYS.swimMaxSink;
    if (this.vy < -PHYS.swimMaxRise) this.vy = -PHYS.swimMaxRise;
    this.moveAndCollide();
    this.state = 'swim';
    if (this.grounded && !this.lv.flooded) {
      // stand up in shallow water
      if (!this.inWater()) this.state = 'ground';
    }
  }

  updateCannon() {
    const c = this.cannon;
    if (!c) { this.state = 'air'; return; }
    this.x = c.x + c.w / 2 - this.w / 2;
    this.y = c.y + c.h / 2 - this.h / 2;
    c.holdT++;
    const fire = input.pressed(BTN.A) || (c.auto && c.holdT > 55);
    if (fire) {
      const [lvx, lvy] = c.launchVec();
      this.vx = lvx; this.vy = lvy;
      this.state = 'air';
      this.jumpHold = 0;
      this.invuln = Math.max(this.invuln, 20);
      this.cannon = null;
      c.cooldown = 30;
      sfx.cannon();
    }
  }

  updateDead() {
    this.deadT++;
    this.vy += PHYS.gravity;
    this.y += this.vy;
    if (this.deadT > 90) this.lv.finishDeath();
  }

  applyGravity() {
    let g = PHYS.gravity;
    if (this.vy < 0) g = (this.jumpHold > 0 && input.held(BTN.A)) ? PHYS.gravityHold : PHYS.gravityRelease;
    this.vy += g;
    if (this.vy > PHYS.maxFall) this.vy = PHYS.maxFall;
  }

  moveAndCollide(noGravity = false) {
    const lv = this.lv;
    // horizontal
    this.x += this.vx;
    if (this.vx > 0) {
      if (lv.solidAtPx(this.x + this.w, this.y + 1) || lv.solidAtPx(this.x + this.w, this.y + this.h - 1) || lv.solidAtPx(this.x + this.w, this.cy)) {
        this.x = Math.floor((this.x + this.w) / TILE) * TILE - this.w - 0.01;
        this.vx = 0;
      }
    } else if (this.vx < 0) {
      if (lv.solidAtPx(this.x, this.y + 1) || lv.solidAtPx(this.x, this.y + this.h - 1) || lv.solidAtPx(this.x, this.cy)) {
        this.x = (Math.floor(this.x / TILE) + 1) * TILE + 0.01;
        this.vx = 0;
      }
    }
    if (this.x < 0) { this.x = 0; this.vx = Math.max(0, this.vx); }
    if (this.x + this.w > lv.pxWidth) { this.x = lv.pxWidth - this.w; this.vx = Math.min(0, this.vx); }

    // vertical
    const prevBottom = this.bottom - this.vy; // approximate pre-move bottom
    this.y += this.vy;
    this.grounded = false;
    if (this.vy >= 0) {
      const feetY = this.bottom;
      const solid = lv.solidAtPx(this.x + 1, feetY) || lv.solidAtPx(this.x + this.w - 1, feetY);
      const platTile = (lv.tilePhysAt(this.x + 1, feetY) === T.PLATFORM || lv.tilePhysAt(this.x + this.w - 1, feetY) === T.PLATFORM);
      const tileTop = Math.floor(feetY / TILE) * TILE;
      if (solid || (platTile && prevBottom <= tileTop + 4 && !input.held(BTN.DOWN))) {
        if (this.vy > 3) sfx.land();
        this.y = tileTop - this.h;
        this.vy = 0;
        this.grounded = true;
      }
    } else {
      const headY = this.y;
      if (lv.solidAtPx(this.x + 1, headY) || lv.solidAtPx(this.x + this.w - 1, headY)) {
        this.y = (Math.floor(headY / TILE) + 1) * TILE + 0.01;
        this.vy = 0;
        this.jumpHold = 0;
      }
    }

    // spikes
    if (!noGravity) {
      const feet = lv.tilePhysAt(this.cx, this.bottom - 2);
      if (feet === T.SPIKE) this.hurt();
    }

    // pit death
    if (this.y > lv.pxHeight + 24) this.die();
  }

  bounce(strong = false) {
    this.vy = (input.held(BTN.A) || strong) ? PHYS.bounceVelHold : PHYS.bounceVel;
    this.jumpHold = 8;
    this.rollAirJump = false;
    this.state = 'air';
    sfx.bounce();
  }

  // ---- drawing ----
  draw(cam) {
    if (this.invuln > 0 && (this.anim & 2)) return; // flicker
    const big = this.hero === HERO.BRUNO;
    const pre = big ? 'bruno' : 'pip';
    let name;
    switch (this.state) {
      case 'roll': name = pre + (Math.floor(this.anim / 4) % 2 ? '_roll1' : '_roll2'); break;
      case 'climb': name = pre + '_climb'; break;
      case 'swim': name = pre + (Math.floor(this.anim / 8) % 2 ? '_swim1' : '_swim2'); break;
      case 'air': name = pre + '_jump'; break;
      case 'dead': name = pre + '_hurt'; break;
      case 'cannon': return; // hidden inside cannon
      default:
        if (this.stunT > 0) name = pre + '_hurt';
        else if (Math.abs(this.vx) > 0.2) name = pre + (Math.floor(this.anim / 6) % 2 ? '_walk1' : '_walk2');
        else name = pre + '_idle';
    }
    const spr = SPR[name] || SPR[pre + '_idle'];
    const dx = Math.round(this.x + this.w / 2 - spr.w / 2 - cam.x);
    const dy = Math.round(this.bottom - spr.h - cam.y);
    blit(spr, dx, dy, this.facing < 0);
  }
}
