// Level runtime: tilemap, camera, entity orchestration, collisions, HUD, flow.
import { TILE, T, BTN, HERO, SCREEN_W, SCREEN_H } from './constants.js';
import { input } from './input.js';
import { clear, blit, fillRect, text, dim, textCenter } from './renderer.js';
import { tileSprite, CHAR_PHYS } from './tiles.js';
import { SPR } from './sprites.js';
import { Player } from './player.js';
import { ENEMY_FACTORIES, HAZARD_FACTORIES, PLATFORM_FACTORIES, poof } from './enemies.js';
import { ITEM_FACTORIES } from './items.js';
import { makeAnimal } from './animals.js';
import { makeBoss } from './bosses.js';
import { sfx, playMusic, stopMusic } from './audio.js';
import { SONGS, THEME_MUSIC } from './music.js';

function makeRng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xffffffff; };
}

export class Level {
  constructor(game, def, opts = {}) {
    this.game = game;
    this.def = def;
    this.theme = def.theme;
    this.flooded = !!def.flooded;
    this.inBonus = !!opts.isBonus;
    this.parent = opts.parent || null;
    this.rng = makeRng((def.id || 'x').split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7));

    const rows = opts.rows || def.rows;
    this.H = rows.length;
    this.W = Math.max(...rows.map(r => r.length));
    this.pxWidth = this.W * TILE;
    this.pxHeight = this.H * TILE;
    this.tiles = new Uint8Array(this.W * this.H);      // physics class
    this.tileChar = new Array(this.W * this.H).fill('.');
    this.entities = [];
    this.startPos = { x: 32, y: 32 };
    this.checkpointPos = null;
    this.lettersHere = new Set();
    this.shake = 0;
    this.paused = false;
    this.finished = false;
    this.frame = 0;
    this.deathHandled = false;

    for (let y = 0; y < this.H; y++) {
      const row = rows[y] || '';
      for (let x = 0; x < this.W; x++) {
        const ch = row[x] || '.';
        const px = x * TILE, py = y * TILE;
        if (CHAR_PHYS[ch] !== undefined) {
          this.tiles[y * this.W + x] = CHAR_PHYS[ch];
          this.tileChar[y * this.W + x] = ch;
        } else if (ch === 'S') {
          this.startPos = { x: px + 2, y: py };
        } else {
          this.spawnChar(ch, px, py);
        }
      }
    }

    // skip already-collected bonus entrances? (keep re-enterable, medals don't respawn)
    const rec = game.run.progress[def.id] || {};
    if (opts.fromCheckpoint && game.run.checkpoint && game.run.checkpoint.stage === def.id) {
      this.checkpointPos = { x: game.run.checkpoint.x, y: game.run.checkpoint.y };
      this.startPos = this.checkpointPos;
      // mark the checkpoint post active
      for (const e of this.entities) {
        if (e.type === 'checkpoint' && Math.abs(e.x - this.checkpointPos.x) < 20) e.active = true;
      }
    }

    this.player = new Player(this, this.startPos.x, this.startPos.y);
    this.player.hero = game.run.activeHero;
    if (this.flooded) this.player.state = 'swim';

    this.cam = { x: 0, y: 0 };
    this.snapCamera();

    this.boss = null;
    if (def.boss) {
      this.boss = makeBoss(def.boss, this);
      if (this.boss) this.entities.push(this.boss);
    }

