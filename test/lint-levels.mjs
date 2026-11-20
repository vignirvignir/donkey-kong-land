// Static validator for all stage data. Run: node test/lint-levels.mjs
import { LEVELS, WORLDS } from '../data/worlds.js';

const VALID = new Set('.#=|^~w?SD!APEXoOMLBbTc<>Rt@$123KUGWQZVvNJfgyFpHxmud*&k-/:'.split(''));
const THEMES = new Set(['jungle', 'snow', 'ship', 'temple', 'reef', 'mountain', 'sky', 'city']);
const STANDABLE = new Set(['#', '=', '-', '/', ':', 't', 'c', '<', '>', 'R', '|', '~', 'w', '?']);

let errors = 0, warnings = 0;
const err = (id, msg) => { console.error(`ERROR ${id}: ${msg}`); errors++; };
const warn = (id, msg) => { console.warn(`warn  ${id}: ${msg}`); warnings++; };

function count(rows, ch) {
  let n = 0;
  for (const r of rows) for (const c of r) if (c === ch) n++;
  return n;
}
function find(rows, ch) {
  const out = [];
  rows.forEach((r, y) => { [...r].forEach((c, x) => { if (c === ch) out.push({ x, y }); }); });
  return out;
}
function charAt(rows, x, y) {
  if (y < 0 || y >= rows.length) return '.';
  return rows[y][x] || '.';
}
function hasSolidBelow(rows, x, y, depth) {
  for (let d = 1; d <= depth; d++) {
    const c = charAt(rows, x, y + d);
    if (c === '#' || c === '=' || c === '?') return true;
  }
  return false;
}

function lintRoom(id, rows, { isBonus = false, isBoss = false, flooded = false } = {}) {
  const W = Math.max(...rows.map(r => r.length));
  const H = rows.length;

  for (let y = 0; y < H; y++) for (const c of rows[y]) {
    if (!VALID.has(c)) err(id, `invalid char '${c}' at row ${y}`);
  }

  const s = count(rows, 'S');
  if (s !== 1) err(id, `expected exactly 1 'S', found ${s}`);
  const d = count(rows, 'D');
  if (!isBoss && d !== 1) err(id, `expected exactly 1 'D', found ${d}`);
  if (isBoss && d !== 0) err(id, `boss stages spawn their own portal; remove 'D'`);

  for (const pos of find(rows, 'D')) {
    if (!hasSolidBelow(rows, pos.x, pos.y, 3)) err(id, `'D' at (${pos.x},${pos.y}) has no solid ground within 3 tiles below`);
  }
  for (const pos of find(rows, 'S')) {
    if (!flooded && !hasSolidBelow(rows, pos.x, pos.y, 8)) err(id, `'S' at (${pos.x},${pos.y}) has no landing within 8 tiles below`);
  }

  if (!isBonus && !isBoss) {
    if (W < 120 || W > 360) err(id, `width ${W} outside 120-360`);
    if (H < 12 || H > 24) err(id, `height ${H} outside 12-24`);
    for (const L of ['A', 'P', 'E', 'X']) {
      const n = count(rows, L);
      if (n !== 1) err(id, `expected exactly 1 '${L}', found ${n}`);
    }
    const cp = count(rows, '!');
    if (cp !== 1) err(id, `expected exactly 1 checkpoint '!', found ${cp}`);
    if (count(rows, 'B') < 1) err(id, `needs at least one Buddy Barrel 'B'`);
    const bananas = count(rows, 'o') + 10 * count(rows, 'O');
    if (bananas < 40 || bananas > 90) err(id, `banana total ${bananas} outside 40-90`);

    // letters near something standable or in a flight path (rough check)
    for (const L of ['A', 'P', 'E', 'X']) {
      const p = find(rows, L)[0];
      if (!p) continue;
      let ok = false;
      for (let dy = 1; dy <= 4 && !ok; dy++)
        for (let dx = -2; dx <= 2 && !ok; dx++)
          if (STANDABLE.has(charAt(rows, p.x + dx, p.y + dy))) ok = true;
      // cannons / tires / ropes anywhere in the column count as a flight path
      for (let y = p.y; y < H && !ok; y++) {
        const c = charAt(rows, p.x, y);
        if ('c<>Rt|'.includes(c)) ok = true;
      }
      if (!ok && !flooded) warn(id, `letter '${L}' at (${p.x},${p.y}) may be unreachable`);
    }

    // impassable-chasm heuristic: consecutive columns with nothing standable
    let run = 0, worst = 0, worstAt = 0;
    for (let x = 0; x < W; x++) {
      let stand = false;
      for (let y = 0; y < H; y++) if (STANDABLE.has(charAt(rows, x, y))) { stand = true; break; }
      if (flooded) stand = true;
      run = stand ? 0 : run + 1;
      if (run > worst) { worst = run; worstAt = x; }
    }
    if (worst > 4) warn(id, `columns ~${worstAt - worst}-${worstAt} have a ${worst}-wide span with nothing standable`);
  }

  if (isBonus) {
    if (count(rows, 'M') < 1) err(id, `bonus room needs at least 1 medal 'M'`);
    if (W < 10 || W > 40) err(id, `bonus width ${W} outside 10-40`);
  }
}

const worldStageIds = new Set(WORLDS.flatMap(w => w.stages.map(s => s.id)));
for (const [id, def] of Object.entries(LEVELS)) {
  if (!worldStageIds.has(id)) warn(id, 'not referenced by any world');
  if (def.id !== id) err(id, `def.id '${def.id}' mismatch`);
  if (!THEMES.has(def.theme)) err(id, `unknown theme '${def.theme}'`);
  if (!def.name || def.name !== def.name.toUpperCase() || def.name.length > 24) err(id, `bad name '${def.name}'`);
  const isBoss = !!def.boss;
  lintRoom(id, def.rows, { isBoss, flooded: !!def.flooded });

  const triggers = new Set();
  for (const ch of ['1', '2', '3']) {
    const n = count(def.rows, ch);
    if (n > 1) err(id, `bonus trigger '${ch}' appears ${n} times`);
    if (n === 1) triggers.add(Number(ch) - 1);
  }
  const bonus = def.bonus || [];
  if (!isBoss && (bonus.length < 1 || bonus.length > 3)) err(id, `needs 1-3 bonus rooms, has ${bonus.length}`);
  for (const idx of triggers) {
    if (!bonus[idx]) err(id, `trigger ${idx + 1} has no bonus[${idx}] room`);
  }
  bonus.forEach((b, i) => {
    if (!triggers.has(i)) err(id, `bonus[${i}] has no matching '${i + 1}' trigger`);
    lintRoom(`${id}-bonus${i}`, b.rows, { isBonus: true, flooded: !!b.flooded });
  });
}

// world structure: 10/8/8/8, boss last in each
const counts = WORLDS.map(w => w.stages.length);
if (JSON.stringify(counts) !== JSON.stringify([10, 8, 8, 8])) err('worlds', `stage counts ${counts} != [10,8,8,8]`);
WORLDS.forEach((w, i) => {
  const last = w.stages[w.stages.length - 1];
  if (!LEVELS[last.id].boss) err('worlds', `world ${i + 1} last stage ${last.id} is not a boss`);
  w.stages.slice(0, -1).forEach(s => {
    if (LEVELS[s.id].boss) err('worlds', `non-final stage ${s.id} is a boss`);
  });
});

const total = Object.keys(LEVELS).length;
if (total !== 34) err('worlds', `expected 34 stages, found ${total}`);

console.log(`\nlint: ${total} stages, ${errors} error(s), ${warnings} warning(s)`);
process.exit(errors > 0 ? 1 : 0);
