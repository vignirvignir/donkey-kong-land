// Title screen, menu, story intro, game over, victory/credits.
import { BTN, SCREEN_W, SCREEN_H } from './constants.js';
import { input } from './input.js';
import { clear, fillRect, text, textCenter, blit, dim, rectOutline } from './renderer.js';
import { SPR } from './sprites.js';
import { sfx, playMusic, stopMusic, initAudio, resumeAudio } from './audio.js';
import { SONGS } from './music.js';
import { loadSave, clearSave } from './save.js';

const STORY = [
  ['ONE LAZY AFTERNOON,', 'OLD GRAMPY SCOFFED:', '', '"BAH! YOUR LAST QUEST', 'WAS ALL FANCY PIXELS!', 'YOU TWO COULD NEVER', 'DO IT ON A WEE', 'HANDHELD SCREEN!"'],
  ['BRUNO AND PIP TOOK', 'THE DARE.', '', 'SO GRAMPY TIPPED OFF', 'KING SNAPJAW, WHO', 'GLEEFULLY SWIPED THE', 'BANANA HOARD AND HID', 'IT ACROSS THE ISLAND.'],
  ['NOW THE TWO HEROES', 'MUST CROSS 4 WILD', 'LANDS, BEAT SNAPJAW,', 'AND WIN BACK EVERY', 'LAST BANANA...', '', 'ON ONE SMALL SCREEN.', 'GOOD LUCK!'],
];

export class Title {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.mode = 'title'; // title | menu | story | gameover | victory
    this.menuIdx = 0;
    this.storyPage = 0;
    this.hasSave = !!loadSave();
    playMusic('title', SONGS.title);
  }

  update() {
    this.t++;
    if (this.mode === 'title') {
      if (input.pressed(BTN.START) || input.pressed(BTN.A)) {
        initAudio(); resumeAudio();
        this.hasSave = !!loadSave();
        this.mode = 'menu';
        this.menuIdx = 0;
        sfx.select();
      }
      return;
    }
    if (this.mode === 'menu') {
      const items = this.menuItems();
      if (input.pressed(BTN.UP)) { this.menuIdx = (this.menuIdx + items.length - 1) % items.length; sfx.tick(); }
      if (input.pressed(BTN.DOWN)) { this.menuIdx = (this.menuIdx + 1) % items.length; sfx.tick(); }
      if (input.pressed(BTN.START) || input.pressed(BTN.A)) {
        const item = items[this.menuIdx];
        sfx.select();
        if (item === 'NEW GAME') { this.mode = 'story'; this.storyPage = 0; }
        else if (item === 'CONTINUE') { this.game.continueGame(); }
        else if (item === 'ERASE SAVE') { clearSave(); this.hasSave = false; this.menuIdx = 0; }
      }
      return;
    }
    if (this.mode === 'story') {
      if (input.pressed(BTN.START)) { this.game.newGame(); return; }
      if (input.pressed(BTN.A)) {
        this.storyPage++;
        sfx.tick();
        if (this.storyPage >= STORY.length) this.game.newGame();
      }
      return;
    }
    if (this.mode === 'gameover') {
      if (this.t > 90 && (input.pressed(BTN.START) || input.pressed(BTN.A))) {
        this.game.toTitle();
      }
      return;
    }
    if (this.mode === 'victory') {
      if (this.t > 180 && (input.pressed(BTN.START) || input.pressed(BTN.A))) {
        this.game.toTitle();
      }
      return;
    }
  }

  menuItems() {
    return this.hasSave ? ['CONTINUE', 'NEW GAME', 'ERASE SAVE'] : ['NEW GAME'];
  }

  draw() {
    clear(0);
    if (this.mode === 'gameover') {
      clear(3);
      textCenter('GAME OVER', 60, 0);
      if (this.t > 90) textCenter('PRESS START', 90, this.t % 40 < 25 ? 0 : 3);
      return;
    }
    if (this.mode === 'victory') {
      clear(0);
      textCenter('THE HOARD IS SAFE!', 28, 3);
      blit(SPR.bruno_idle, 46, 44);
      blit(SPR.pip_idle, 84, 48, true);
      blit(SPR.bunch, 110, 52);
      textCenter('KING SNAPJAW IS BEATEN', 78, 3);
      textCenter('AND GRAMPY ADMITS:', 86, 3);
      textCenter('"NOT BAD, YOUNGSTERS."', 96, 3);
      textCenter('A GAME BOY STYLE TRIBUTE', 112, 2);
      textCenter('ALL ORIGINAL PIXELS + TUNES', 120, 2);
      if (this.t > 180) textCenter('PRESS START', 132, this.t % 40 < 25 ? 3 : 1);
      return;
    }
    if (this.mode === 'story') {
      const page = STORY[Math.min(this.storyPage, STORY.length - 1)];
      rectOutline(6, 14, SCREEN_W - 12, 100, 3);
      page.forEach((line, i) => textCenter(line, 24 + i * 9, 3));
      textCenter('A: NEXT  START: SKIP', 126, 2);
      return;
    }
    // title / menu
    fillRect(0, 0, SCREEN_W, SCREEN_H, 0);
    // logo
    fillRect(14, 18, SCREEN_W - 28, 34, 3);
    rectOutline(12, 16, SCREEN_W - 24, 38, 3);
    textCenter('GORILLA', 24, 0);
    textCenter('LAND', 36, 0);
    text('TM NOT', 132, 46, 0); // wink: decidedly not a trademark
    blit(SPR.bruno_walk1, 30, 62);
    blit(SPR.pip_walk1, 104, 66, true);
    blit(SPR.banana, 78, 70);
    if (this.mode === 'title') {
      if (this.t % 50 < 32) textCenter('PRESS START', 96, 3);
      textCenter('AN ORIGINAL TRIBUTE TO THE', 116, 2);
      textCenter('1995 MONOCHROME CLASSIC', 124, 2);
      textCenter('ALL ART + MUSIC MADE FRESH', 132, 2);
    } else {
      const items = this.menuItems();
      items.forEach((it, i) => {
        textCenter((i === this.menuIdx ? '> ' : '  ') + it + (i === this.menuIdx ? ' <' : '  '), 96 + i * 10, 3);
      });
    }
  }

  snapshot() { return { screen: 'title', mode: this.mode, menuIdx: this.menuIdx }; }
}
