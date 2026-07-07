// Top-level state machine, fixed-timestep loop, save flow, test hooks.
import { START_LIVES, HERO, BTN, SCREEN_W } from './constants.js';
import { attachInput, latchInput, input } from './input.js';
import { initRenderer, present, clear, textCenter, text, fillRect, rectOutline, blit } from './renderer.js';
import { buildTiles } from './tiles.js';
import { SPR } from './sprites.js';
import { Level } from './level.js';
import { WorldMap } from './worldmap.js';
import { Title } from './title.js';
import { BonusGame } from './bonus.js';
import { WORLDS, LEVELS } from '../data/worlds.js';
import { loadSave, writeSave } from './save.js';
import { sfx, playMusic, stopMusic, initAudio, setMuted, audioBooted, musicPlaying } from './audio.js';
import { SONGS } from './music.js';

function freshRun() {
  return {
    lives: START_LIVES,
    bananas: 0,
    medals: 0,
    heroesAlive: 2,
    activeHero: HERO.BRUNO,
    progress: {},   // stageId -> {cleared, bonus:[indices], letters}
    checkpoint: null,
    world: 0,
    node: 0,
  };
}

class SaveScreen {
  constructor(game) { this.game = game; this.idx = 0; this.t = 0; }
  update() {
    this.t++;
    if (input.pressed(BTN.LEFT) || input.pressed(BTN.RIGHT) || input.pressed(BTN.UP) || input.pressed(BTN.DOWN)) {
      this.idx = 1 - this.idx; sfx.tick();
    }
    if (input.pressed(BTN.A) || input.pressed(BTN.START)) {
      if (this.idx === 0) { this.game.saveNow(); sfx.medal(); }
      else sfx.select();
      this.game.afterSaveScreen();
    }
  }
  draw() {
    clear(0);
    rectOutline(10, 30, SCREEN_W - 20, 70, 3);
    textCenter('YOU FOUND A-P-E-X!', 40, 3);
    textCenter('SAVE YOUR JOURNEY?', 52, 3);
    textCenter((this.idx === 0 ? '> ' : '  ') + 'YES' + (this.idx === 0 ? ' <' : ''), 70, 3);
    textCenter((this.idx === 1 ? '> ' : '  ') + 'NO' + (this.idx === 1 ? ' <' : ''), 82, 3);
  }
  snapshot() { return { screen: 'save', idx: this.idx }; }
}

export class Game {
  constructor(canvas, opts = {}) {
    this.testMode = !!opts.testMode;
    this.debug = false;
    this.run = freshRun();
    this.screen = null;
    this.pendingAfterStage = null;
    this.bonusStack = null;
    this.testUnlockAll = false;
    this.frameCount = 0;
    let seed = 1234567;
    this.rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 0xffffffff; };

    initRenderer(canvas);
    buildTiles();
    attachInput();
    if (this.testMode) setMuted(true);

    this.toTitle();
    this.installHooks();

