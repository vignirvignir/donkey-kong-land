// The four boss fights: Ray Rumble, Clam Clash, Mole Mayhem, Snapjaw's Keep.
import { TILE } from './constants.js';
import { SPR } from './sprites.js';
import { blit, fillRect } from './renderer.js';
import { sfx, playMusic } from './audio.js';
import { SONGS } from './music.js';
import { poof, pearlProjectile, rockProjectile } from './enemies.js';

function bossBase(type, x, y, w, h, extra) {
  return {
    kind: 'enemy', boss: true, type, x, y, w, h, vx: 0, vy: 0, dir: -1, t: 0,
    alive: true, hp: 5, hurtT: 0, phaseT: 0, state: 'intro',
    stompable: false, rollable: false, deadly: true, barrelKills: false,
    ...extra,
  };
}

function hit(b, lv) {
  if (b.state === 'dying') return;
  b.hp--;
  b.hurtT = 60;
  sfx.bosshit();
  if (b.hp <= 0) {
    b.state = 'dying';
    b.phaseT = 0;
    b.stompable = false;
    b.deadly = false;
  }
}

function dying(b, lv, onDone) {
  b.phaseT++;
  if (b.phaseT % 12 === 0) lv.addEntity(poof(b.x + (b.phaseT * 7) % b.w, b.y + (b.phaseT * 5) % b.h));
  if (b.phaseT > 120) {
    b.alive = false;
    lv.onBossDefeated();
  }
}

