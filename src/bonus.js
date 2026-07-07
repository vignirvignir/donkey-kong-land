// End-of-stage slot-machine bonus game: spend Ape Medals for extra lives.
import { BTN, SCREEN_W, SCREEN_H } from './constants.js';
import { input } from './input.js';
import { clear, fillRect, text, textCenter, blit, rectOutline } from './renderer.js';
import { SPR } from './sprites.js';
import { sfx, playMusic } from './audio.js';
import { SONGS } from './music.js';

const SYMBOLS = ['bruno', 'pip', 'banana', 'snapper'];
const SYM_SPR = { bruno: 'hud_bruno', pip: 'hud_pip', banana: 'hud_banana', snapper: 'nibbles' };

export class BonusGame {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.reels = [0, 0, 0];
    this.spinning = [false, false, false];
    this.stopIdx = 0;
    this.state = 'ask'; // ask | spin | result | done
    this.msg = '';
    this.rng = () => game.rng();
    playMusic('bonus', SONGS.bonus);
  }

  startSpin() {
    this.game.run.medals--;
    this.state = 'spin';
    this.spinning = [true, true, true];
    this.stopIdx = 0;
    sfx.select();
  }

  update() {
    this.t++;
    const run = this.game.run;
    if (this.state === 'ask') {
      if (input.pressed(BTN.A)) {
        if (run.medals > 0) this.startSpin();
        else this.state = 'done';
      } else if (input.pressed(BTN.B) || input.pressed(BTN.START)) {
        this.state = 'done';
      }
      return;
    }
    if (this.state === 'spin') {
      for (let i = 0; i < 3; i++) {
        if (this.spinning[i] && this.t % 4 === 0) this.reels[i] = (this.rng() * SYMBOLS.length) | 0;
      }
      if (input.pressed(BTN.A)) {
        this.spinning[this.stopIdx] = false;
        this.stopIdx++;
        sfx.tick();
        if (this.stopIdx >= 3) {
          this.resolve();
        }
      }
      return;
    }
    if (this.state === 'result') {
      if (this.t - this.resultT > 50 && (input.pressed(BTN.A) || input.pressed(BTN.START))) {
        this.state = run.medals > 0 ? 'ask' : 'done';
      }
      return;
    }
    if (this.state === 'done') {
      this.game.afterBonusGame();
    }
  }

  resolve() {
    const [a, b, c] = this.reels;
    const run = this.game.run;
    let won = 0;
    if (a === b && b === c) won = SYMBOLS[a] === 'snapper' ? 0 : 2;
    else if (a === b || b === c || a === c) won = 1;
    if (won > 0) { run.lives += won; sfx.oneup(); this.msg = won + ' EXTRA LIFE' + (won > 1 ? 'S!' : '!'); }
    else { this.msg = 'NO LUCK...'; sfx.land(); }
    this.state = 'result';
    this.resultT = this.t;
  }

  draw() {
    clear(0);
    fillRect(0, 0, SCREEN_W, 16, 3);
    textCenter('BONUS: MEDAL SLOTS', 5, 0);
    const run = this.game.run;
    blit(SPR.medal, 30, 24);
    text('X ' + run.medals, 44, 26, 3);
    text('*' + run.lives, 100, 26, 3);

    // reels
    for (let i = 0; i < 3; i++) {
      const x = 34 + i * 32;
      rectOutline(x - 2, 52, 26, 26, 3);
      fillRect(x - 1, 53, 24, 24, this.spinning[i] && this.t % 8 < 4 ? 1 : 0);
      const spr = SPR[SYM_SPR[SYMBOLS[this.reels[i]]]];
      blit(spr, x + 11 - Math.floor(spr.w / 2), 64 - Math.floor(spr.h / 2));
    }

    if (this.state === 'ask') {
      textCenter(run.medals > 0 ? 'SPEND 1 MEDAL TO SPIN?' : 'NO MEDALS LEFT', 92, 3);
      textCenter(run.medals > 0 ? 'A: SPIN   B: LEAVE' : 'A: LEAVE', 104, 2);
    } else if (this.state === 'spin') {
      textCenter('A: STOP REEL ' + (this.stopIdx + 1), 92, 3);
      textCenter('MATCH 3: +2  PAIR: +1', 104, 2);
    } else if (this.state === 'result') {
      textCenter(this.msg, 92, 3);
      textCenter('A: CONTINUE', 104, 2);
    }
  }

  snapshot() { return { screen: 'bonusGame', state: this.state, medals: this.game.run.medals }; }
}
