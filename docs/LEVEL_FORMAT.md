# Stage authoring guide

Each stage is a JS module in `data/levels/` exporting a default object:

```js
export default {
  id: 'w1-3',            // matches filename
  name: 'ROPE GROVE ROMP', // UPPERCASE, fits the map footer (max ~24 chars)
  theme: 'jungle',       // jungle | snow | ship | temple | reef | mountain | sky | city
  flooded: false,        // true = whole stage is underwater (swimming physics)
  boss: null,            // normal stages: null
  rows: [                // ASCII tilemap, one string per tile row (16px tiles)
    '....',
    // ...
  ],
  bonus: [               // 1-3 bonus rooms (see below). [] only for boss stages.
    { rows: [ /* small room */ ] },
  ],
};
```

## Map characters

**Terrain (part of the tile grid):**
| Char | Meaning |
|---|---|
| `.` | empty air |
| `#` | solid block (auto-styled: grass/plank/brick top per theme) |
| `=` | one-way platform (jump up through, stand on, drop with DOWN) |
| `\|` | climbable rope (vertical; place in columns) |
| `^` | spikes (hurt on touch) |
| `~` | water surface, `w` water body (for partially flooded pits) |
| `?` | cracked wall — broken by thrown barrels, TNT or Rocky's charge |

**Spawns (become entities; the tile itself is empty):**
| Char | Meaning |
|---|---|
| `S` | hero start (exactly 1) |
| `D` | exit portal (exactly 1; stand it on solid ground) |
| `!` | checkpoint post (exactly 1 in normal stages, mid-level) |
| `A` `P` `E` `X` | the four letters (exactly one each; all four must be reachable) |
| `o` banana, `O` banana bunch (10), `M` Ape Medal, `L` 1-up balloon |
| `B` | Buddy Barrel (restores partner) — place ≥1 per stage |
| `b` | throwable wooden barrel, `T` TNT barrel |
| `c` | cannon (fires straight up), `<` / `>` cannon (arcs left/right), `R` rotating cannon (player aims, A fires) |
| `t` | bounce tire |
| `@` | Rocky the Rhino crate, `$` | Ozzie the Ostrich crate |
| `1` `2` `3` | bonus-room entrances (invisible triggers; index into `bonus[]`) |

**Enemies:**
| Char | Enemy | Notes |
|---|---|---|
| `K` | Snapper (walker) | jump or roll |
| `U` | Bruiser (armored) | only Bruno / barrels |
| `G` | Chomper (fast walker) | jump or roll |
| `W` | Rollo (charges) | jump or roll |
| `Q` | Sly (low snake) | jump or roll |
| `Z` | Stinger (wasp) | UNTOUCHABLE: barrels/Rocky only. Vertical sine; horizontal if solid tile right below spawn |
| `V` | Beaky (glider) | jump only |
| `v` | Beaky Jr (diver) | jump only |
| `N` | Nibbles (biter) | jump ONLY (rolling hurts you) |
| `J` shark, `f` fang, `g` glub, `y` inky, `F` finley | water enemies | cannot be attacked — avoid |
| `p` | Clampy (spits pearls) | avoid |
| `H` | Hamhock (swooping pig) | jump only |
| `x` | Twister (tornado) | UNTOUCHABLE — avoid or Rocky |
| `m` | Mole (pops from ground) | jump while up |

**Hazards / mechanisms:**
| Char | Meaning |
|---|---|
| `*` | static mincer (spike wheel) — indestructible |
| `&` | mincer patrolling vertically (±2 tiles) |
| `u` | oil drum with periodic flame |
| `k` | snake basket (spawns Slys) |
| `d` | invisible dropper (rains coconuts/boulders when hero below) |
| `-` | moving platform, horizontal patrol (±3.5 tiles) |
| `/` | moving platform, vertical patrol (±3 tiles) |
| `:` | collapsing cloud platform (sky theme; falls ~0.4s after stand) |

## Physics limits (make stages beatable!)

- Max jump height: **3 tiles** (hold A). Safe design: 2-tile steps.
- Max jump gap: **4 tiles** at a run. Safe design: ≤3-tile gaps.
- Tire bounce: ~5 tiles high. Cannon `c`: ~2-6 tiles up. `<`/`>`: arcs ~4 tiles far.
- Rope grab: press UP near a `|` column. Heroes climb 1 px/frame.
- Pits kill. Spikes hurt. Water in non-flooded stages: swimmable (`~`/`w` tiles).
- Roll off a ledge → you can still jump mid-air (extended roll-jump) — may be
  REQUIRED for expert secrets but never for the main path.

## Stage requirements (enforced by `test/lint-levels.mjs`)

1. Exactly one `S`, one `D`, one each of `A` `P` `E` `X`; ≥1 `B`; exactly one `!`.
2. `D` and `S` must sit directly above solid ground (`#`).
3. 40–90 bananas total counting bunches as 10 (`o` + 10×`O`).
4. Normal stages: width 120–360 columns, height 12–24 rows. All rows same length.
5. 1–3 bonus rooms; every index used by a `1`/`2`/`3` trigger must exist in `bonus[]`.
   Bonus rooms: 10–40 cols wide, contain `S`, an exit `D', ≥1 `M` medal. No enemies required.
6. Letters reachable: within 3 tiles above a standable surface, or in a cannon/tire flight path.
7. The main path start→exit must be walkable with ≤3-tile gaps / ≤3-tile climbs,
   or provide ropes/cannons/tires/platform entities to bridge bigger spans.
8. Themed chars only; unknown chars fail the lint.
9. Every `1`/`2`/`3` trigger should be discoverable: behind a `?` wall (put a `b`
   or `T` barrel or `@` crate within reach), or in a hidden alcove/off the main path.
10. Flooded stages: no rolling/jumping — design around swimming; use water enemies.

## Design language (match the 1995 feel)

- Stages are 1–3 minutes. Start gentle, escalate, place the checkpoint at ~55%.
- Bananas trace the intended path (and hint at secrets).
- Letters: A early, P before checkpoint, E after, X near the end or well hidden.
- 2 stages per world carry an animal crate (`@` or `$`).
- Enemies come in themed clusters with breathing room between fights.
