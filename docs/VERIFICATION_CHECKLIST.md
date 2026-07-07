# Verification checklist

The contract for the verifier pass. Every item is testable against the real
game in Chromium via the deterministic hooks (`?test=1`, `window.__gl`).

Hook quick reference:
`__gl.step(n)` advance n frames & return snapshot · `__gl.state()` snapshot ·
`__gl.input.hold/release/tap(BTN)` (`LEFT RIGHT UP DOWN A B START SELECT`) ·
`__gl.warp(w,n)` jump to stage · `__gl.toMap(w,n)` · `__gl.newGame()` ·
`__gl.give({lives,medals,bananas})` · `__gl.setHero('bruno'|'pip')` ·
`__gl.setPos(x,y)` (diagnostics only — a check only PASSES on honest inputs
unless the item says otherwise) · `__gl.levels()` / `__gl.worlds()`.

Result recording: PASS / FAIL / BLOCKED + one-line evidence
(frame numbers, positions, snapshots).

## A. Presentation
- A1 Internal resolution is 160×144, scaled with no smoothing (canvas inspect).
- A2 Only the 4 DMG-green shades appear in a gameplay screenshot.
- A3 HUD shows: hero icon, lives, banana count, A-P-E-X letters (lit as
  collected), medal count, partner icon iff both heroes alive.
- A4 Title → menu → story (3 pages, A advances, START skips) → world map.

## B. Movement (tolerances ±15%)
- B1 Bruno walks ~1.3 px/f; Pip ~1.45 px/f (measure over 60 f).
- B2 Hold-A jump apex 50–60 px; tap-A jump apex 24–34 px.
- B3 Running hold-jump crosses a 3-tile gap (48 px) but the hero cannot
  step over a 1-tile wall without jumping.
- B4 Roll (B on ground) reaches ~2.5 px/f and lasts ~26 f.
- B5 Rolling off a ledge allows one mid-air jump (extended roll-jump).
- B6 Head bump on solid stops upward movement.
- B7 One-way `=` platforms: land from above, jump up through from below,
  drop through with DOWN held.
- B8 Ropes: UP near a rope column attaches; UP/DOWN climbs ~1 px/f;
  A jumps off (direction + jump when LEFT/RIGHT held).
- B9 Swimming (flooded stage): sink slowly; tap A strokes upward
  (vy ≈ −1.6); direction held drifts; no roll/jump underwater.
- B10 Spikes `^` hurt on contact. Falling below the stage bottom kills.
- B11 Tire bounce ≈ jump ×1.4; higher with A held.

## C. Buddy system & combat
- C1 Exactly one hero on screen; SELECT switches instantly when both alive;
  SELECT does nothing when only one alive.
- C2 First enemy contact: active hero replaced by partner, heroesAlive 2→1,
  ~90 f invulnerability flicker.
- C3 Second contact (after invuln): lose a life; respawn at stage start, or
  at the checkpoint if it was reached; heroesAlive back to 2.
- C4 Buddy Barrel restores the partner (heroesAlive 1→2), breaks on touch.
- C5 Stomp kills Snapper/Chomper/Sly/Rollo/Beaky/Beaky Jr/Nibbles/Hamhock;
  hero bounces (higher with A held).
- C6 Roll kills Snapper/Chomper/Sly/Rollo; rolling into Nibbles hurts the
  hero instead.
- C7 Stinger & Twister & Mincer cannot be stomped or rolled — contact always
  hurts; a thrown barrel kills Stinger and Twister but NOT Mincer.
- C8 Bruiser: Bruno's stomp/roll kills it; Pip's stomp hurts Pip; Pip's roll
  bounces Pip back harmlessly; a thrown barrel kills it.
- C9 Water enemies can't be attacked; contact always hurts.
- C10 Barrels: B near a ground barrel picks it up; releasing B throws it;
  the barrel rolls, killing enemies, and breaks on walls. TNT explodes on
  first impact and opens `?` cracked walls in a radius. Rocky's charge and
  a plain barrel also break `?` walls.
