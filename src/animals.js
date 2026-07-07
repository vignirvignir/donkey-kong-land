// Animal buddies: Rocky the Rhino (charge) and Ozzie the Ostrich (glide).
import { TILE, BTN, PHYS } from './constants.js';
import { input } from './input.js';
import { SPR } from './sprites.js';
import { blit } from './renderer.js';
import { sfx } from './audio.js';
import { poof } from './enemies.js';

const PARAMS = {
  rocky: { w: 22, h: 14, walk: 1.5, jump: -4.5, charge: 2.7 },
  ozzie: { w: 13, h: 17, walk: 2.0, jump: -4.3, glideG: 0.05 },
};

export function makeAnimal(name, x, y) {
  const P = PARAMS[name];
  return {
    kind: 'animal', type: name, x, y, w: P.w, h: P.h,
    vx: 0, vy: 0, dir: 1, t: 0, alive: true, grounded: false,
    mounted: false, fleeing: false, charging: false, invuln: 0, remountCd: 0,

    update(lv) {
      this.t++;
      if (this.invuln > 0) this.invuln--;
      if (this.remountCd > 0) this.remountCd--;
      if (this.mounted) return; // controlled via control()
      // idle / fleeing animal
      this.vy = Math.min(this.vy + PHYS.gravity, PHYS.maxFall);
      if (this.fleeing) this.vx = this.dir * 2.2;
      else this.vx = 0;
      this.move(lv);
      if (this.fleeing && (this.x < -40 || this.x > lv.pxWidth + 40)) this.alive = false;
      // mount on touch
      if (!this.fleeing && this.remountCd === 0 && lv.player.riding == null && lv.player.state !== 'dead' &&
          overlap(this, lv.player)) {
        this.mounted = true;
        lv.player.riding = this;
        lv.player.vx = 0; lv.player.vy = 0;
        sfx.select();
      }
    },

    // called instead of player.update while ridden
    control(p) {
      const lv = p.lv;
      this.t++;
      if (this.invuln > 0) this.invuln--;
      if (input.pressed(BTN.SELECT)) { this.dismount(p); return; }

      const left = input.held(BTN.LEFT), right = input.held(BTN.RIGHT);
      this.charging = this.type === 'rocky' && input.held(BTN.B);
      const speed = this.charging ? PARAMS.rocky.charge : P.walk;
      this.vx = left ? -speed : right ? speed : 0;
      if (left) this.dir = -1;
      if (right) this.dir = 1;

      if (input.pressed(BTN.A) && this.grounded) { this.vy = P.jump; sfx.jump(); }
      let g = PHYS.gravity;
      if (this.type === 'ozzie' && this.vy > 0 && input.held(BTN.A)) {
        g = P.glideG;
        this.vy = Math.min(this.vy, 0.6);
      }
      this.vy = Math.min(this.vy + g, PHYS.maxFall);
      this.move(lv);

      // rhino charge breaks cracked walls
      if (this.type === 'rocky' && this.charging) {
        const fx = this.dir > 0 ? this.x + this.w + 3 : this.x - 3;
        lv.breakCrackedAround(fx, this.y + this.h / 2, 10);
      }

      // keep the hero glued to the saddle
      p.x = this.x + this.w / 2 - p.w / 2;
      p.y = this.y - p.h + 6;
      p.facing = this.dir;
      p.grounded = this.grounded;
      if (this.y > lv.pxHeight + 24) { p.riding = null; p.die(); }
    },

    dismount(p) {
      this.mounted = false;
      this.remountCd = 45;
      p.riding = null;
      p.vy = -2.5;
      p.state = 'air';
      p.invuln = Math.max(p.invuln, 20);
      sfx.select();
    },

    takeHit(lv) {
      if (this.invuln > 0) return;
      const p = lv.player;
      if (p.riding === this) {
        this.mounted = false;
        p.riding = null;
        p.invuln = PHYS.hurtInvuln;
        p.vy = -2.5; p.state = 'air';
      }
      this.fleeing = true;
      this.dir = -this.dir;
      this.invuln = 60;
      sfx.hurt();
    },

    move(lv) {
      this.x += this.vx;
      if (this.vx > 0 && (lv.solidAtPx(this.x + this.w, this.y + 3) || lv.solidAtPx(this.x + this.w, this.y + this.h - 3))) {
        this.x = Math.floor((this.x + this.w) / TILE) * TILE - this.w - 0.01;
      } else if (this.vx < 0 && (lv.solidAtPx(this.x, this.y + 3) || lv.solidAtPx(this.x, this.y + this.h - 3))) {
        this.x = (Math.floor(this.x / TILE) + 1) * TILE + 0.01;
      }
      if (this.x < 0) this.x = 0;
      if (this.x + this.w > lv.pxWidth) this.x = lv.pxWidth - this.w;
      this.y += this.vy;
      this.grounded = false;
      const feet = this.y + this.h;
      if (this.vy >= 0 && (lv.solidAtPx(this.x + 2, feet) || lv.solidAtPx(this.x + this.w - 2, feet) ||
          ((lv.tilePhysAt(this.x + 2, feet) === 2 || lv.tilePhysAt(this.x + this.w - 2, feet) === 2) && feet % TILE < 6))) {
        this.y = Math.floor(feet / TILE) * TILE - this.h;
        this.vy = 0;
        this.grounded = true;
      } else if (this.vy < 0 && lv.solidAtPx(this.x + this.w / 2, this.y)) {
        this.y = (Math.floor(this.y / TILE) + 1) * TILE;
        this.vy = 0;
      }
    },

    // charge hitbox in front of the horn
    hornBox() {
      if (!(this.type === 'rocky' && (this.charging || Math.abs(this.vx) > 2))) return null;
      return { x: this.dir > 0 ? this.x + this.w - 2 : this.x - 8, y: this.y + 2, w: 10, h: this.h - 4 };
    },

    draw(lv, cam) {
      if (this.invuln > 0 && (this.t & 2)) return;
      const spr = this.type === 'rocky'
        ? (Math.abs(this.vx) > 0.1 && Math.floor(this.t / 5) % 2 ? SPR.rocky2 : SPR.rocky1)
        : (Math.abs(this.vx) > 0.1 && Math.floor(this.t / 5) % 2 ? SPR.ozzie2 : SPR.ozzie1);
      blit(spr, Math.round(this.x + this.w / 2 - spr.w / 2 - cam.x), Math.round(this.y + this.h - spr.h - cam.y), this.dir < 0);
    },
  };
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