    // fixed-timestep loop
    this.acc = 0;
    this.last = performance.now();
    this.running = !this.testMode;
    const loop = (now) => {
      requestAnimationFrame(loop);
      if (!this.running) { this.draw(); present(); return; }
      this.acc += Math.min(100, now - this.last);
      this.last = now;
      while (this.acc >= 1000 / 60) {
        this.tick();
        this.acc -= 1000 / 60;
      }
      this.draw();
      present();
    };
    requestAnimationFrame(loop);
  }

  tick() {
    this.frameCount++;
    if (this.screen) this.screen.update();
    latchInput();
  }
  draw() { if (this.screen) this.screen.draw(); }

  // ---------- navigation ----------
  toTitle() {
    stopMusic();
    this.screen = new Title(this);
  }
  newGame() {
    this.run = freshRun();
    this.toMap(0, 0);
  }
  continueGame() {
    const s = loadSave();
    this.run = freshRun();
    if (s) {
      this.run.progress = s.progress || {};
      this.run.lives = s.lives ?? START_LIVES;
      this.run.medals = s.medals ?? 0;
      this.run.world = s.world ?? 0;
      this.run.node = s.node ?? 0;
    }
    this.toMap(this.run.world, this.run.node);
  }
  toMap(world, node) {
    stopMusic();
    this.run.heroesAlive = 2;
    this.run.checkpoint = null;
    this.screen = new WorldMap(this, world ?? this.run.world, node ?? this.run.node);
  }
  exitToMap() { this.toMap(this.run.world, this.run.node); }

  stageDef(world, node) {
    const st = WORLDS[world].stages[node];
    return LEVELS[st.id];
  }

  startStage(world, node, fromCheckpoint = false) {
    const def = this.stageDef(world, node);
    if (!def) return;
    this.run.world = world;
    this.run.node = node;
    if (!fromCheckpoint || !this.run.checkpoint || this.run.checkpoint.stage !== def.id) {
      this.run.checkpoint = null;
    }
    this.run.heroesAlive = 2;
    stopMusic();
    this.screen = new Level(this, def, { fromCheckpoint });
  }

  // ---------- in-stage flow ----------
  enterBonusRoom(parentLv, i) {
    const bonusDef = parentLv.def.bonus && parentLv.def.bonus[i];
    if (!bonusDef) return;
    this.bonusStack = { parent: parentLv, returnPos: { x: parentLv.player.x, y: parentLv.player.y } };
    const def = {
      id: parentLv.def.id + '-b' + i, name: 'BONUS!', theme: parentLv.def.theme,
      rows: bonusDef.rows, flooded: !!bonusDef.flooded,
    };
    this.screen = new Level(this, def, { isBonus: true, parent: parentLv });
    sfx.cannon();
  }
  exitBonus() {
    const bs = this.bonusStack;
    if (!bs) return;
    this.bonusStack = null;
    const lv = bs.parent;
    lv.player.x = bs.returnPos.x;
    lv.player.y = bs.returnPos.y - 4;
    lv.player.vx = 0; lv.player.vy = 0;
    lv.player.invuln = Math.max(lv.player.invuln, 30);
    this.screen = lv;
    stopMusic();
    const name = lv.def.boss ? 'boss' : lvThemeSong(lv.theme);
    playMusic(name, SONGS[name]);
  }

  stageCleared(lv) {
    const id = lv.def.id;
    const rec = this.run.progress[id] || (this.run.progress[id] = { cleared: false, bonus: [] });
    rec.cleared = true;
    const gotAllLetters = ['A', 'P', 'E', 'X'].every(c => lv.lettersHere.has(c));
    // advance map cursor
    const stages = WORLDS[this.run.world].stages;
    const nextNode = Math.min(this.run.node + 1, stages.length - 1);
    this.pendingAfterStage = { gotAllLetters, nextNode };
    // brief clear pause then flow
    this.screen = new StageClear(this, lv);
  }

  afterStageFlow() {
    const p = this.pendingAfterStage;
    if (!p) { this.toMap(this.run.world, this.run.node); return; }
    this.run.node = p.nextNode;
    if (this.run.medals > 0) { this.screen = new BonusGame(this); return; }
    this.afterBonusGame();
  }
  afterBonusGame() {
    const p = this.pendingAfterStage;
    if (p && p.gotAllLetters) { this.screen = new SaveScreen(this); return; }
    this.afterSaveScreen();
  }
  afterSaveScreen() {
    this.pendingAfterStage = null;
    this.toMap(this.run.world, this.run.node);
  }

  saveNow() {
    writeSave({
      progress: this.run.progress,
      lives: this.run.lives,
      medals: this.run.medals,
      world: this.run.world,
      node: this.run.node,
    });
  }

  playerDied(lv) {
    if (this.bonusStack) {
      // dying in a bonus room returns you to the main stage
      this.bonusStack = null;
    }
    this.run.lives--;
    this.run.heroesAlive = 2;
    if (this.run.lives < 0) {
      const t = new Title(this);
      t.mode = 'gameover';
      t.t = 0;
      stopMusic();
      playMusic('gameover', SONGS.gameover);
      this.screen = t;
      this.run = freshRun();
      return;
    }
    const hasCheckpoint = this.run.checkpoint && this.run.checkpoint.stage === this.stageDef(this.run.world, this.run.node)?.id;
    this.startStage(this.run.world, this.run.node, hasCheckpoint);
  }

  finalBossDefeated(lv) {
    const id = lv.def.id;
    const rec = this.run.progress[id] || (this.run.progress[id] = { cleared: false, bonus: [] });
    rec.cleared = true;
    this.saveNow();
    stopMusic();
    playMusic('victory', SONGS.victory);
    const t = new Title(this);
    t.mode = 'victory';
    t.t = 0;
    this.screen = t;
  }

  // ---------- verification hooks ----------
  installHooks() {
    const g = this;
    window.__gl = {
      version: 1,
      step(n = 1) {
        for (let i = 0; i < n; i++) g.tick();
        g.draw(); present();
        return g.snapshot();
      },
      state() { return g.snapshot(); },
      input: {
        hold: (b) => input.hold(b),
        release: (b) => input.release(b),
        tap(b, frames = 2) { input.hold(b); window.__gl.step(frames); input.release(b); window.__gl.step(1); },
        clear: () => input.clearAll(),
      },
      run(on = true) { g.running = on; g.last = performance.now(); g.acc = 0; },
      warp(world, node) {
        g.testUnlockAll = true;
        if (!(g.screen instanceof Level) && !(g.screen instanceof WorldMap)) g.newGame();
        g.startStage(world, node, false);
        return g.snapshot();
      },
      toMap(world = 0, node = 0) { g.testUnlockAll = true; g.toMap(world, node); return g.snapshot(); },
      newGame() { g.newGame(); return g.snapshot(); },
      title() { g.toTitle(); return g.snapshot(); },
      give(o = {}) {
        if (o.lives != null) g.run.lives = o.lives;
        if (o.medals != null) g.run.medals = o.medals;
        if (o.bananas != null) g.run.bananas = o.bananas;
        return g.snapshot();
      },
      setHero(name) {
        g.run.activeHero = name === 'pip' ? HERO.PIP : HERO.BRUNO;
        if (g.screen instanceof Level) g.screen.player.hero = g.run.activeHero;
        return g.snapshot();
      },
      setPos(x, y) {
        if (g.screen instanceof Level) { g.screen.player.x = x; g.screen.player.y = y; g.screen.player.vx = 0; g.screen.player.vy = 0; }
        return g.snapshot();
      },
      unlockAll(v = true) { g.testUnlockAll = v; },
      spawn(ch, tileX, tileY) {
        if (g.screen instanceof Level) return !!g.screen.spawnChar(ch, tileX * 16, tileY * 16);
        return false;
      },
      // tile physics class at tile coords: 0 empty, 1 solid, 2 platform,
      // 3 rope, 4 spike, 5 water, 6 cracked; -1 when not in a level
      tile(tx, ty) {
        if (g.screen instanceof Level) return g.screen.tileClassAt(tx, ty);
        return -1;
      },
      dims() {
        if (g.screen instanceof Level) return { W: g.screen.W, H: g.screen.H };
        return null;
      },
      levels() { return Object.keys(LEVELS); },
      worlds() { return WORLDS.map(w => ({ name: w.name, stages: w.stages.map(s => s.id) })); },
      audio: { booted: () => audioBooted(), playing: () => musicPlaying() },
    };
  }

  snapshot() {
    const base = {
      frame: this.frameCount,
      lives: this.run.lives,
      bananas: this.run.bananas,
      medals: this.run.medals,
      heroesAlive: this.run.heroesAlive,
      activeHero: this.run.activeHero === HERO.BRUNO ? 'bruno' : 'pip',
      world: this.run.world,
      node: this.run.node,
      checkpoint: this.run.checkpoint,
      progress: this.run.progress,
    };
    if (this.screen instanceof Level) return { ...base, screen: this.screen.inBonus ? 'bonusRoom' : 'level', ...this.screen.snapshot() };
    if (this.screen && this.screen.snapshot) return { ...base, ...this.screen.snapshot() };
    return base;
  }
}

class StageClear {
  constructor(game, lv) { this.game = game; this.lv = lv; this.t = 0; }
  update() {
    this.t++;
    if (this.t > 100 || (this.t > 30 && (input.pressed(BTN.A) || input.pressed(BTN.START)))) {
      this.game.afterStageFlow();
    }
  }
  draw() {
    this.lv.draw();
    fillRect(20, 56, SCREEN_W - 40, 30, 0);
    rectOutline(20, 56, SCREEN_W - 40, 30, 3);
    textCenter('STAGE CLEAR!', 64, 3);
    const l = this.lv.lettersHere;
    textCenter(['A', 'P', 'E', 'X'].map(c => l.has(c) ? c : '-').join(' '), 74, 3);
  }
  snapshot() { return { screen: 'stageClear' }; }
}

function lvThemeSong(theme) {
  const map = { jungle: 'jungle', snow: 'snow', ship: 'snow', temple: 'temple', reef: 'water', mountain: 'mountain', sky: 'sky', city: 'city' };
  return map[theme] || 'jungle';
}
