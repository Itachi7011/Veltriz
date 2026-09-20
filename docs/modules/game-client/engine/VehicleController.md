# `engine/VehicleController.js`

**One-line summary**: per-vehicle arcade driving physics — throttle,
brake, reverse, speed-dependent steering, handbrake, collision with the
same building/house footprints the player walks around on foot. One
instance per active vehicle on the map (player-driven, AI-driven, or
parked-but-simulated).

Same "deliberately not a real physics engine" philosophy as
`PhysicsController.js`, for the same reason — see that file's doc.

## `KIND_TUNING`

Per-vehicle-kind stats: `maxSpeed`, `accel`, `brake`, `reverseMax`,
`turnRate`, `drag`, `footprint` (collision radius). Six kinds: `bike`,
`motorbike`, `car`, `truck`, `van`, `suv` — heavier/larger vehicles
(truck, van) get a lower `turnRate` and larger `footprint`, matching their
`VehicleModel.js` dimensions.

## `class VehicleController`

### `constructor({ x, z, heading, kind, speedMultiplier, colliders })`

Copies the tuning table for `kind` (falls back to `car` tuning for an
unrecognized kind) and applies `speedMultiplier` to `maxSpeed` — used for
event-driven speed boosts elsewhere in the engine. `colliders` is the
**static** building/house/obstacle list (via `PhysicsController.getColliders()`
— the solid-box version, since a vehicle has no interior logic any more
than an NPC does).

### `_blockedAt(x, z)`

Same closest-point circle-vs-rectangle test as `PhysicsController`'s
version, but the "circle" here is the vehicle's own `tuning.footprint`
radius rather than `PLAYER_RADIUS` — a simplification (a real car isn't a
circle) that's good enough for "don't let cars drive through buildings"
without needing oriented-rectangle math for every vehicle-vs-building
check (unlike vehicle-vs-vehicle collision in `PhysicsController`, which
*does* need to be oriented since vehicles can be parked at any angle —
this file's own collision is only ever against axis-aligned static
buildings, so a circle approximation is fine here specifically).

### `update(dt, { throttle, steer, handbrake })`

1. **Speed**: handbrake decelerates toward 0 regardless of sign; positive
   throttle while moving in reverse brakes first (doesn't allow reversing
   straight into forward accel, has to pass through 0); positive throttle
   while stationary/forward accelerates toward `maxSpeed`; the mirror
   logic for negative throttle (reverse), with reverse acceleration scaled
   by `0.6` (reversing is slower to speed up than driving forward); zero
   throttle applies `drag` decay toward 0 either direction.
2. **Steering**: `speedFactor = min(1, |speed|/3)` — steering input has
   very little effect at near-zero speed (can't turn while stationary,
   matching real vehicles) and full effect once above a small speed
   threshold. `steerDir` flips when `speed < 0` — steering while reversing
   turns the vehicle the opposite way it would going forward, matching how
   a real steering wheel behaves in reverse. `heading += steer · turnRate
   · speedFactor · steerDir · dt`.
3. **Movement**: `dx = sin(heading)·speed·dt`, `dz = cos(heading)·speed·dt`
   — the same `(sin,cos)` forward basis as `CameraRig`/`PhysicsController`
   (see `CameraRig.md`), meaning at `heading = 0` the vehicle moves toward
   `+Z`, and (per `VehicleModel.js`'s construction) that's also the
   direction its headlights face — **verified**, not assumed; see
   `VehicleModel.md`'s empirical-test note, since this exact relationship
   was the subject of a real, carefully-investigated bug report that
   turned out to have a different root cause (a truck's cab/bed were
   swapped) rather than this formula being wrong.
4. **Collision**: X and Z resolved independently (same "slide along a
   wall" benefit as `PhysicsController`); on either axis being blocked,
   speed is slashed to `15%` of its value and `lastCrashAt` is stamped
   (available for a screen-shake/crash-sound effect elsewhere, if wired
   up).
5. `wheelRoll` accumulates proportional to speed — this is the value
   `VehicleSystem._syncVisual` uses to spin the wheel meshes around their
   axle axis (see `VehicleModel.md` for why that axis is local **Z**, not
   X, on this project's specific chassis convention).

### `setSpawn(x, z, heading)`

Resets position/heading and zeroes speed — used when a vehicle is first
placed and when a player exits/re-enters.

### `getTransform()`

The per-frame read-out `VehicleSystem`/`GameEngine` use to position the
visible model, the driver rig, and the camera:
`{ x, y, z, heading, speed, steerAngle, wheelRoll }`.

## What depends on this file

- `VehicleSystem.js` owns one `VehicleController` per active vehicle,
  calls `update()` every frame with input from either the player's
  keyboard (see `GameEngine._updateDriving`) or its own AI proportional
  steering controller (`_updateAiDriver`), and reads `getTransform()` to
  drive the visible mesh, the driver rig, and (for the player's own
  vehicle) the camera.
- `GameEngine.js` reads `getTransform().heading`/`.speed` directly in a
  couple of places (camera framing, HUD speed display).
