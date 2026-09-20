# `engine/PhysicsController.js`

**One-line summary**: the player's on-foot kinematic movement — collision,
gravity/jump, stairs — deliberately hand-written instead of using a
rigid-body physics engine.

## Why this exists instead of a real physics engine

`cannon-es` is an installed dependency (see `TECH_STACK.md`) but is not
used here. The module-level doc comment explains why: a rigid-body solver
was producing a real bug class where horizontal wall collisions could
inject *vertical* velocity (the player would pop upward when walking into
a wall at certain angles). This controller sidesteps that entire bug class
by construction — horizontal collision is a pure X/Z circle-vs-rectangle
test with zero vertical component, and vertical movement is pure gravity
against a ground-height function that horizontal collision can never
touch. Simpler, fully deterministic, and structurally incapable of that
bug reappearing.

## Constants

| Constant | Value | Notes |
|---|---|---|
| `GRAVITY` | -22 | units/s² |
| `WALK_SPEED` | 8.5 | "2.5x the original 3.4" per the inline comment — bumped when vehicles/world were scaled up to real-world proportions |
| `RUN_SPEED` | 17 | Shift key |
| `SKATE_SPEED` / `SKATE_BOOST_SPEED` | 24 / 34 | skateboard mode, with/without Shift |
| `JUMP_SPEED` | 7.2 | initial upward velocity on jump |
| `PLAYER_RADIUS` | 0.34 | the on-foot collision circle's radius, in world units |
| `PLAYER_HEIGHT` | 1.75 | referenced by other modules (e.g. vehicle cabin headroom checks) via the exported `PLAYER_DIMENSIONS` |
| `TERMINAL_VELOCITY` | -30 | falling speed cap |
| `MOVE_ACCEL` / `MOVE_DECEL` | 42 / 60 | units/s² — reaches walk speed in ~0.2s, run speed in ~0.4s; decel is snappier than accel so stopping doesn't feel like sliding on ice |

## `class PhysicsController`

### `constructor({ mapConfig, scale })`

Builds two separate static collider lists (see `_buildColliders` below)
and the staircase/floor "ramp" list (`_buildRamps`), then initializes
`position`, `velocity`, `velocityY`, `isGrounded`. `vehicleColliders`
starts empty — it's rebuilt every frame by the caller (see
`setVehicleColliders`).

### `getColliders()`

Returns `this._solidColliders` — **not** `this.colliders`. This is the
list NPC wander-avoidance (`NpcSystem`) and AI vehicle pathing
(`VehicleSystem`) read. It represents every house as one solid rectangle,
deliberately different from the player's own collision list (see below),
because NPCs/AI drivers have no interior logic and should keep treating
houses as fully solid, exactly like every other building.

### `_buildColliders(mapConfig)`

Builds **two** parallel lists from the same map data:

- `colliders` (used internally by `_blockedAt`, i.e. the **player's own**
  collision): buildings and obstacles as solid axis-aligned rectangles
  (with a small inward margin so the wall doesn't feel like an invisible
  force-field before the visible wall); houses as **wall segments with a
  doorway gap** via `computeHouseWalls()` (imported from
  `BuildingBuilder.js` — the same function that builds the visible walls,
  so the collider and what you see can never disagree).
- `_solidColliders` (returned by the public `getColliders()`, for NPCs/AI
  vehicles): buildings, obstacles, **and houses** all as plain solid
  rectangles — no doorway gap.

This split is the entire reason a player can walk into a house while NPCs
and AI-driven cars still route around it as a solid obstacle.

### `_buildRamps(mapConfig)`

