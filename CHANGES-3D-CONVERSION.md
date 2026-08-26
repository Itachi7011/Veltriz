# Veltriz — 3D conversion notes (read this first)

This pass converts the game's rendering/movement/physics layer from a flat
top-down 2D view into a real 3D game, and fixes the "fresh install has no
data" admin problem. **Nothing was deleted** — every building, house,
zone, job, market item, etc. from the original data is still there, just
rendered/loaded differently.

## 1. The character

`game-client/src/pages/game/engine/CharacterModel.js`

The old avatar was a couple of overlapping circles. It's now a real
jointed body, built from primitives (no external asset downloads needed):

- Head with an actual face — eyes (white + iris + pupil), brows, nose,
  mouth, ears, jaw taper
- Neck, chest, waist, hips — gendered proportions (male: broader
  shoulders/boxier chest; female: narrower shoulders, waist taper, hip
  width, subtle bust)
- Two arms with shoulder → upper arm → forearm → **a real hand** (palm +
  4 individually-jointed fingers + a separately-angled thumb, not a mitt)
- Two legs with hip → knee → ankle → shoe
- 5 hairstyles (short, buzz, ponytail, long, bald) in a selectable color,
  independent skin tone and outfit color
- Procedural walk/run/idle animation (leg/arm swing, hip sway, idle
  breathing, head look) driven by actual physics velocity — not a sprite
  flipbook

Character creation (`pages/character/CharacterCreate.jsx` +
`CharacterPreview3D.jsx`) now has a live-rotating 3D preview of this exact
rig, plus gender and hairstyle pickers. Backend (`game-world-service`)
validator + Mongoose model were extended (additively) to store
`gender`/`hairStyle`/`pantsColor`/`shoeColor` alongside the existing
`skinTone`/`outfitColor`/`hairColor`.

Remote players now render with either their own saved appearance (server
passes it through on `world:join`/`player:joined`) or a deterministic
random look, so multiplayer never falls back to a generic stand-in.

**Honest scope note:** this is a stylized/low-poly look (proper
proportions, real joints, a real face), not a photorealistic scanned
human — that would require actual 3D character art/sculpting, which is a
different kind of deliverable than code.

## 2. Camera, movement, physics

`engine/CameraRig.js`, `engine/PhysicsController.js`, `engine/GameEngine.js`

- **First-person and third-person**, toggle with `V`. Third-person uses a
  collision-aware spring-arm (pulls in via raycast so it never clips
  through a building); first-person sits at eye height and hides the
  body like most FPS games do.
- Mouse-look uses the real Pointer Lock API (click to lock, relative
  mouse movement rotates the camera) — not drag-to-rotate.
- **Real physics** via `cannon-es`: gravity, jumping (`Space`), running
  (`Shift`), and actual collision against every building and house
  footprint, instead of walking through/over everything on an invisible
  top-down plane.
- `WASD`/arrow keys move relative to camera facing, like a normal game.

## 3. The world: buildings, houses, roads, terrain

`engine/WorldBuilder.js`, `engine/BuildingBuilder.js`

Every building/house record is unchanged (same id, name, type, x/y,
width/height, zone) — only how it's *rendered* changed:

- Each one is now an extruded 3D volume with real wall height (scaled by
  its type — a bank is taller than a house), a **type-specific roof**
  (flat, dome, pediment/portico, gable, sawtooth-industrial), a lit
  window-grid texture on the front face, a door, and a floating name
  sign.
- Civic buildings (bank, city hall, courthouse, government complex,
  university, embassy) get a **columned portico** — the classic
  "official building" look.
- Very tall buildings (tech campus, quantum labs, stock exchange) get a
  **tiered skyscraper crown**, so towers read as towers instead of tall
  boxes.
- Shops/restaurants/markets get a colored awning over the door.
- Terrain is now a real per-zone textured ground plane (each of the 5
  zones — Old Meridian, Neo Meridian, Dustridge County, Port Haven,
  Veltriz Sea — has its own ground color/texture, so crossing a zone
  border is visually obvious, not just a map-panel label), a **procedural
  road grid** with painted lane lines and sidewalks, and paved aprons
  under every structure so nothing floats on grass.
