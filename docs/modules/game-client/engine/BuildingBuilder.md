# `engine/BuildingBuilder.js`

**One-line summary**: turns the flat "colored rectangle + name" building/
house data from `game-world-service` into real extruded 3D structures —
walls, roofs, windows, hinged doors — and, for houses specifically, a full
walk-in interior with furniture and staircases. This file and
`PhysicsController.js` share several functions (imported directly, not
duplicated) so the visible geometry and the collision geometry can never
disagree about where a wall or a staircase actually is.

## The shared-geometry contract with `PhysicsController.js`

Three functions here are the **single source of truth** both files build
from — `PhysicsController.js` imports them directly rather than each file
computing its own version of "where are this house's walls":

- **`computeHouseWalls(h, scale)`**: returns the house's overall
  width/depth (after `HOUSE_SIZE_MULTIPLIER`), and a list of 4-5 wall
  **segments** (back, left, right, and the front wall split into
  `frontLeft`/`frontRight` around a doorway-width gap sized by
  `houseDoorHalfWidth(width)`). Both the visible wall meshes
  (`buildHouseShell`, below) and the player's own collision list
  (`PhysicsController._buildColliders`) are built from this exact same
  function call — there's no second, hand-copied set of numbers to drift
  out of sync.
- **`computeHouseStairs(h, scale)`**: one entry per floor transition — a
  world-space footprint plus `fromY`/`toY`/`run`/`startZ`, modeled as one
  smooth incline per flight (the visible individual steps are geometry
  riding on top of that incline, not separately-collided). Both the
  visible `addStaircase()` steps and `PhysicsController`'s ramp-height
  physics read from this.
- **`computeHouseFloorPlatforms(h, scale)`**: the flat, walkable area of
  every floor *above* ground level, represented as a "zero-slope ramp"
  (same shape as a stair flight, with `fromY === toY`) so
  `PhysicsController`'s height-lookup can treat a sloped flight and a flat
  upper floor with the exact same formula, no special-casing.

**If you change a house's wall thickness, doorway width, floor height, or
stair proportions, do it in these three functions** — everything else
(the visible shell, the collision, the stairs) follows automatically.

## Size/proportion constants

`HOUSE_SIZE_MULTIPLIER` (1.5) — houses render at 1.5x their raw map-data
footprint. This exists specifically so a player can walk inside one at
all; it was chosen as the largest safe value given `worldData.js`'s own
house-placement spacing buffer (a flat 15px/1.2-world-unit gap between
neighboring houses), verified to leave clearance even between two
maximum-size houses placed adjacent to each other. **`WorldBuilder.js`'s
paved sidewalk aprons import this same constant** — they used to be sized
from the raw (pre-multiplier) footprint, so once this multiplier was
introduced, every house's own walls started visibly overflowing past the
edge of their paved base onto the grass; that's now fixed by importing
the same number rather than each file hardcoding its own copy.

`HOUSE_WALL_THICKNESS` (0.22), `HOUSE_FLOOR_CLEARANCE` (2.35 — enough
interior ceiling height for the tallest driver/character to stand and
walk normally, checked against `PhysicsController.PLAYER_HEIGHT`).

`houseDoorHalfWidth(width)` — the walkable doorway gap's half-width,
floored at a minimum that comfortably clears `PLAYER_RADIUS` (0.34) with
margin on each side, scaling up for wider houses. This was revised upward
once — a smaller minimum was numerically walkable but felt "too small to
enter" in practice (easy to clip the frame if not walking dead-center).

## Texture/drawing helpers