- C11 Clampy pearls and Mole rocks hurt on contact and are unkillable.

## D. Items & economy
- D1 Banana +1; bunch +10; counter wraps at 100 → +1 life with jingle.
- D2 The 4 letters light up in the HUD in any collect order; letters reset
  if you leave/die but persist across checkpoint respawn… VERIFY ACTUAL:
  letters reset on death (current spec).
- D3 Balloon gives +1 life and floats upward until caught or gone.
- D4 Medals persist across stages (run-scoped); medal count shows in HUD.
- D5 Checkpoint: touching lights it; dying afterwards respawns beside it.
- D6 Portal `D` on touch: STAGE CLEAR panel → flow (bonus game if medals>0 →
  save screen if all 4 letters → map). Map cursor advances to next stage.

## E. Animal buddies
- E1 `@`/`$` crate breaks on touch, spawns Rocky/Ozzie; touching mounts.
- E2 Rocky: hold B charges (~2.7 px/f), kills Stingers and Twisters on
  contact, breaks cracked walls; tramples regular walkers.
- E3 Ozzie: fast run (~2 px/f); holding A while falling glides (slow fall).
- E4 Enemy contact while riding: the ANIMAL flees (hero safe, brief
  invulnerability); SELECT dismounts.
- E5 Riding into a pit kills the hero as usual.

## F. World map, saving, structure
- F1 4 worlds named GALLEON GROVE / SUNKEN RUINS / PEAK + CLOUD PASS /
  SKYLINE CITY with 10/8/8/8 stages; boss is always the last node.
- F2 Only cleared-adjacent stages selectable; next world unlocks only after
  the previous boss falls (verify with a fresh run, no unlockAll).
- F3 Stage node shows "!" after clearing with ALL bonus rooms found.
- F4 Save screen appears after clearing a stage with all 4 letters; YES
  writes localStorage; CONTINUE on title restores progress/lives/medals.
- F5 Start+Select (pause → SELECT) exits an already-cleared stage only.
- F6 Game over at lives < 0 → GAME OVER screen → title; run resets.

## G. Stages (each of the 34)
For every stage, playing with honest inputs only:
- G1 Completable start → portal without setPos.
- G2 All four letters collectable in one run (route may use checkpoints).
- G3 Checkpoint reachable and functions.
- G4 Every bonus room enterable (breaking walls / hidden alcoves) and
  exitable via its door; medal collectable inside.
- G5 No softlocks: no pit you can enter but not leave (except death),
  no unwinnable states. Cannon chains always land somewhere safe.
- G6 Banana total in 40–90; letters A→P→E→X roughly ordered along the route.
- G7 Theme, music and enemy roster match the world's identity.

## H. Bosses (honest fights, no setPos)
- H1 Ray Rumble: sweeps at 3 heights, jump-overable; bask window is
  stompable; 5 stomps kill; speed rises per hit; re-enters from edges
  (never turns deadly on top of the hero); portal spawns after death.
- H2 Clam Clash: hops toward hero while closed (deadly), opens to spit
  pearl pairs; touching it while open scores a hit + knockback; 5 hits;
  cycle shortens per hit.
- H3 Mole Mayhem: pops from burrows, throws 2 rocks, dizzy window is
  stompable; 5 stomps; tempo rises per hit.
- H4 Snapjaw's Keep: walk/charge/hop/crown patterns; vulnerable only while
  the crown is airborne; quake landing stuns a grounded hero; 5 stomps →
  victory screen + credits; game marked complete.

## I. Audio
- I1 AudioContext boots on first input gesture (non-test mode).
- I2 Distinct looping songs per theme + boss + map + title; clear fanfare,
  game-over and victory jingles play at the right moments (verify via
  `__gl.audio.playing()` transitions; test mode keeps synth muted).

## J. Regression gates
- J1 `node test/lint-levels.mjs` exits 0.
- J2 `NODE_PATH=/opt/node22/lib/node_modules node test/play.mjs` exits 0.
- J3 Zero console errors across a full A–H sweep.
