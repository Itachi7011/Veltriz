# `engine/VehicleSystem.js`

**One-line summary**: owns the pool of active vehicles on the map (parked,
AI-driven, or player-driven), spawns/despawns them around the player like
`NpcSystem` does for pedestrians, syncs each one's visual transform and
driver rig every frame, and handles enter/exit/carjack/trunk interactions.

## `randomFrom(arr)` / `randomDriverAppearance()`

Trivial random-pick helper and a randomized `buildCharacter()` appearance
generator for AI drivers — includes a fresh random `faceSeed` per spawn so
two AI drivers that happen to roll a similar color palette still get
visibly different faces (see `CharacterModel.md`'s face-genetics system).

## `applyDrivingPose(bones)`

A static seated pose (bent knees, hands forward on the wheel/handlebar,
feet toe-down on the pedals) applied to a driver's rig bones, finished
with `applyGripPose(bones, 'Left'/'Right', 0.9)` — imported from
`CharacterModel.js` — so both hands visibly wrap around the wheel/
handlebar grips instead of resting open in mid-air.

## `class VehicleSystem`

### `constructor({ scene, mapConfig, scale, colliders })`

`colliders` is the solid-box list (`PhysicsController.getColliders()`) —
same reasoning as `NpcSystem`: vehicles have no interior-navigation logic
either, so they treat houses as fully solid.

### `_blockedAt(x, z, radius = 1.2)`

Same pattern as `NpcSystem`'s version, sized for a vehicle-scale
avoidance radius rather than a pedestrian one.

### `_pickSpawnPoint(playerPos)` / `_pickWanderTarget(anchor)`

Population-management spawn/wander-target picking, same shape as
`NpcSystem`'s equivalents.

### `_spawnOne(playerPos)`

Picks a random vehicle key from the catalog, calls
`buildVehicle(key)` (`VehicleModel.js`), and rolls whether this instance
is AI-driven (`AI_DRIVER_FRACTION`) — only AI-driven vehicles get a
`driverRig` built at spawn (`buildCharacter(randomDriverAppearance())`);
plain parked vehicles have `driverRig: null`. This distinction matters:
`getNearestEnterable()` below explicitly excludes AI-driven vehicles, so a
plain `enter()` can never encounter one that already has a driver to worry
about — only `carjack()` (for `getNearestJackable()` results) does, and it
explicitly tears the phantom driver down. **This split is deliberate and
avoids a real class of bug** (a leftover "ghost" driver rig sitting
frozen in a seat the player then also occupies) — worth understanding
before changing the enter/carjack split.

### `update(dt, playerPos, now)`

Per-frame: population spawn/despawn (like `NpcSystem`), and for each
active vehicle: if AI-driven, runs `_updateAiDriver`; always calls
`_syncVisual` and `_syncTrunk`; if it has a `driverRig` **and isn't the
vehicle the local player is currently driving**, calls `_syncDriver`
(skipped for the player's own vehicle because `GameEngine._updateDriving`
positions the player's own rig directly instead — see `GameEngine.md`).

### `_syncTrunk(entry, dt)`

Eases `entry.trunkHinge`'s rotation toward open/closed based on
`entry.trunkOpen` — same lerp-toward-target pattern as
`GameEngine._updateDoorsAndGates`'s building door/gate hinges.

### `_updateAiDriver(entry, dt, now)`

A simple closed-loop proportional steering controller: computes the
heading error to the current wander target
(`targetHeading = Math.atan2(dx, dz)`, `diff = targetHeading - heading`)
and feeds `steer` proportional to that error into the same
`VehicleController.update()` every player-driven vehicle uses. **This is
inherently self-correcting regardless of the steer-sign convention
elsewhere** — since it's a closed loop reducing its own measured error,
it converges correctly even independent of exactly which way "positive
steer" turns the vehicle, which is why AI driving direction never needed
the same investigation/fixes the player's own keyboard-to-steer mapping
did (see `GameEngine.md`'s input-mapping history).

### `_syncDriver(entry, now)`

Positions the driver rig at the vehicle's actual seat location — **not**
the vehicle's geometric center — using `entry.seatForwardOffset` (from
`VehicleModel.js`, projected along the vehicle's own forward axis via
`sin`/`cos` of `heading`) and `entry.seatHeight` corrected by the rig's own
`hipOffset` (see `CharacterModel.md` for why: the rig's root represents
ground/feet level, with the hips sitting a fixed distance above it, so
placing the root directly at seat height would leave the driver floating
a hip-height too high — a bug that was really the root cause of what once
looked like "the character is sitting wrong" reports). Sets
`rotation.y = heading + Math.PI` (the same front-convention offset as
every other character-facing calculation in the project) and calls
`applyDrivingPose`.

### `_syncVisual(entry)`

Positions/rotates the vehicle mesh itself (`rotation.y = heading`, no
offset — a vehicle's own local front convention is different from a
character rig's, see `VehicleModel.md`), turns the front wheel pivots to
`steerAngle`, and spins every wheel mesh's `rotation.z` by `wheelRoll`
(not `.x` — see `VehicleModel.md`'s wheel-axle-axis explanation for why Z
is correct here specifically).

### `applyCulling(playerPos, maxDist)`

Visibility toggling by distance, same pattern as `NpcSystem`.

### `getNearestEnterable(playerPos)` / `getNearestJackable(playerPos)`

`getNearestEnterable` returns the closest **unoccupied, non-AI-driven**
vehicle within `ENTER_DIST` (sized generously — up to ~5m — since vehicles
were scaled up to real-world dimensions; see `VehicleModel.md`).
`getNearestJackable` returns the closest **occupied/AI-driven** vehicle
within `JACK_DIST`, for the carjack flow.

### `getVehicleColliders()`

Builds the per-frame dynamic collider list `PhysicsController` needs for
on-foot player-vs-vehicle collision (see `PhysicsController.md`) —
`{ x, z, heading, halfLen, halfWid }` for every visible active vehicle
except the one the player is currently driving.

### `toggleTrunk(entry)`

Flips `entry.trunkOpen`; returns the new state, or `null` if this vehicle
has no `trunkHinge` (bikes/motorbikes don't).

### `enter(entry)` / `carjack(entry)` / `exit()`

`enter()` is the plain "get in a parked, unoccupied vehicle" path.
`carjack()` is the same but for an AI-driven vehicle — additionally tears
down that vehicle's `driverRig` (see `_spawnOne`'s note above) and stops
its AI driving. `exit()` computes a clearance offset sized to the
vehicle's actual `width` (not a fixed constant — this was a real bug once
vehicles were resized larger: a fixed offset that used to safely clear a
small vehicle started dropping the player back inside the new, bigger
one's collider) and returns the drop-off position/heading for
`GameEngine` to restore the on-foot physics body to.

### `dispose()`

Removes every active vehicle (and driver rig, where present) from the
scene.

## What depends on this file

`GameEngine.js` owns the one instance — nearly every driving-related
method (`_toggleVehicle`, `_updateDriving`, `_toggleNearestTrunk`) calls
into this class. Imports `buildVehicle`/`VEHICLE_CATALOG` from
`VehicleModel.js`, `VehicleController` for the physics, and
`buildCharacter`/`animateCharacter`/`applyGripPose` from
`CharacterModel.js` for driver rigs.
