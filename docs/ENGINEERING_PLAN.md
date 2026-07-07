# Engineering Plan — "Gorilla Land"
## A faithful browser recreation of the 1995 Game Boy classic *Donkey Kong Land*

### 0. Legal / asset policy (read first)

*Donkey Kong Land* (Rare/Nintendo, 1995) is copyrighted software. Its sprites, music,
character designs, story text, level names and exact level layouts are protected
expression and are **not reproduced** in this project. What *is* recreated — because
game rules and mechanics are not copyrightable — is the complete mechanical and
structural design of the game:

| Recreated faithfully (rules/structure)        | Replaced with original work (expression) |
|-----------------------------------------------|------------------------------------------|
| 160×144 resolution, 4-shade DMG palette       | All pixel art (drawn from scratch)       |
| One-hero-on-screen buddy system               | Character names & designs                |
| Damage model (lose partner → lose life)       | Level names & exact layouts              |
| Roll / jump combat, roll-off-ledge jump       | Music & sound (original chiptunes)       |
| Buddy barrels, barrel cannons, throwing       | Story text                               |
| Swimming (tap-A), ropes, checkpoints          |                                          |
| 4-letter collectible → save-screen rule       |                                          |
| 100 bananas = 1-up, bunches = 10, tokens      |                                          |
| 4 worlds / 34 stages, same world themes       |                                          |
| Boss archetypes (ray, clam, mole, croc king)  |                                          |
| Controls incl. Select-switch, Start+Select exit|                                         |

The result plays like the Game Boy game; it just wears its own clothes.

### 1. Nomenclature map

| Original                | This project              |
|-------------------------|---------------------------|
| Donkey Kong             | **Bruno** (big gorilla — power: defeats armored enemies) |
| Diddy Kong              | **Pip** (small monkey — faster, nimbler) |
| Cranky Kong             | **Grampy** (elder ape, issues the challenge) |
| King K. Rool            | **King Snapjaw** (croc tyrant) |
| Kremlings               | **Snappers** |
| Rambi the Rhino         | **Rocky the Rhino** |
| Expresso the Ostrich    | **Ozzie the Ostrich** |
| K-O-N-G letters         | **A-P-E-X letters** |
| Kong Tokens             | **Ape Medals** (bonus-game currency) |
| DK (buddy) Barrel       | **Buddy Barrel** (marked "B") |
| Banana hoard            | Banana hoard (bananas are generic fruit) |

Worlds (same themes, same stage counts, boss last):

