// Headless smoke test: boots the game, walks title→map→stage, warps through
// all 34 stages watching for runtime errors.
// Run: NODE_PATH=/opt/node22/lib/node_modules node test/play.mjs
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join, resolve } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css' };

const server = createServer(async (req, res) => {
  try {
    const path = req.url.split('?')[0];
    const file = join(ROOT, path === '/' ? 'index.html' : path);
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('nope');
  }
});
await new Promise(r => server.listen(8931, r));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 640, height: 576 } });
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));

let failed = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) failed++;
};

await page.goto('http://localhost:8931/index.html?test=1');
await page.waitForFunction(() => window.__gl, null, { timeout: 10000 });

const gl = (expr) => page.evaluate(expr);

let s = await gl(() => __gl.step(5));
check('boots to title', s.screen === 'title', JSON.stringify({ screen: s.screen, mode: s.mode }));

// title -> menu -> story -> map
await gl(() => __gl.input.tap('START', 3));
s = await gl(() => __gl.state());
check('menu opens', s.mode === 'menu');
await gl(() => __gl.input.tap('A', 3));           // NEW GAME
await gl(() => __gl.input.tap('START', 3));       // skip story
s = await gl(() => __gl.state());
check('reaches world map', s.screen === undefined || s.stage !== undefined || s.world === 0, JSON.stringify({ world: s.world, node: s.node, stage: s.stage }));

// enter stage 1-1
await gl(() => __gl.input.tap('A', 3));
s = await gl(() => __gl.step(30));
check('enters w1-1', s.screen === 'level' && s.stage === 'w1-1', JSON.stringify({ screen: s.screen, stage: s.stage }));

// run right for 300 frames
const x0 = s.player.x;
await gl(() => { __gl.input.hold('RIGHT'); __gl.step(300); __gl.input.release('RIGHT'); });
s = await gl(() => __gl.state());
check('hero runs right', s.player.x > x0 + 100, `x ${x0} -> ${s.player.x}`);

// jump
await gl(() => { __gl.input.hold('A'); __gl.step(10); });
s = await gl(() => __gl.state());
check('hero jumps', s.player.state === 'air' && s.player.vy < 0, JSON.stringify(s.player));
await gl(() => { __gl.input.release('A'); __gl.step(60); });

// warp through all stages
const worlds = await gl(() => __gl.worlds());
for (let w = 0; w < worlds.length; w++) {
  for (let n = 0; n < worlds[w].stages.length; n++) {
    const before = errors.length;
    s = await page.evaluate(([w, n]) => { __gl.warp(w, n); return __gl.step(120); }, [w, n]);
    const ok = (s.screen === 'level') && errors.length === before;
    check(`stage ${worlds[w].stages[n]} runs 120f`, ok,
      ok ? `player (${s.player.x},${s.player.y}) ${s.player.state}` : (errors.slice(before).join(' | ') || JSON.stringify({ screen: s.screen })));
  }
}

await page.screenshot({ path: 'test/smoke.png' });
check('no console errors overall', errors.length === 0, errors.slice(0, 5).join(' | '));

await browser.close();
server.close();
console.log(failed === 0 ? '\nSMOKE OK' : `\nSMOKE FAILED (${failed})`);
process.exit(failed === 0 ? 0 : 1);