`shadeColor`, `makeSignTexture` (canvas-drawn name-sign sprite),
`roundRect`/`wrapText` (canvas drawing primitives `makeSignTexture` and
`makeWindowTexture` use), `makeWindowTexture` (a repeating window-grid
canvas texture, parameterized by color/column-count/row-count, used for
every building's wall material).

## `classifyHouse(h)`

Turns a house's `houseType` key (e.g. `"cottage_04"`, `"gated_manor_12"`)
into an actual architectural family via regex pattern matching —
`shack`/`cabin`/`cottage`/`terrace`/`ranch`/`farmhouse`/`colonial`/
`tower`/`villa`/`split`/`mansion`/`suburban`, each with a different roof
shape (`gable`/`hip`/`flat`/`shed`) and massing flags (`porch`, `chimney`,
`columns`, `balconies`, `turret`, `fenceTier`). A per-house deterministic
seed (hashed from the house's id/key) jitters the exact proportions within
a family so two houses in the same family still aren't geometric clones.
Falls back to a simple price-based heuristic for any `houseType` key that
doesn't match a known pattern, so a newly-added house type in the data
never hits an uncaught case.

## `zoneWallColor(zoneKey)`

Ties a building's wall tint to `WorldBuilder.js`'s `ZONE_THEME` palette
(imported from there) so buildings read as belonging to their zone.

## Massing detail helpers

`addColumns`, `addSkyscraperSetback`, `addRoofClutter` (civic/tower
building details), and the house-specific `addPorch`, `addChimney`,
`addBalconies`, `addTurret`, `addArchDoor` — each a self-contained,
independently callable piece of geometry, composed together in
`buildStructure`/`buildHouseShell` based on the resolved style flags.

## `addCategoryDetails(group, type, width, depth, wallHeight)`

A big dispatch table — one block per building `type` — adding a
type-specific silhouette detail: a hospital gets an illuminated red
cross, an embassy a flagpole+flag, a jeweler a faceted roof gem, a pearl
exchange a lustrous sphere, a gun store crossed rifles, a vehicle dealer a
glass showroom front + pennant flags, a smugglers' den deliberately dim
boarded-over windows (less eye-catching on purpose — it's meant to look
shut/easy to miss), a real estate agency a yard sign, electronics/marine
research a roof dish, and an oil rig an actual lattice derrick tower (not
just the shared factory smokestack). This dispatch table is also what
closed a real gap: roughly half the building `type`s in `worldData.js`
used to have **no entry in `TYPE_STYLE` at all** and silently rendered as
one identical generic gray box regardless of type — every type now has
both a `TYPE_STYLE` entry (floor count/roof/accent color) and, for the
types listed above, one of these silhouette details too.

## House interior — `addHouseFurniture`, `addStaircase`, `buildHouseShell`

- **`addHouseFurniture(group, { width, depth, seed })`**: a bed, a table +
  2 chairs, and a rug, deterministically varied per house (same seeding
  approach as `classifyHouse`/`CharacterModel.js`'s face genetics) so
  neighboring houses' interiors don't look identical. Only the bed frame
  and table top cast shadows — the rest (mattress, pillow, chair pieces,
  rug) don't, deliberately, since a house's furniture set repeated across
  100+ house instances was a meaningful chunk of the shadow-casting mesh
  count on the map; see the performance note in `GameEngine.md`.
- **`addStaircase(group, flight)`**: builds the visible steps + a simple
  railing for one `computeHouseStairs()` flight. Individual steps
  **don't** cast shadows (same performance reasoning — a full 13-step
  flight multiplied across 100+ multi-floor houses was over a thousand
  shadow-casting objects for a barely-visible effect); they still receive
  shadows/lighting normally.
- **`buildHouseShell(group, opts)`**: the function that replaces the
  single solid exterior box every other structure uses with a real
  walk-in shell — wall segments with the doorway gap (from
  `computeHouseWalls`, exterior-facing texture on the outward side,
  plain interior color on the inward side via a per-face material array),
  an interior floor, `addHouseFurniture`, a ceiling cap, and — for
  multi-floor houses — a floor platform **with a stairwell-shaped gap**
  (so the stairs actually lead somewhere instead of into the underside of
  a solid ceiling) plus `addStaircase` for each `computeHouseStairs()`
  flight.

## `addFenceAndGate(group, width, depth, tier)`

A decorative yard fence with a swinging gate centered on the front
(door-facing) side, sized by `tier` (`'none'`/`'low'`/`'mid'`/`'high'`,
from `classifyHouse`'s `fenceTier`). **Deliberately not a physics
collider** — it exists purely so the player can visually walk up and open
it; it never blocks a path that was walkable before this feature existed.
Returns the gate's hinge `THREE.Group` (or `null` for `'none'`), which
`GameEngine._updateDoorsAndGates` swings open/closed based on player
proximity, the same mechanism used for the building's own front door.

## `addRoof(group, style, width, depth, wallHeight, accentColor)`

One `case` per roof shape (`flat`/`dome`/`pediment`/`sawtooth`/`gable`/
`hip`/`shed`/`none`) — `hip` and `shed` were added specifically for the
richer house-archetype system (`classifyHouse`) and use different
`CylinderGeometry`/`BoxGeometry` constructions from the original `gable`
case rather than just reusing it at different proportions, so they read
as genuinely different roof *shapes*, not the same shape resized.

## `buildStructure(b, opts)`

The main export — `opts: { scale, zoneKey, kind }` (`kind` is `'building'`
or `'house'`). Resolves the style (via `TYPE_STYLE`/`classifyHouse`),
computes width/depth/floors/wallHeight (houses use `HOUSE_SIZE_MULTIPLIER`
and a much taller `HOUSE_FLOOR_CLEARANCE`-based floor height than regular
buildings — regular buildings' own floor height was separately increased
too, since it used to be *shorter than the character itself*, which is
the real reason a properly human-sized door couldn't fit in a short
building — there wasn't a full floor's worth of wall tall enough to put
one in), builds either the shared solid-box wall mesh (buildings) or
`buildHouseShell` (houses), adds the door (**hinged**, not a flat
decal — same swing mechanism as the yard gate, at a size — `doorW`/`doorH`
— generously larger than the character to actually look enterable, a
direct fix for the same "door felt too small" report as
`houseDoorHalfWidth`'s revision above), the yard fence/gate (houses only),
an awning (shops), and a floating name-sign sprite. Returns
`{ group, footprint, doorHinge, gateHinge }`.

## What depends on this file

`GameEngine._initWorld()` calls `buildStructure()` once per building and
once per house at map load, and swings `doorHinge`/`gateHinge` every
frame in `_updateDoorsAndGates`. `PhysicsController.js` imports
`computeHouseWalls`/`computeHouseStairs`/`computeHouseFloorPlatforms`
directly (see the shared-geometry contract above). `WorldBuilder.js`
imports `HOUSE_SIZE_MULTIPLIER` for apron sizing. `ZONE_THEME` is imported
**from** `WorldBuilder.js` (the dependency runs the other direction for
that one constant).