| # | Original world                          | This project        | Stages |
|---|------------------------------------------|---------------------|--------|
| 1 | Gangplank Galleon Ahoy! (jungle/ship/snow) | **Galleon Grove**   | 10 (9 + boss *Ray Rumble*) |
| 2 | Kremlantis (sunken temple/underwater)    | **Sunken Ruins**    | 8 (7 + boss *Clam Clash*) |
| 3 | Monkey Mountains & Chimpanzee Clouds     | **Peak & Cloud Pass** | 8 (7 + boss *Mole Mayhem*) |
| 4 | Big Ape City (metropolis/construction)   | **Skyline City**    | 8 (7 + boss *Snapjaw's Keep*) |

Total: **34 stages**, matching the original's structure.

Enemy roster (analog → original inspiration):

| This project | Behavior | Inspired by |
|--------------|----------|-------------|
| Snapper      | walking croc grunt; jump or roll kills | Kritter |
| Bruiser      | armored croc; only Bruno's attacks or barrels work | Krusha |
| Chomper      | fast small walker | Gnawty |
| Rollo        | armadillo; charges in a roll when it sees you | Army |
| Sly          | low snake; roll it or jump precisely | Slippa |
| Stinger      | wasp; **cannot be jumped or rolled** — barrels only; flies patterns | Zinger |
| Beaky        | vulture; flies straight or perches dropping nuts | Necky |
| Beaky Jr.    | small diving vulture | Mini-Necky |
| Nibbles      | little croc that bites; jump-only kill | Klap Trap |
| Jaws         | patrolling shark (water) | Chomps |
| Fang         | darting fish (water) | Fangfish |
| Glub         | sine-swimming fish (water) | Gloop |
| Inky         | bobbing octopus (water) | Nemo |
| Finley       | gliding ray (water) | Flapper |
| Clampy       | fixed clam, spits pearls | Clambo |
| Hamhock      | flying pig, swoops in arcs | Hogwash |
| Twister      | invulnerable mini-tornado, patrols | Swirlwind |
| Mole         | pops out of holes, tosses rocks | (mole boss's minions) |

Hazards: mincers (spinning spike wheels), oil-drum fires, falling boulders,
dropping coconuts, snake baskets, collapsing cloud platforms, spikes, moving
platforms, bounce tires (fixed and rollable).

### 2. Technology

- **Zero-dependency vanilla JavaScript (ES modules) + Canvas 2D.** No build step;
  any static file server runs it (`python3 -m http.server`).
- Internal framebuffer 160×144 scaled up with integer nearest-neighbor scaling;
  4-color DMG-green palette (`#0f380f #306230 #8bac0f #9bbc0f`).
- **WebAudio chiptune synth** modeled on the GB's channels: 2 pulse, 1 "wave"
  (triangle-ish periodic wave), 1 noise. Original songs in a tiny tracker format.
- **localStorage saves**, gated by the faithful rule: you may only save after
  clearing a stage in which you collected all four A-P-E-X letters.
- Fixed 60 Hz timestep, accumulator loop; rendering decoupled.
- Pixel art encoded as string grids (chars `.0123`), tiles generated
  procedurally per theme into an offscreen atlas at boot.

### 3. Module layout

```
index.html                 shell + canvas + scaling
src/main.js                boot
src/game.js                state machine, fixed-step loop, test hooks
src/constants.js           palette, physics constants, input map
src/input.js               keyboard (+ test injection API)
src/renderer.js            160×144 framebuffer, blitters, text
src/font.js                3×5 + 8×8 numeric/alpha font
src/sprites.js             all character/enemy/item pixel art
src/tiles.js               procedural theme tilesets + atlas
src/audio.js               GB-style 4-channel synth + SFX
src/music.js               original song data (title/map/jungle/water/…)
src/save.js                localStorage wrapper
src/title.js               title screen + story intro
src/worldmap.js            4-world node map, stage select, "!" marks
src/level.js               level parsing, tilemap, camera, gameplay state
src/player.js              hero physics/FSM (both heroes, buddy system)
src/enemies.js             enemy FSMs + hazards
src/items.js               bananas, letters, medals, barrels, cannons, portal
src/animals.js             Rocky & Ozzie ride mechanics
src/bosses.js              4 boss fights
src/bonus.js               end-of-stage medal slot-machine bonus
data/worlds.js             world/stage tables
data/levels/w{1-4}-{n}.js  34 stage definitions (ASCII tilemaps)
test/lint-levels.mjs       static level validator
test/play.mjs              Playwright driver for verification
docs/LEVEL_FORMAT.md       authoring guide (used by level-authoring agents)
docs/VERIFICATION_CHECKLIST.md  the spec the verifier agents test against
```

### 4. Core mechanics spec (what the verifier tests)

**Presentation**
- P1 160×144 internal resolution, 4 visible shades, integer scaling.
- P2 HUD: hero icon, lives ×N, banana count, A-P-E-X letters lit as collected,
  medal count. HUD hides during idle play like the GB game kept it minimal —
  we show a compact top strip.

**Movement (60 Hz, 16 px tiles)**
- M1 Walk: Bruno 1.30 px/f, Pip 1.45 px/f; accel 0.15, friction 0.2.
- M2 Jump: press A → v=−4.6; holding A lowers gravity (0.10 vs 0.26) for up to
  16 frames → variable height ~2–3.2 tiles. Releasing A caps rise.
- M3 Roll: B on ground → 2.4 px/f for 26 f, kills roll-vulnerable enemies,
  grants brief step-off-ledge coyote roll; **jump is allowed mid-air after
  rolling off a ledge** (the classic extended roll-jump).
- M4 Swim: in water, gravity 0.045 (max sink 0.8); tapping A gives an upward
  stroke (vy −1.6) plus drift toward held direction; no attacks while swimming.
- M5 Climb: ropes/vines — up/down 1.0 px/f, horizontal hop between parallel
  ropes, jump releases.
- M6 Bounce: jumping on a bounceable enemy pops the hero up (−3.2; −5.2 if A
  held).
- M7 Tires: bounce ~1.5× jump height; some tires can be rolled by pushing.

**Buddy system & damage**
- B1 Only one hero on screen. Select switches instantly when both are alive.
- B2 Touch damage with both alive: active hero flees, partner takes over,
  ~90 f invulnerability. With one alive: lose a life, respawn at checkpoint
  (if reached) else stage start.
- B3 Buddy Barrel restores the missing partner (breaks on touch; if both
  alive it gives 300 pts of bananas… no: it simply breaks, worth 1 banana).
- B4 Falling in a pit = lose a life regardless of partners.
- B5 Bruno defeats Bruiser by jump/roll; Pip's attacks bounce off (Pip is
  knocked back, not hurt, on roll; jumping on Bruiser hurts Pip).

**Items & economy**
- I1 Banana = 1; bunch = 10; at 100 the counter wraps and lives +1 (jingle).
- I2 A-P-E-X letters tracked per stage; collecting all 4 → save screen after
  the stage (faithful save gating).
- I3 Ape Medals persist; ≥1 medal at stage end offers the bonus slot game
  (match 3 hero faces = +2 lives, match any pair = +1).
- I4 Balloon = +1 life, floats upward, must be caught.
- I5 Throwable wooden barrels: B to pick up, release B to throw; barrel rolls
  along ground breaking enemies until hitting a wall. TNT barrels explode,
  also destroying cracked-wall bonus entrances.
- I6 Barrel cannons: auto-fire after 60 f or fire on A; rotating cannons aim
  in a sweeping arc; blast chains must be traversable.
- I7 Checkpoint post: passing it flags respawn point (one per stage, mid-way).
- I8 End portal: jump/walk into the doorway → stage clear fanfare → map.

**Animal buddies**
- A1 Crate with animal icon spawns the buddy; touching mounts it.
- A2 Rocky the Rhino: charge (hold B) destroys most enemies incl. Stingers on
  horn contact, breaks cracked walls; Select dismounts.
- A3 Ozzie the Ostrich: fast run, hold A to flutter-glide (slow fall, ~0.06
  gravity); cannot attack; takes one hit then flees.

**World map & saves**
- W1 Node map per world; completed stages show name + "!" when 100 %
  (all bonus rooms found); movement along unlocked edges only.
- W2 Boss stage locks the next world until beaten.
- W3 Start+Select inside an already-cleared stage exits to map.
- W4 Save screen (post-stage, letters collected) writes localStorage;
  Continue from title restores it.

**Bosses**
- X1 Ray Rumble: stingray sweeps arena in 3 height bands, surfaces vulnerable
  for a window; 5 stomps win; speed escalates each hit.
- X2 Clam Clash (swimming): clam hops/chases, opens to spit 3-pearl fans;
  its pearl is touch-vulnerable only while open; 5 hits.
- X3 Mole Mayhem: whack-a-mole across 5 burrows; mole tosses 2 rock arcs,
  then is dizzy & stompable; 5 hits, tempo rises.
- X4 Snapjaw's Keep: croc king walks/charges, hops causing stun-quakes
  (grounded hero is stunned), throws a boomerang crown; stomp after the
  crown throw; 5 hits → victory & credits.

**Audio**
- S1 Distinct songs: title, map, jungle, snow/ship, water/temple, mountain,
  sky, city, boss, bonus, clear-fanfare, game-over. GB-authentic 4-channel
  timbres.
- S2 SFX: jump, roll, land, banana, letter, medal, throw, break, hurt, splash,
  cannon, stomp, boss-hit, 1-up.

### 5. Level design rules (enforced by `test/lint-levels.mjs`)

Every stage must have: exactly one start `S`, exactly one exit portal `E`,
exactly the letters `A`,`P`,`X` and one `O` (APEX set), ≥1 checkpoint `!`
(bosses exempt), ≥1 Buddy Barrel, banana counts in the 40–90 range,
no unreachable-by-design softlocks (lint checks portal is on solid ground,
letters are within jump/cannon reach of walkable tiles), themed tile chars
valid for the world, width 120–360 tiles for normal stages.
Two stages per world contain animal-buddy crates. Each stage has 1–3 bonus
rooms (cracked walls or hidden cannons) granting medals.

### 6. Verification strategy (the "verifier agent" pass)

1. **Static:** `node test/lint-levels.mjs` gates level data.
2. **Deterministic hooks:** the game exposes `window.__gl`:
   `step(n)` advance n frames synchronously (test mode pauses RAF),
   `state()` JSON snapshot (mode, hero pos/vel, lives, bananas, letters,
   entities in view, current stage), `input.hold/release/tap(btn)`,
   `warp(world,stage)`, `noclip(bool)` — test-only, not reachable from
   gameplay UI.
3. **Agent pass:** parallel verifier agents, each owning a checklist slice
   (movement, combat/buddy, items, water/climb, animals, map/save, each
   world's stages completable start→portal, all four bosses beatable, audio
   boot, presentation), drive real Chromium via Playwright against
   `docs/VERIFICATION_CHECKLIST.md`, filing findings; fixes land; failed
   checks re-run until green.

### 7. Delivery

- Branch `claude/donkey-kong-land-browser-anhf2g`, draft PR.
- `README.md` with play instructions and control table.
- Definition of done: lint green, all checklist items verified by agents,
  all 34 stages completable, 4 bosses beatable, save/restore works.
