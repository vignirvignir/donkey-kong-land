import { Game } from './game.js';
import { initAudio, resumeAudio } from './audio.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('screen');
const game = new Game(canvas, { testMode: params.get('test') === '1' });

// audio requires a user gesture
window.addEventListener('pointerdown', () => { initAudio(); resumeAudio(); }, { once: false });
window.addEventListener('keydown', () => { initAudio(); resumeAudio(); }, { once: false });

window.__game = game;
