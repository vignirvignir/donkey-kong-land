// Game Boy-flavored 4-channel WebAudio synth: 2 pulse, 1 "wave" (triangle), 1 noise.
// All music and SFX are original compositions.

let ctx = null;
let masterGain = null;
let muted = false;
let booted = false;

export function audioBooted() { return booted; }
export function setMuted(m) { muted = m; if (masterGain) masterGain.gain.value = m ? 0 : 0.28; }

export function initAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 0.28;
    masterGain.connect(ctx.destination);
    booted = true;
  } catch (e) { ctx = null; }
}

export function resumeAudio() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

const NOTE_BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteFreq(token) {
  // e.g. "C4", "F#3", "Eb5"
  const m = /^([A-G])([#b]?)(\d)$/.exec(token);
  if (!m) return 0;
  let semi = NOTE_BASE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const oct = parseInt(m[3], 10);
  const midi = (oct + 1) * 12 + semi;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

let noiseBuffer = null;
function getNoiseBuffer() {
  if (noiseBuffer) return noiseBuffer;
  const len = ctx.sampleRate * 0.5;
  noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = noiseBuffer.getChannelData(0);
  // LFSR-ish crunchy noise
  let lfsr = 0x7fff;
  for (let i = 0; i < len; i++) {
    if (i % 8 === 0) {
      const bit = ((lfsr >> 0) ^ (lfsr >> 1)) & 1;
      lfsr = (lfsr >> 1) | (bit << 14);
    }
    d[i] = (lfsr & 1) ? 0.5 : -0.5;
  }
  return noiseBuffer;
}

function voice(type, freq, t0, dur, vol, slide = 0) {
  if (!ctx || muted) return;
  const g = ctx.createGain();
  g.connect(masterGain);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  if (type === 'noise') {
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer();
    src.loop = true;
    src.playbackRate.value = freq / 440;
    src.connect(g);
    src.start(t0); src.stop(t0 + dur);
  } else {
    const o = ctx.createOscillator();
    o.type = type; // 'square' | 'triangle'
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    o.connect(g);
    o.start(t0); o.stop(t0 + dur);
  }
}

// ---------------- music sequencer ----------------
// Song: { tempo: sixteenth-notes per minute, loop: bool, tracks: {p1,p2,wave,noise} }
// Track string: whitespace-separated tokens per 16th: note ("C4"), "." hold, "-" rest.
let current = null;
let timer = null;
let pos = 0;
let nextTime = 0;
let currentName = '';

export function musicPlaying() { return currentName; }

export function playMusic(name, song) {
  if (!ctx) { currentName = name; current = song; return; }
  if (currentName === name && timer) return;
  stopMusic();
  currentName = name;
  current = {
    ...song,
    parsed: Object.fromEntries(Object.entries(song.tracks).map(([k, v]) => [k, v.trim().split(/\s+/)])),
  };
  pos = 0;
  nextTime = ctx.currentTime + 0.05;
  timer = setInterval(schedule, 60);
  schedule();
}

export function stopMusic() {
  if (timer) clearInterval(timer);
  timer = null; current = null; currentName = '';
}

const CH_CONF = {
  p1: { type: 'square', vol: 0.30 },
  p2: { type: 'square', vol: 0.18 },
  wave: { type: 'triangle', vol: 0.42 },
  noise: { type: 'noise', vol: 0.14 },
};

function schedule() {
  if (!current || !ctx) return;
  const step = 60 / current.tempo; // seconds per 16th
  const len = Math.max(...Object.values(current.parsed).map(t => t.length));
  while (nextTime < ctx.currentTime + 0.25) {
    for (const [ch, track] of Object.entries(current.parsed)) {
      const tok = track[pos % track.length];
      if (!tok || tok === '.' || tok === '-') continue;
      const conf = CH_CONF[ch];
      // count holds ahead for duration
      let holds = 1;
      while (track[(pos + holds) % track.length] === '.' && holds < 16) holds++;
      const freq = ch === 'noise' ? (tok === 'x' ? 800 : tok === 'X' ? 300 : 500) : noteFreq(tok);
      if (freq > 0 || ch === 'noise') voice(conf.type, freq || 400, nextTime, step * holds * 0.9, conf.vol);
    }
    pos++;
    if (pos >= len && !current.loop) { stopMusic(); return; }
    nextTime += step;
  }
}

// ---------------- SFX ----------------
export const sfx = {};
function def(name, fn) { sfx[name] = () => { if (ctx && !muted) fn(ctx.currentTime); }; }

def('jump',    (t) => voice('square', 300, t, 0.12, 0.2, 300));
def('bounce',  (t) => voice('square', 200, t, 0.15, 0.22, 500));
def('roll',    (t) => voice('noise', 300, t, 0.15, 0.12));
def('land',    (t) => voice('noise', 200, t, 0.06, 0.10));
def('banana',  (t) => { voice('square', 880, t, 0.05, 0.16); voice('square', 1320, t + 0.05, 0.08, 0.16); });
def('letter',  (t) => { [660, 880, 1100, 1320].forEach((f, i) => voice('square', f, t + i * 0.06, 0.09, 0.18)); });
def('medal',   (t) => { [520, 780, 1040].forEach((f, i) => voice('triangle', f, t + i * 0.05, 0.12, 0.3)); });
def('stomp',   (t) => { voice('noise', 500, t, 0.1, 0.16); voice('square', 150, t, 0.1, 0.18, -80); });
def('hurt',    (t) => { voice('square', 400, t, 0.25, 0.2, -300); voice('noise', 200, t, 0.2, 0.12); });
def('die',     (t) => { voice('square', 500, t, 0.5, 0.2, -450); });
def('throw',   (t) => voice('noise', 600, t, 0.1, 0.12));
def('break',   (t) => { voice('noise', 250, t, 0.2, 0.16); voice('square', 120, t, 0.15, 0.14, -60); });
def('splash',  (t) => voice('noise', 900, t, 0.25, 0.12));
def('swim',    (t) => voice('noise', 1200, t, 0.08, 0.06));
def('cannon',  (t) => { voice('noise', 350, t, 0.25, 0.2); voice('square', 180, t, 0.2, 0.2, 500); });
def('oneup',   (t) => { [523, 659, 784, 1046, 1318].forEach((f, i) => voice('square', f, t + i * 0.07, 0.1, 0.2)); });
def('bosshit', (t) => { voice('square', 220, t, 0.3, 0.22, -150); voice('noise', 300, t, 0.25, 0.15); });
def('checkpoint', (t) => { [440, 660].forEach((f, i) => voice('square', f, t + i * 0.08, 0.12, 0.18)); });
def('select',  (t) => voice('square', 700, t, 0.05, 0.15));
def('pause',   (t) => { voice('square', 900, t, 0.06, 0.15); voice('square', 600, t + 0.07, 0.08, 0.15); });
def('tick',    (t) => voice('square', 1000, t, 0.03, 0.1));
def('crown',   (t) => voice('square', 500, t, 0.2, 0.15, 250));