- Performance: the map is huge (62,400 × 6,400 px). Buildings/houses
  outside a render-distance radius of the player are hidden
  (visibility-culled, checked a few times a second, not every frame), and
  only nearby structures are used for the third-person camera's collision
  raycast — this keeps frame rate solid without needing to stream/unload
  actual data.

## 4. Multiplayer / sockets

`game-world-service/src/sockets/index.js` — `world:join` now also accepts
and rebroadcasts `appearance`/`gender` (additive fields only) so every
client can render everyone else's real look.

## 5. "E" and "Enter" both interact

`GamePage.jsx` — pressing either key now opens the nearby building's
panel; previously only `E` worked.

Also added: player input (movement/look) is now frozen and the mouse is
released automatically whenever any panel, the full map, or the pause
menu is open, so you can't wander around blind behind a modal — this
wasn't handled before and would have been a real bug once movement is
physics-driven instead of Phaser-paused.

## 6. Fresh-install / admin default data

This was the "game feels dead after a restart" problem. Previously, jobs,
market items, Chrono Store products, crime actions, and the NPC
population only existed if someone manually ran `npm run seed` in each
service after every fresh database. Now:

- `economy-service`, `crime-service`, `game-world-service`, and
  `simulation-service` **auto-run their seed logic on every server
  boot**.
- Every seed is **idempotent and additive**: it matches existing rows by
  a stable key (job `key`, item `key`, house `houseId`, etc.) and only
  fills in what's missing via `upsert`. It never overwrites admin edits,
  player-owned houses (`owner` field is never touched), or NPC data once
  NPCs exist.
- `simulation-service`'s NPC seed depends on `economy-service` already
  being up (it reads `/api/jobs`), so it retries quietly in the
  background for up to ~40 seconds instead of blocking or crashing that
  service's own startup if the two happen to boot in the "wrong" order.
- The manual `npm run seed` / `npm run seed:houses` scripts still work
  exactly as before, if you ever want to force-run one by hand.

Net effect: a completely fresh database now has a playable economy,
crime system, purchasable houses, and an NPC population the moment all
services finish booting — no manual seeding step required. Admins can
still edit/override everything afterward exactly as before.

## What was intentionally *not* touched

- Map layout data (`game-world-service/src/data/worldData.js`) — every
  building, house, zone, and obstacle position is exactly as it was.
- All economy/crime/simulation game logic, panels, and business rules.
- Auth, admin dashboard, payment flow.

## Fix log

**2024 patch — blank screen / infinite console errors:** the third-person
camera's collision raycast was hitting the floating name-sign labels
(`THREE.Sprite`s) without `raycaster.camera` set. Three.js's `Sprite.raycast()`
needs that to compute billboard orientation — without it, it throws trying
to read `.matrixWorld` off a null camera, every single frame, *before* the
line that actually calls `renderer.render(...)`. That's why the canvas
stayed blank while the React map/HUD overlay kept working fine. Fixed by
setting `raycaster.camera` in `CameraRig`'s constructor and making sign/
label sprites explicitly non-raycastable (a floating text label was never
meant to be "solid" for camera collision anyway). Also wrapped the per-frame
update logic in `GameEngine._tick` in a try/catch so any future bug degrades
to one logged error instead of a silently blank screen.

## Running it — each service's own `README`/`.env.example` and
`npm install && npm run dev` (or `npm start`) still apply. The game
client additionally needs one new install step since two packages were
added:

```bash
cd game-client
npm install   # now also pulls in three + cannon-es
npm run dev
```

`phaser` and `matter-js` were removed from `game-client/package.json`
since nothing uses them anymore (the old scene is kept, unused, in
`game-client/src/pages/game/legacy-phaser-reference/` for reference —
see the README in that folder).