For every house, concatenates `computeHouseStairs()` (one entry per floor
transition — a sloped "ramp" from one floor's height to the next) and
`computeHouseFloorPlatforms()` (one flat "zero-slope ramp" per floor above
ground level, representing the upper floor itself) into `this.ramps`. Both
imported from `BuildingBuilder.js`, same shared-numbers reasoning as
`computeHouseWalls`.

### `_groundHeightAt(x, z, currentY)`

Returns `0` (normal ground) everywhere except inside a registered ramp
footprint, where it returns the interpolated step/floor height. Loops
`this.ramps`, and for anything overlapping `(x,z)`, computes
`t = clamp01((r.startZ - z) / r.run)` and `h = lerp(r.fromY, r.toY, t)`
(for a flat platform, `fromY === toY` so `h` is just that constant
regardless of `t`).

**The one subtlety**: multiple ramps can validly overlap the same `(x,z)`
column in a multi-storey house (a 3-floor house has floor-1, floor-2, and
floor-3 all stacked at the same footprint). Among every overlapping
candidate, this picks the **highest `h` that's within 0.35 units of
`currentY`** — not just the highest overall. That tolerance is what lets a
player standing on the 2nd floor (with the 1st floor's `h=0` also
technically "underneath" at the same `(x,z)`) keep resolving to the 2nd
floor's height instead of snapping back to the ground, while still
correctly climbing a staircase step-by-step rather than the top floor's
flat height "winning" prematurely while still partway up.

### `_blockedAt(x, z)` / `_blockedAtVehicle(x, z)`

`_blockedAt` checks the player's own `this.colliders` (static,
axis-aligned, with the doorway gaps) with a cheap axis-aligned bounding
check before the precise circle-vs-rectangle test, then falls through to
`_blockedAtVehicle` for the dynamic vehicle list.

`_blockedAtVehicle` is a **real oriented-rectangle** test, not
axis-aligned — vehicles move and turn, so a parked car at 37° still has to
block correctly. It rotates the world-space offset into the vehicle's own
local frame using `sin`/`cos` of the vehicle's `heading` (same
forward/right basis as everywhere else in the engine — see
`CameraRig.md`/`VehicleController.md`) before doing the closest-point
check.

### `setVehicleColliders(list)`

Called once per frame by `GameEngine` with every vehicle on the map
**except the one the local player is currently driving** (that vehicle's
on-foot physics body is frozen — see `GameEngine._updateDriving` — so it
can never collide with itself). Each entry:
`{ x, z, heading, halfLen, halfWid }`.

### `setSpawn(x, z)`

Used when exiting a vehicle or respawning. If the exact point is inside a
collider (a data edge case), nudges outward along a small spiral search
rather than leaving the player stuck. Always resets to `y = 0` (ground
level — vehicles never park inside a house, so this is safe).

### `update(dt, { forward, strafe, facingYaw, running, jumpPressed, skateboarding })`

The per-frame entry point. In order:

1. Picks a target speed from `running`/`skateboarding`.
2. Computes a wish-direction from `forward`/`strafe` relative to
   `facingYaw` (camera yaw) using `wishX = forward·sin(yaw) - strafe·cos(yaw)`,
   `wishZ = forward·cos(yaw) + strafe·sin(yaw)` — this is the forward/right
   basis every other heading-based system in the engine also uses (see
   `CameraRig.md` for the derivation of why `(sin,cos)` is "forward" and
   `(-cos,sin)` is "right" in this codebase's specific convention).
3. **Eases** `this.velocity` toward that target at `MOVE_ACCEL`/`MOVE_DECEL`
   rather than snapping — this is the movement-smoothing fix (see
   `HOW_IT_WORKS.md` and this file's own history for why it was added).
4. Resolves X and Z **independently** against `_blockedAt` — moving
   diagonally into a wall slides along it instead of sticking, for free,
   because only the axis that's actually blocked gets rejected. On a
   blocked axis, that axis's velocity is explicitly zeroed (**important**:
   without this, a later frame's still-nonzero velocity would keep
   "pressing" into the wall every frame it's held).
5. Gravity/jump against `_groundHeightAt`, entirely independent of the
   horizontal checks above.

### `getPosition()` / `dispose()`

Trivial accessor / collider-list clear.

## What depends on this file

- `GameEngine.js` owns the one `PhysicsController` instance, calls
  `update()` every frame with input derived from keys + camera yaw, and
  reads `.position`/`.isGrounded`/`.onRamp`/`.velocity` to drive both the
  player rig's transform and its walk-cycle animation parameters.
- `NpcSystem.js` and `VehicleSystem.js` read `getColliders()` for
  wander-target/pathing avoidance (the solid-box version, not the
  player's doorway-gap version).
- `BuildingBuilder.js` doesn't import from here, but this file imports
  three functions **from** it (`computeHouseWalls`, `computeHouseStairs`,
  `computeHouseFloorPlatforms`) — those are the shared-source-of-truth
  functions that keep the visible house geometry and this file's collision
  geometry from ever disagreeing. If you change a house's wall thickness,
  doorway width, or floor height in `BuildingBuilder.js`, this file's
  collision automatically follows — there's nothing to keep in sync by
  hand.
