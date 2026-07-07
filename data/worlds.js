// World + stage registry. 4 worlds / 34 stages, mirroring the 1995 original's
// structure (9+boss, 7+boss, 7+boss, 7+boss) with original names & layouts.
import w1_1 from './levels/w1-1.js';
import w1_2 from './levels/w1-2.js';
import w1_3 from './levels/w1-3.js';
import w1_4 from './levels/w1-4.js';
import w1_5 from './levels/w1-5.js';
import w1_6 from './levels/w1-6.js';
import w1_7 from './levels/w1-7.js';
import w1_8 from './levels/w1-8.js';
import w1_9 from './levels/w1-9.js';
import w1_10 from './levels/w1-10.js';
import w2_1 from './levels/w2-1.js';
import w2_2 from './levels/w2-2.js';
import w2_3 from './levels/w2-3.js';
import w2_4 from './levels/w2-4.js';
import w2_5 from './levels/w2-5.js';
import w2_6 from './levels/w2-6.js';
import w2_7 from './levels/w2-7.js';
import w2_8 from './levels/w2-8.js';
import w3_1 from './levels/w3-1.js';
import w3_2 from './levels/w3-2.js';
import w3_3 from './levels/w3-3.js';
import w3_4 from './levels/w3-4.js';
import w3_5 from './levels/w3-5.js';
import w3_6 from './levels/w3-6.js';
import w3_7 from './levels/w3-7.js';
import w3_8 from './levels/w3-8.js';
import w4_1 from './levels/w4-1.js';
import w4_2 from './levels/w4-2.js';
import w4_3 from './levels/w4-3.js';
import w4_4 from './levels/w4-4.js';
import w4_5 from './levels/w4-5.js';
import w4_6 from './levels/w4-6.js';
import w4_7 from './levels/w4-7.js';
import w4_8 from './levels/w4-8.js';

const ALL = [
  w1_1, w1_2, w1_3, w1_4, w1_5, w1_6, w1_7, w1_8, w1_9, w1_10,
  w2_1, w2_2, w2_3, w2_4, w2_5, w2_6, w2_7, w2_8,
  w3_1, w3_2, w3_3, w3_4, w3_5, w3_6, w3_7, w3_8,
  w4_1, w4_2, w4_3, w4_4, w4_5, w4_6, w4_7, w4_8,
];

export const LEVELS = Object.fromEntries(ALL.map(l => [l.id, l]));

function stage(id) {
  const def = LEVELS[id];
  return { id, name: def.name, bonusCount: (def.bonus || []).length, boss: def.boss || null };
}

export const WORLDS = [
  {
    name: 'GALLEON GROVE',
    stages: ['w1-1', 'w1-2', 'w1-3', 'w1-4', 'w1-5', 'w1-6', 'w1-7', 'w1-8', 'w1-9', 'w1-10'].map(stage),
  },
  {
    name: 'SUNKEN RUINS',
    stages: ['w2-1', 'w2-2', 'w2-3', 'w2-4', 'w2-5', 'w2-6', 'w2-7', 'w2-8'].map(stage),
  },
  {
    name: 'PEAK + CLOUD PASS',
    stages: ['w3-1', 'w3-2', 'w3-3', 'w3-4', 'w3-5', 'w3-6', 'w3-7', 'w3-8'].map(stage),
  },
  {
    name: 'SKYLINE CITY',
    stages: ['w4-1', 'w4-2', 'w4-3', 'w4-4', 'w4-5', 'w4-6', 'w4-7', 'w4-8'].map(stage),
  },
];
