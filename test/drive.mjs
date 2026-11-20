// Shared Playwright driver + generic play-bot for verification agents.
// Usage:
//   import { launch } from './drive.mjs';
//   const d = await launch(9123);            // unique port per agent!
//   await d.warp(0, 0);
//   const result = await d.botToPortal({ maxFrames: 12000 });
//   await d.close();
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join, resolve } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = resolve(new URL('..', import.meta.url).pathname);
const MIME = { '.html': 'text/html', '.js': 'text/javascript' };

export async function launch(port, { headless = true } = {}) {
  const server = createServer(async (req, res) => {
    try {
      const f = join(ROOT, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
      res.writeHead(200, { 'content-type': MIME[extname(f)] || 'text/plain' });
      res.end(await readFile(f));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(r => server.listen(port, r));
  const browser = await chromium.launch({ headless });
  const page = await browser.newPage({ viewport: { width: 480, height: 432 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://localhost:${port}/index.html?test=1`);
  await page.waitForFunction(() => window.__gl);

  const d = {
    page, browser, errors,
    close: async () => { await browser.close(); server.close(); },
    state: () => page.evaluate(() => window.__gl.state()),
    step: (n = 1) => page.evaluate((n) => window.__gl.step(n), n),
    warp: (w, s) => page.evaluate(([w, s]) => window.__gl.warp(w, s), [w, s]),
    give: (o) => page.evaluate((o) => window.__gl.give(o), o),
    setHero: (h) => page.evaluate((h) => window.__gl.setHero(h), h),
    setPos: (x, y) => page.evaluate(([x, y]) => window.__gl.setPos(x, y), [x, y]),
    hold: (b) => page.evaluate((b) => window.__gl.input.hold(b), b),
    release: (b) => page.evaluate((b) => window.__gl.input.release(b), b),
    tap: (b, f = 3) => page.evaluate(([b, f]) => window.__gl.input.tap(b, f), [b, f]),
    clearInput: () => page.evaluate(() => window.__gl.input.clear()),
    tile: (tx, ty) => page.evaluate(([tx, ty]) => window.__gl.tile(tx, ty), [tx, ty]),
    screenshot: (path) => page.screenshot({ path }),

    // Generic completability bot. Runs entirely in-page for speed.
    // Heads for the portal (or a target), jumping gaps/walls, climbing ropes,
    // riding cannons, avoiding nothing (it tanks hits — give lives first).
    // Returns { done, frames, deaths, x, y, reason }.
    botToPortal: (opts = {}) => page.evaluate((opts) => {
      const gl = window.__gl;
      const maxFrames = opts.maxFrames ?? 15000;
      const T = 16;
      const solid = (tx, ty) => { const c = gl.tile(tx, ty); return c === 1 || c === 6; };
      const standable = (tx, ty) => { const c = gl.tile(tx, ty); return c === 1 || c === 2 || c === 6; };
      let deaths = 0, lastDeath = false, stuck = 0, lastX = -1;
      for (let f = 0; f < maxFrames; f++) {
        const s = gl.step(1);
        if (s.screen === 'stageClear' || s.screen === 'save' || s.screen === 'bonusGame' ||
            (s.mode === 'victory')) {
          return { done: true, frames: f, deaths, reason: s.screen || s.mode };
        }
        if (s.screen !== 'level' && s.screen !== 'bonusRoom') {
          // map/game over etc.
          return { done: false, frames: f, deaths, reason: 'left-level:' + (s.screen || 'map') };
        }
        const p = s.player;
        if (p.state === 'dead') { if (!lastDeath) { deaths++; lastDeath = true; } continue; }
        lastDeath = false;
        if (p.state === 'cannon') { gl.input.tap('A', 2); continue; }

        const portal = s.entities.find(e => e.t === 'portal');
        const targetX = opts.targetX ?? (portal ? portal.x + 6 : s.size.w - 24);
        const targetY = opts.targetY ?? (portal ? portal.y : null);
        const dx = targetX - (p.x + 5);
        const dir = dx > 0 ? 1 : -1;
        const ptx = Math.floor((p.x + 5) / T), pty = Math.floor((p.y + 8) / T);

        // stuck detection
        if (Math.abs(p.x - lastX) < 0.3 && p.grounded) stuck++; else stuck = 0;
        lastX = p.x;

        if (s.flooded || p.state === 'swim') {
          // swim toward target, stroking to keep height near target or center
          gl.input.release('LEFT'); gl.input.release('RIGHT');
          gl.input.hold(dir > 0 ? 'RIGHT' : 'LEFT');
          const ty = targetY ?? (s.size.h / 2);
          if (p.y > ty - 8 || p.vy > 0.6) { if (f % 14 === 0) gl.input.tap('A', 2); }
          // wall ahead? swim up
          if (solid(ptx + dir, pty)) { if (f % 10 === 0) gl.input.tap('A', 2); }
          continue;
        }

        if (p.state === 'climb') {
          // climb up until a side platform appears, then hop toward target
          const sideTx = ptx + dir;
          let hop = false;
          for (let k = 0; k <= 1; k++) {
            if (standable(sideTx, pty + 1 + k) && !solid(sideTx, pty)) { hop = true; break; }
          }
          if (hop || !((gl.tile(ptx, pty - 1) === 3) || gl.tile(ptx, pty) === 3)) {
            gl.input.hold(dir > 0 ? 'RIGHT' : 'LEFT');
            gl.input.tap('A', 2);
            gl.input.release('UP');
          } else {
            gl.input.hold('UP');
          }
          continue;
        }

        gl.input.hold(dir > 0 ? 'RIGHT' : 'LEFT');
        gl.input.release(dir > 0 ? 'LEFT' : 'RIGHT');

        // airborne over a rope column? grab it
        if (!p.grounded) {
          if (gl.tile(ptx, pty - 1) === 3 || gl.tile(ptx, pty) === 3) gl.input.hold('UP');
          continue;
        }
        gl.input.release('UP');

        // enemy ahead at body height? jump (usually stomps or clears it)
        if (p.grounded) {
          const threat = s.entities.find(e => e.k === 'enemy' && !e.hidden &&
            Math.sign(e.x - p.x) === dir &&
            Math.abs(e.x - p.x) < 38 && Math.abs(e.y - p.y) < 26);
          if (threat) {
            gl.input.hold('A');
            for (let j = 0; j < 14; j++) gl.step(1);
            gl.input.release('A');
            continue;
          }
        }

        if (p.grounded) {
          const colHasFloor = (tx, fromTy) => {
            for (let k = 0; k <= 3; k++) if (standable(tx, fromTy + 1 + k)) return true;
            return false;
          };
          const frontTx = Math.floor((p.x + 5 + dir * 11) / T);
          const gap = !colHasFloor(frontTx, pty);
          const gapNext = !colHasFloor(frontTx + dir, pty);
          // wall ahead?
          const wall = solid(ptx + dir, pty) || solid(ptx + dir, pty - 1);
          // rope ahead & above?
          const ropeHere = gl.tile(ptx, pty - 1) === 3 || gl.tile(ptx + dir, pty - 1) === 3;
          if (ropeHere && (wall || gap)) { gl.input.hold('UP'); continue; }
          if (wall || stuck > 40) {
            gl.input.hold('A');
            for (let j = 0; j < 16; j++) gl.step(1);
            gl.input.release('A');
            stuck = 0;
          } else if (gap) {
            if (Math.abs(p.vx) >= 1.0 || !gapNext) {
              // committed running jump (full) or short hop for 1-col gap
              gl.input.hold('A');
              for (let j = 0; j < (gapNext ? 17 : 9); j++) gl.step(1);
              gl.input.release('A');
            }
            // else: keep accelerating; detection fires again next frame
          }
        }
        // near target: settle
        if (Math.abs(dx) < 6 && (targetY == null || Math.abs((p.y) - targetY) < 20)) {
          gl.input.release('LEFT'); gl.input.release('RIGHT');
        }
      }
      return { done: false, frames: maxFrames, deaths, reason: 'timeout', at: gl.state().player };
    }, opts),
  };
  return d;
}