    if (!opts.silent) {
      const song = def.boss ? 'boss' : (this.inBonus ? 'bonus' : (THEME_MUSIC[this.theme] || 'jungle'));
      playMusic(song, SONGS[song]);
    }
  }

  // ---------- tile queries ----------
  tileClassAt(tx, ty) {
    if (tx < 0 || tx >= this.W) return T.SOLID;
    if (ty < 0) return T.EMPTY;
    if (ty >= this.H) return T.EMPTY;
    return this.tiles[ty * this.W + tx];
  }
  tilePhysAt(px, py) { return this.tileClassAt(Math.floor(px / TILE), Math.floor(py / TILE)); }
  solidAtPx(px, py) {
    const c = this.tilePhysAt(px, py);
    return c === T.SOLID || c === T.CRACKED;
  }
  inWater(px, py) {
    if (this.flooded) return true;
    return this.tilePhysAt(px, py) === T.WATER;
  }
  breakCrackedAround(px, py, r) {
    const tx0 = Math.floor((px - r) / TILE), tx1 = Math.floor((px + r) / TILE);
    const ty0 = Math.floor((py - r) / TILE), ty1 = Math.floor((py + r) / TILE);
    let broke = false;
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      if (this.tileClassAt(tx, ty) === T.CRACKED) {
        this.tiles[ty * this.W + tx] = T.EMPTY;
        this.tileChar[ty * this.W + tx] = '.';
        this.addEntity(poof(tx * TILE + 8, ty * TILE + 8));
        broke = true;
      }
    }
    if (broke) sfx.break();
    return broke;
  }

  // ---------- run/economy ----------
  collectBanana(n) {
    const run = this.game.run;
    run.bananas += n;
    sfx.banana();
    while (run.bananas >= 100) { run.bananas -= 100; this.addLife(); }
  }
  addLife() { this.game.run.lives++; sfx.oneup(); }
  collectMedal() { this.game.run.medals++; sfx.medal(); }
  collectLetter(ch) {
    this.lettersHere.add(ch);
    sfx.letter();
  }
  setCheckpoint(x, y) {
    this.game.run.checkpoint = { stage: this.def.id, x, y };
  }
  spawnAnimal(name, x, y) {
    this.addEntity(makeAnimal(name, x, y));
  }
  // spawn any map-char entity at pixel coords (used by the parser and tests)
  spawnChar(ch, px, py) {
    let e = null;
    if (ITEM_FACTORIES[ch]) e = ITEM_FACTORIES[ch](px, py);
    else if (ENEMY_FACTORIES[ch]) e = ENEMY_FACTORIES[ch](px, py, this);
    else if (HAZARD_FACTORIES[ch]) e = HAZARD_FACTORIES[ch](px, py);
    else if (PLATFORM_FACTORIES[ch]) e = PLATFORM_FACTORIES[ch](px, py);
    if (e) this.entities.push(e);
    return e;
  }
  addEntity(e) { this.entities.push(e); }
  barrelNear(p) {
    return this.entities.find(e => e.alive && e.pickup && !e.held && !e.thrown &&
      Math.abs(e.x + e.w / 2 - p.cx) < 14 && Math.abs(e.y + e.h / 2 - p.cy) < 14) || null;
  }

  // ---------- flow ----------
  clearLevel() {
    if (this.finished) return;
    if (this.inBonus) { this.game.exitBonus(true); return; }
    this.finished = true;
    stopMusic();
    playMusic('clear', SONGS.clear);
    this.game.stageCleared(this);
  }
  onBossDefeated() {
    stopMusic();
    if (this.def.boss === 'king') { this.game.finalBossDefeated(this); return; }
    // reveal the exit portal at arena center
    const e = ITEM_FACTORIES.D(Math.floor(this.pxWidth / 2 / TILE) * TILE, this.pxHeight - TILE * 3);
    this.addEntity(e);
    playMusic('clear', SONGS.clear);
  }
  enterBonus(i) {
    const rec = this.game.run.progress[this.def.id] || (this.game.run.progress[this.def.id] = { cleared: false, bonus: [] });
    if (!rec.bonus.includes(i)) rec.bonus.push(i);
    this.game.enterBonusRoom(this, i);
  }
  onPlayerDeath() {
    stopMusic();
  }
  finishDeath() {
    this.game.playerDied(this);
  }

  // ---------- per-frame ----------
  update() {
    if (this.paused) {
      if (input.pressed(BTN.START)) { this.paused = false; sfx.pause(); }
      else if (input.pressed(BTN.SELECT)) {
        const rec = this.game.run.progress[this.def.id];
        if (rec && rec.cleared && !this.inBonus) { stopMusic(); this.game.exitToMap(); }
      }
      return;
    }
    if (input.pressed(BTN.START) && this.player.state !== 'dead' && !this.finished) {
      this.paused = true; sfx.pause();
      return;
    }

    this.frame++;
    if (this.shake > 0) this.shake--;

    this.player.update();

    for (const e of this.entities) {
      if (!e.alive) continue;
      // skip far-away entities for a GB-ish "activation" feel + perf
      if (!e.boss && Math.abs(e.x - this.player.cx) > SCREEN_W * 1.6 && e.kind !== 'fx') continue;
      e.update(this);
    }

    this.handleCarriers();
    if (this.player.state !== 'dead' && !this.finished) this.handleCollisions();
    this.entities = this.entities.filter(e => e.alive);

    this.updateCamera();
  }

  handleCarriers() {
    const p = this.player;
    let on = null;
    if (p.vy >= 0 && p.state !== 'climb' && p.state !== 'cannon' && p.state !== 'dead') {
      for (const c of this.entities) {
        if (c.kind !== 'carrier' || !c.alive || (c.solid && !c.solid())) continue;
        const feet = p.bottom;
        if (p.x + p.w > c.x + 2 && p.x < c.x + c.w - 2 &&
            feet >= c.y - 2 && feet <= c.y + 6 + Math.max(0, c.vy)) {
          p.y = c.y - p.h;
          p.vy = 0;
          p.grounded = true;
          p.coyote = 5;
          on = c;
          // ride along
          p.x += c.vx;
          p.y += c.vy;
          break;
        }
      }
    }
    p.platform = on;
  }

  handleCollisions() {
    const p = this.player;
    const pb = { x: p.x, y: p.y, w: p.w, h: p.h };
    const riding = p.riding;

    for (const e of this.entities) {
      if (!e.alive) continue;

      // thrown barrels & TNT vs enemies
      if (e.pickup && e.thrown) {
        for (const en of this.entities) {
          if (!en.alive || en.kind !== 'enemy' || en.projectile) continue;
          if (en.barrelKills && overlap(e, en)) {
            if (en.boss) continue;
            this.killEnemy(en);
            if (e.type === 'tnt') { e.explode(this); break; }
          }
        }
        continue;
      }

      if (e.kind === 'item') {
        if (!overlap(pb, e)) continue;
        if (e.type === 'tire') {
          // bounce only when landing on top
          if (p.vy > 0.5 && p.bottom - p.vy <= e.y + 5) {
            p.vy = input.held(BTN.A) ? -7.4 : -6.2;
            p.jumpHold = 6;
            e.bounceT = 8;
            sfx.bounce();
          }
          continue;
        }
        if (e.pickup) continue; // barrels picked up via B, not touch
        if (e.onTouch) e.onTouch(this);
        continue;
      }

      if (e.kind === 'animal') continue; // handles its own mounting

      if (e.kind !== 'enemy') continue;

      // oil drum flame
      if (e.hazardBox) {
        const hb = e.hazardBox();
        if (hb && overlap(pb, hb)) p.hurt();
        if (e.solidTop) continue;
      }

      if (!overlap(pb, e)) {
        // rhino horn can still reach
        if (riding) {
          const horn = riding.hornBox && riding.hornBox();
          if (horn && overlap(horn, e) && !e.boss) this.killEnemy(e);
        }
        continue;
      }

      // riding an animal: the animal takes contact
      if (riding) {
        const horn = riding.hornBox && riding.hornBox();
        if (horn && !e.boss && overlap(horn, e)) { this.killEnemy(e); continue; }
        if (e.boss) { if (e.deadly) riding.takeHit(this); continue; }
        if (e.projectile || e.deadly) { riding.takeHit(this); continue; }
        // rocky simply tramples stompable enemies
        if (riding.type === 'rocky' && (e.stompable || e.rollable)) { this.killEnemy(e); continue; }
        riding.takeHit(this);
        continue;
      }

      // boss custom interactions
      if (e.boss) {
        const stomping = p.vy > 0.5 && (p.bottom - p.vy) <= e.y + e.h * 0.5;
        if (e.type === 'clam' && e.onTouchOpen && e.onTouchOpen(this, p)) continue;
        if (stomping && e.onStomp && e.onStomp(this, p)) continue;
        if (e.deadly) p.hurt();
        continue;
      }

      const stomping = p.vy > 0.5 && (p.bottom - p.vy) <= e.y + Math.max(4, e.h * 0.45);
      const rolling = p.state === 'roll';
      const isBruno = p.hero === HERO.BRUNO;

      if (stomping && e.stompable && (!e.armored || isBruno)) {
        this.killEnemy(e);
        p.bounce();
        continue;
      }
      if (rolling) {
        if (e.rollable && (!e.armored || isBruno)) { this.killEnemy(e); continue; }
        if (e.armored && !isBruno) {
          // Pip bounces off the Bruiser, no harm done
          p.vx = -p.facing * 2.4;
          p.state = 'air'; p.vy = -1.5;
          p.rollT = 0;
          sfx.land();
          continue;
        }
      }
      if (e.projectile || e.deadly || true) {
        p.hurt();
      }
    }
  }

  killEnemy(e) {
    e.alive = false;
    this.addEntity(poof(e.x + e.w / 2, e.y + e.h / 2));
    sfx.stomp();
  }

  // ---------- camera ----------
  updateCamera() {
    const p = this.player;
    const tx = clamp(p.cx + p.facing * 16 - SCREEN_W / 2, 0, this.pxWidth - SCREEN_W);
    const ty = clamp(p.bottom - SCREEN_H * 0.62, 0, Math.max(0, this.pxHeight - SCREEN_H));
    this.cam.x += (tx - this.cam.x) * 0.12;
    this.cam.y += (ty - this.cam.y) * 0.15;
    if (Math.abs(this.cam.x - tx) < 0.5) this.cam.x = tx;
    if (Math.abs(this.cam.y - ty) < 0.5) this.cam.y = ty;
  }
  snapCamera() {
    this.cam = {
      x: clamp(this.player ? this.player.cx - SCREEN_W / 2 : 0, 0, Math.max(0, this.pxWidth - SCREEN_W)),
      y: clamp(this.player ? this.player.bottom - SCREEN_H * 0.62 : 0, 0, Math.max(0, this.pxHeight - SCREEN_H)),
    };
  }

  // ---------- drawing ----------
  draw() {
    clear(0);
    const cam = {
      x: Math.round(this.cam.x + (this.shake ? (this.frame % 2 ? 2 : -2) : 0)),
      y: Math.round(this.cam.y),
    };

    // simple distant backdrop per theme
    this.drawBackdrop(cam);

    // tiles
    const tx0 = Math.max(0, Math.floor(cam.x / TILE));
    const ty0 = Math.max(0, Math.floor(cam.y / TILE));
    const tx1 = Math.min(this.W - 1, Math.floor((cam.x + SCREEN_W) / TILE));
    const ty1 = Math.min(this.H - 1, Math.floor((cam.y + SCREEN_H) / TILE));
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const ch = this.tileChar[ty * this.W + tx];
        if (ch === '.') continue;
        const isTop = ch === '#' && this.tileClassAt(tx, ty - 1) !== T.SOLID;
        const spr = tileSprite(this.theme, ch, isTop);
        if (spr) blit(spr, tx * TILE - cam.x, ty * TILE - cam.y);
      }
    }

    // entities under player
    for (const e of this.entities) {
      if (e.kind === 'fx') continue;
      if (e.invisible) continue;
      if (e.x + e.w < cam.x - 8 || e.x > cam.x + SCREEN_W + 8) continue;
      e.draw(this, cam);
    }

    this.player.draw(cam);
    if (this.player.carrying) this.player.carrying.drawHeld(cam);

    for (const e of this.entities) if (e.kind === 'fx') e.draw(this, cam);

    if (this.flooded) this.drawBubbles(cam);

    this.drawHud();

    if (this.paused) {
      dim();
      textCenter('PAUSE', 66, 0);
      const rec = this.game.run.progress[this.def.id];
      if (rec && rec.cleared && !this.inBonus) textCenter('SELECT: LEAVE STAGE', 78, 0);
    }
  }

  drawBackdrop(cam) {
    // horizon band silhouettes; cheap parallax at half speed
    const off = Math.floor(cam.x / 2) % 32;
    if (this.flooded) {
      for (let y = 8; y < SCREEN_H; y += 24)
        for (let x = -off; x < SCREEN_W; x += 32) blit(SPR.splash, x, y + ((x / 32) % 2 ? 6 : 0));
      return;
    }
    const bandY = SCREEN_H - 52 - Math.floor(cam.y / 3) % 20;
    for (let x = -off; x < SCREEN_W + 32; x += 32) {
      fillRect(x, bandY, 18, 2, 1);
      fillRect(x + 8, bandY - 4, 10, 2, 1);
    }
  }

  drawBubbles(cam) {
    const t = this.frame;
    for (let i = 0; i < 4; i++) {
      const bx = ((i * 53 + t) % (SCREEN_W + 20)) - 10;
      const by = SCREEN_H - ((t * (0.3 + i * 0.1) + i * 40) % SCREEN_H);
      fillRect(bx, by, 2, 2, 1);
    }
  }

  drawHud() {
    const run = this.game.run;
    fillRect(0, 0, SCREEN_W, 9, 0);
    fillRect(0, 9, SCREEN_W, 1, 2);
    blit(run.activeHero === HERO.BRUNO ? SPR.hud_bruno : SPR.hud_pip, 2, 1);
    text('*' + run.lives, 11, 2, 3);
    blit(SPR.hud_banana, 34, 2);
    text(String(run.bananas).padStart(2, '0'), 41, 2, 3);
    // A-P-E-X letters
    const letters = ['A', 'P', 'E', 'X'];
    letters.forEach((ch, i) => {
      text(ch, 66 + i * 6, 2, this.lettersHere.has(ch) ? 3 : 1);
    });
    // medals
    blit(SPR.medal, 102, 1);
    text('' + run.medals, 113, 2, 3);
    // partner indicator
    if (run.heroesAlive === 2) {
      blit(run.activeHero === HERO.BRUNO ? SPR.hud_pip : SPR.hud_bruno, 130, 1);
    }
  }

  // ---------- test introspection ----------
  snapshot() {
    const p = this.player;
    return {
      stage: this.def.id, name: this.def.name, theme: this.theme,
      flooded: this.flooded, inBonus: this.inBonus, paused: this.paused, finished: this.finished,
      player: {
        x: +p.x.toFixed(1), y: +p.y.toFixed(1), vx: +p.vx.toFixed(2), vy: +p.vy.toFixed(2),
        state: p.state, hero: p.hero === HERO.BRUNO ? 'bruno' : 'pip',
        grounded: p.grounded, facing: p.facing, invuln: p.invuln,
        carrying: p.carrying ? p.carrying.type : null,
        riding: p.riding ? p.riding.type : null,
      },
      letters: [...this.lettersHere],
      boss: this.boss && this.boss.alive ? { type: this.boss.type, hp: this.boss.hp, state: this.boss.state, stompable: this.boss.stompable, deadly: this.boss.deadly, open: this.boss.open, dir: this.boss.dir, x: +this.boss.x.toFixed(1), y: +this.boss.y.toFixed(1) } : null,
      entities: this.entities.filter(e => e.alive && !e.invisible && e.kind !== 'fx')
        .slice(0, 80)
        .map(e => ({ t: e.type, k: e.kind, x: Math.round(e.x), y: Math.round(e.y) })),
      cam: { x: Math.round(this.cam.x), y: Math.round(this.cam.y) },
      size: { w: this.pxWidth, h: this.pxHeight },
    };
  }
}

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
