// World map: node paths per world, stage select, unlock logic, "!" marks.
import { BTN, SCREEN_W, SCREEN_H, HERO } from './constants.js';
import { input } from './input.js';
import { clear, fillRect, text, textCenter, blit, rectOutline } from './renderer.js';
import { SPR } from './sprites.js';
import { sfx, playMusic } from './audio.js';
import { SONGS } from './music.js';
import { WORLDS } from '../data/worlds.js';

export class WorldMap {
  constructor(game, worldIdx = 0, nodeIdx = 0) {
    this.game = game;
    this.world = worldIdx;
    this.node = nodeIdx;
    this.t = 0;
    playMusic('map', SONGS.map);
  }

  stages() { return WORLDS[this.world].stages; }

  stageUnlocked(w, i) {
    if (this.game.testUnlockAll) return true;
    const run = this.game.run;
    if (i === 0) return this.worldUnlocked(w);
    const prev = WORLDS[w].stages[i - 1];
    return !!(run.progress[prev.id] && run.progress[prev.id].cleared);
  }

  worldUnlocked(w) {
    if (this.game.testUnlockAll) return true;
    if (w === 0) return true;
    const bossStage = WORLDS[w - 1].stages[WORLDS[w - 1].stages.length - 1];
    return !!(this.game.run.progress[bossStage.id] && this.game.run.progress[bossStage.id].cleared);
  }

  // winding node positions along a path
  nodePos(i) {
    const n = this.stages().length;
    const x = 20 + (i % 5) * 30;
    const row = Math.floor(i / 5);
    const xx = row % 2 ? 140 - (i % 5) * 30 : x;
    return { x: xx, y: 44 + row * 26 };
  }

  update() {
    this.t++;
    const stages = this.stages();
    if (input.pressed(BTN.RIGHT) || input.pressed(BTN.DOWN)) {
      if (this.node < stages.length - 1 && this.stageUnlocked(this.world, this.node + 1)) { this.node++; sfx.tick(); }
      else if (this.node === stages.length - 1 && this.worldUnlocked(this.world + 1) && this.world < WORLDS.length - 1) {
        this.world++; this.node = 0; sfx.select();
      }
    }
    if (input.pressed(BTN.LEFT) || input.pressed(BTN.UP)) {
      if (this.node > 0) { this.node--; sfx.tick(); }
      else if (this.world > 0) {
        this.world--; this.node = WORLDS[this.world].stages.length - 1; sfx.select();
      }
    }
    if (input.pressed(BTN.A) || input.pressed(BTN.START)) {
      const st = stages[this.node];
      if (this.stageUnlocked(this.world, this.node)) {
        sfx.select();
        this.game.startStage(this.world, this.node);
      }
    }
  }

  draw() {
    clear(0);
    const w = WORLDS[this.world];
    fillRect(0, 0, SCREEN_W, 20, 3);
    textCenter(w.name, 4, 0);
    text('WORLD ' + (this.world + 1) + '/4', 4, 13, 0);
    const run = this.game.run;
    // path edges
    const stages = this.stages();
    for (let i = 0; i < stages.length - 1; i++) {
      const a = this.nodePos(i), b = this.nodePos(i + 1);
      const steps = 8;
      for (let s = 0; s <= steps; s++) {
        const x = a.x + (b.x - a.x) * s / steps, y = a.y + (b.y - a.y) * s / steps;
        if (s % 2 === 0) fillRect(Math.round(x), Math.round(y), 2, 2, 2);
      }
    }
    // nodes
    stages.forEach((st, i) => {
      const p = this.nodePos(i);
      const rec = run.progress[st.id];
      const unlocked = this.stageUnlocked(this.world, i);
      const boss = i === stages.length - 1;
      fillRect(p.x - 5, p.y - 5, 12, 12, unlocked ? (rec && rec.cleared ? 2 : 3) : 1);
      rectOutline(p.x - 5, p.y - 5, 12, 12, 3);
      if (boss) rectOutline(p.x - 7, p.y - 7, 16, 16, unlocked ? 3 : 1);
      if (rec && rec.cleared) {
        const total = st.bonusCount || 0;
        const found = rec.bonus ? rec.bonus.length : 0;
        text(total > 0 && found >= total ? '!' : '.', p.x - 1, p.y - 2, 0);
      }
    });
    // hero marker
    const hp = this.nodePos(this.node);
    const bob = Math.sin(this.t / 12) * 1.5;
    blit(run.activeHero === HERO.BRUNO ? SPR.hud_bruno : SPR.hud_pip, hp.x - 3, hp.y - 16 + bob);

    // footer: stage name + lives
    fillRect(0, SCREEN_H - 20, SCREEN_W, 20, 3);
    const st = stages[this.node];
    const locked = !this.stageUnlocked(this.world, this.node);
    textCenter(locked ? '? ? ?' : st.name, SCREEN_H - 16, 0);
    text('*' + run.lives, 4, SCREEN_H - 8, 0);
    const totalMedals = run.medals;
    text('MEDALS:' + totalMedals, 60, SCREEN_H - 8, 0);
  }

  snapshot() {
    return {
      world: this.world, node: this.node,
      stage: this.stages()[this.node].id,
      unlocked: this.stageUnlocked(this.world, this.node),
    };
  }
}