export function makeBoss(name, lv) {
  const W = lv.pxWidth, H = lv.pxHeight;
  const floorY = H - TILE * 2; // arenas keep a 2-tile floor
  switch (name) {
    // ---- W1: giant stingray sweeping the arena; stomp it while it basks ----
    case 'ray': return {
      ...bossBase('ray', W + 30, floorY - 52, 30, 12, { band: 0, sweeps: 0 }),
      update(lv) {
        this.t++;
        if (this.hurtT > 0) this.hurtT--;
        if (this.state === 'dying') return dying(this, lv);
        this.phaseT++;
        if (this.state === 'intro') { this.state = 'sweep'; this.pickBand(lv); }
        const speed = 1.6 + (5 - this.hp) * 0.22;
        if (this.state === 'sweep') {
          this.deadly = true; this.stompable = false;
          this.x += this.dir * speed;
          this.y = floorY - 18 - this.band * 22 + Math.sin(this.t / 10) * 3;
          if ((this.dir < 0 && this.x < -40) || (this.dir > 0 && this.x > W + 40)) {
            this.sweeps++;
            this.dir *= -1;
            if (this.sweeps >= 2) { this.state = 'bask'; this.phaseT = 0; this.x = W / 2 - this.w / 2; }
            else this.pickBand(lv);
          }
        } else if (this.state === 'bask') {
          // surfaced and vulnerable
          this.deadly = false; this.stompable = true;
          this.y = floorY - 26 + Math.sin(this.t / 20) * 2;
          if (this.phaseT > 130 - (5 - this.hp) * 10) this.resumeSweep(lv);
        }
      },
      pickBand(lv) { this.band = (lv.rng() * 3) | 0; },
      // dive away and re-enter from an edge — never turns deadly on top of the hero
      resumeSweep(lv) {
        this.state = 'sweep';
        this.sweeps = 0;
        this.pickBand(lv);
        this.dir = lv.rng() < 0.5 ? -1 : 1;
        this.x = this.dir > 0 ? -39 - this.w : lv.pxWidth + 39;
      },
      onStomp(lv, p) {
        if (!this.stompable) return false;
        hit(this, lv);
        if (this.hp > 0) this.resumeSweep(lv);
        p.bounce(true);
        return true;
      },
      draw(lv, cam) {
        if (this.hurtT > 0 && (this.t & 2)) return;
        const spr = Math.floor(this.t / 8) % 2 ? SPR.ray2 : SPR.ray1;
        blit(spr, Math.round(this.x - cam.x), Math.round(this.y - 4 - cam.y), this.dir > 0);
      },
    };

    // ---- W2: giant clam (underwater). Touch it while it gapes; dodge pearls ----
    case 'clam': return {
      ...bossBase('clam', W / 2 - 14, floorY - 20, 28, 18, { open: false, hopDir: -1 }),
      update(lv) {
        this.t++;
        if (this.hurtT > 0) this.hurtT--;
        if (this.state === 'dying') return dying(this, lv);
        this.phaseT++;
        const cyc = 220 - (5 - this.hp) * 25;
        const c = this.phaseT % cyc;
        this.open = c > cyc * 0.55;
        this.deadly = !this.open;
        if (!this.open) {
          // hop toward the hero
          if (this.grounded !== false && c % 40 === 0) {
            this.vy = -2.6;
            this.hopDir = lv.player.cx < this.x + this.w / 2 ? -1 : 1;
          }
          this.vy += 0.12;
          this.x += this.hopDir * 0.7;
          this.y += this.vy;
          if (this.y + this.h > floorY) { this.y = floorY - this.h; this.vy = 0; }
          this.x = Math.max(TILE, Math.min(W - TILE - this.w, this.x));
        } else {
          if (c % 34 === 0) {
            const px = this.x + this.w / 2, py = this.y + 6;
            const dx = lv.player.cx - px, dy = lv.player.cy - py;
            const len = Math.max(1, Math.hypot(dx, dy));
            lv.addEntity(pearlProjectile(px, py, (dx / len) * 1.5, (dy / len) * 1.5 - 0.3));
            lv.addEntity(pearlProjectile(px, py, (dx / len) * 1.5, (dy / len) * 1.5 + 0.4));
          }
        }
      },
      onTouchOpen(lv, p) {
        if (!this.open || this.hurtT > 0) return false;
        hit(this, lv);
        // knock the swimmer back
        p.vx = (p.cx < this.x + this.w / 2 ? -1 : 1) * 2.2;
        p.vy = -1.5;
        return true;
      },
      draw(lv, cam) {
        if (this.hurtT > 0 && (this.t & 2)) return;
        const spr = this.open ? SPR.bigclam_open : SPR.bigclam_closed;
        blit(spr, Math.round(this.x - cam.x), Math.round(this.y + this.h - spr.h - cam.y));
      },
    };

    // ---- W3: whack-a-mole boss across five burrows ----
    case 'mole': return {
      ...bossBase('mole', W / 2, floorY - 16, 16, 16, { hole: 2, holes: 5 }),
      update(lv) {
        this.t++;
        if (this.hurtT > 0) this.hurtT--;
        if (this.state === 'dying') return dying(this, lv);
        this.phaseT++;
        const speed = 1 + (5 - this.hp) * 0.35;
        const hideT = 70 / speed, upT = 60 / speed, dizzyT = 55;
        const holeX = (i) => TILE * 2 + i * ((W - TILE * 4 - 16) / (this.holes - 1));
        if (this.state === 'intro' || this.state === 'hide') {
          this.deadly = false; this.stompable = false;
          this.y = H + 40; // offscreen
          if (this.phaseT > hideT) {
            this.hole = (lv.rng() * this.holes) | 0;
            this.x = holeX(this.hole);
            this.y = floorY - 14;
            this.state = 'up'; this.phaseT = 0;
            this.thrown = 0;
          }
        } else if (this.state === 'up') {
          this.deadly = true; this.stompable = false;
          if (this.phaseT === Math.floor(upT * 0.3) || this.phaseT === Math.floor(upT * 0.7)) {
            const d = lv.player.cx < this.x ? -1 : 1;
            lv.addEntity(rockProjectile(this.x + 6, this.y, d * (1 + lv.rng()), -2.8));
          }
          if (this.phaseT > upT) { this.state = 'dizzy'; this.phaseT = 0; }
        } else if (this.state === 'dizzy') {
          this.deadly = false; this.stompable = true;
          if (this.phaseT > dizzyT) { this.state = 'hide'; this.phaseT = 0; }
        }
      },
      onStomp(lv, p) {
        if (!this.stompable) return false;
        hit(this, lv);
        this.state = 'hide'; this.phaseT = 0;
        p.bounce(true);
        return true;
      },
      draw(lv, cam) {
        // burrow mounds
        for (let i = 0; i < this.holes; i++) {
          const hx = TILE * 2 + i * ((lv.pxWidth - TILE * 4 - 16) / (this.holes - 1));
          fillRect(Math.round(hx - cam.x), Math.round(floorY - 3 - cam.y), 18, 4, 2);
        }
        if (this.y > lv.pxHeight) return;
        if (this.hurtT > 0 && (this.t & 2)) return;
        const spr = SPR.bossmole1;
        const wob = this.state === 'dizzy' ? Math.sin(this.t / 3) * 2 : 0;
        blit(spr, Math.round(this.x + wob - cam.x), Math.round(this.y + this.h - spr.h - cam.y), this.t % 20 > 10);
      },
    };

    // ---- W4: King Snapjaw — crown boomerang, charges, quake hops ----
    case 'king': return {
      ...bossBase('king', W - 70, floorY - 26, 24, 26, { crown: null, quake: 0 }),
      hpMax: 5,
      update(lv) {
        this.t++;
        if (this.hurtT > 0) this.hurtT--;
        if (this.quake > 0) this.quake--;
        if (this.state === 'dying') return dying(this, lv);
        this.phaseT++;
        const p = lv.player;
        const speed = 0.6 + (5 - this.hp) * 0.2;
        this.dir = p.cx < this.x + this.w / 2 ? -1 : 1;
        // gravity
        this.vy += 0.26;
        this.y += this.vy;
        if (this.y + this.h > floorY) {
          if (this.vy > 3) {
            // quake landing: stun a grounded hero
            this.quakeNow(lv);
          }
          this.y = floorY - this.h; this.vy = 0;
        }
        switch (this.state) {
          case 'intro':
            if (this.phaseT > 40) { this.state = 'walk'; this.phaseT = 0; }
            break;
          case 'walk':
            this.deadly = true; this.stompable = false;
            this.x += this.dir * speed;
            if (this.phaseT > 120) {
              this.phaseT = 0;
              const r = lv.rng();
              if (r < 0.45) this.state = 'crown';
              else if (r < 0.75) this.state = 'hop';
              else this.state = 'charge';
            }
            break;
          case 'crown':
            if (this.phaseT === 20) {
              this.crown = crownProjectile(this, this.x + this.w / 2, this.y + 2, this.dir);
              lv.addEntity(this.crown);
              sfx.crown();
            }
            // vulnerable while the crown is out
            this.stompable = this.crown != null && this.crown.alive;
            this.deadly = !this.stompable;
            if (this.phaseT > 30 && (!this.crown || !this.crown.alive)) {
              this.state = 'walk'; this.phaseT = 0; this.stompable = false; this.deadly = true;
            }
            break;
          case 'hop':
            if (this.phaseT === 10) { this.vy = -5; this.vx = this.dir * 1.6; }
            this.x += this.vx || 0;
            if (this.phaseT > 70) { this.state = 'walk'; this.phaseT = 0; this.vx = 0; }
            break;
          case 'charge':
            this.deadly = true; this.stompable = false;
            this.x += this.dir * (speed * 3);
            if (this.x < TILE || this.x + this.w > lv.pxWidth - TILE || this.phaseT > 90) {
              this.state = 'walk'; this.phaseT = 0;
            }
            break;
        }
        this.x = Math.max(TILE, Math.min(lv.pxWidth - TILE - this.w, this.x));
      },
      quakeNow(lv) {
        this.quake = 30;
        lv.shake = 14;
        const p = lv.player;
        if (p.grounded && p.state !== 'dead') p.stunT = 45;
        sfx.stomp();
      },
      onStomp(lv, p) {
        if (!this.stompable || this.hurtT > 0) return false;
        hit(this, lv);
        this.state = 'walk'; this.phaseT = -40; // brief recovery pause
        this.stompable = false; this.deadly = true;
        p.bounce(true);
        return true;
      },
      draw(lv, cam) {
        if (this.hurtT > 0 && (this.t & 2)) return;
        const spr = Math.floor(this.t / 10) % 2 ? SPR.king2 : SPR.king1;
        blit(spr, Math.round(this.x + this.w / 2 - spr.w / 2 - cam.x), Math.round(this.y + this.h - spr.h - cam.y), this.dir > 0);
        if (this.state !== 'crown' || !this.crown || !this.crown.alive) {
          blit(SPR.crown, Math.round(this.x + this.w / 2 - 5 - cam.x), Math.round(this.y - 8 + this.h - spr.h - cam.y));
        }
      },
    };
  }
  return null;
}

function crownProjectile(king, x, y, dir) {
  return {
    kind: 'enemy', type: 'crown', x, y, w: 10, h: 6, vx: dir * 2.4, vy: 0, t: 0, alive: true, dir,
    stompable: false, rollable: false, deadly: true, barrelKills: false, projectile: true,
    update(lv) {
      this.t++;
      if (this.t < 40) this.x += this.vx;
      else {
        // boomerang back to the king
        const tx = king.x + king.w / 2, ty = king.y + 4;
        const dx = tx - this.x, dy = ty - this.y;
        const len = Math.max(1, Math.hypot(dx, dy));
        this.x += (dx / len) * 2.6;
        this.y += (dy / len) * 2.6;
        if (len < 8 || this.t > 200 || !king.alive) this.alive = false;
      }
    },
    draw(lv, cam) { blit(SPR.crown, Math.round(this.x - cam.x), Math.round(this.y - cam.y)); },
  };
}
