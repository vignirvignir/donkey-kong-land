# Gorilla Land

A from-scratch, browser-playable tribute to *Donkey Kong Land* (Rare/Nintendo,
1995, Game Boy) — recreating the game's complete **mechanics, structure and
feel** with **100% original art, names, level layouts and music**. Nintendo's
copyrighted assets are not used or reproduced; what is recreated is the rule
set (game rules aren't copyrightable), the 160×144 four-shade presentation,
and the 4-world / 34-stage structure. See `docs/ENGINEERING_PLAN.md` for the
exact faithful-vs-original breakdown.

## Play

Any static file server works — no build step, no dependencies:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Controls (Game Boy mapping)

| Key | GB button | Action |
|---|---|---|
| Arrow keys / WASD | Control Pad | move, aim, climb |
| X / K / Space | A | jump, swim stroke, fire cannon |
| Z / J | B | roll; hold to pick up a barrel, release to throw; hold to charge (Rocky) |
| Enter | START | pause |
| Shift | SELECT | switch hero / dismount |
| (paused) Shift | START+SELECT | leave an already-cleared stage |

## The game

- Two heroes, one on screen: **Bruno** (power — beats armored Bruisers) and
  **Pip** (speed). Get hit and your partner takes over; get hit alone and you
  lose a life. **Buddy Barrels** bring the partner back.
- 4 worlds, 34 stages, 4 bosses: **Galleon Grove**, **Sunken Ruins**,
  **Peak + Cloud Pass**, **Skyline City** — ending at **King Snapjaw**.
- Collect **A-P-E-X** in a stage to earn the right to **save** (faithful to
  the 1995 save rule). 100 bananas = extra life. **Ape Medals** buy spins at
  the end-of-stage slot machine. Find every hidden **bonus room** for the
  "!" mark.
- **Rocky the Rhino** charges through enemies and cracked walls;
  **Ozzie the Ostrich** sprints and glides.
- Rolling off a ledge still lets you jump mid-air — the classic expert move.

## Development

- `docs/ENGINEERING_PLAN.md` — architecture & design plan
- `docs/LEVEL_FORMAT.md` — stage authoring guide
- `docs/VERIFICATION_CHECKLIST.md` — the tested behavior contract
- `node test/lint-levels.mjs` — static stage validation
- `NODE_PATH=/opt/node22/lib/node_modules node test/play.mjs` — headless
  Playwright smoke test
- `index.html?test=1` exposes deterministic hooks on `window.__gl`
  (frame stepping, state snapshots, input injection) for verification.

All code, pixel art and music in this repository are original work created
for this project.
