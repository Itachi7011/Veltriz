# `engine/VehicleModel.js`

**One-line summary**: procedurally builds every car/truck/van/SUV/bike/
motorbike from primitive geometry — no imported models. This is the file
with the most subtle, easy-to-get-backward geometry in the project; read
the "conventions" section before changing anything here.

## The two conventions this file is built on — get either backward and things look broken in ways that are hard to diagnose from code alone

1. **Chassis length runs along local X, width along local Z** (from
   `new THREE.BoxGeometry(dims.len, dims.h, dims.w)` — the constructor
   order is X,Y,Z size). Headlights sit at `+X` (front), taillights at
   `-X` (back).
2. **A wheel's axle has to be built along local Z** (the chassis's width
   axis), not X — because the axle is what connects a left wheel to a
   right wheel *through* the vehicle body, i.e. sideways, matching
   convention #1. `CylinderGeometry`'s default axis is Y, so it needs a
   90° rotation around **X** (which sends Y→Z) to land on the correct
   axle axis — rotating around **Z** instead (which sends Y→X) was a
   real, shipped bug: it laid every wheel down face-first toward the
   front/back of the car instead of sideways, making them read as
   paper-thin slivers from the normal side view and spin around the wrong
   axis entirely. If you're touching `wheel()`, this is the single most
   important thing to not get backward again — and it's cheap to verify:
   build the wheel, check its geometry's bounding sphere is circular in
   the X-Y plane and thin along Z, exactly the kind of check described in
   `SETUP_AND_DEVELOPMENT.md`.

Both conventions were verified — not just derived on paper — by building
the actual geometry and measuring headlight/nose-marker world positions
against the vehicle's own movement direction. If you change chassis
proportions significantly, re-running that same kind of check before
trusting the result by eye is cheap insurance.

**A third, separate bug worth knowing about even though it isn't an axis
convention**: a pickup truck's cab (and the driver seat with it) used to
be positioned at the *rear* of the chassis (near the taillights) with the
cargo bed at the *front* (near the headlights) — completely swapped from a
real truck. The heading/movement/wheel-axis math was all independently
verified correct at the time, so a "the truck drives backward" report
turned out to be a **body-part placement bug**, not a rotation-formula
bug. If a similar report comes up for a specific vehicle kind again,
check for a swapped/misplaced part before re-doubting math that's already
been verified.

## `VEHICLE_CATALOG`

The full roster — each entry: `key`, `name`, `kind`
(`car`/`suv`/`truck`/`van`/`bike`/`motorbike`), and for bikes a `frame`
sub-type (`'bicycle'`/`'stepthrough'`/`'motorbike'`, driving proportion
choices in `buildBikeLike`). This is what `VehicleSystem._spawnOne` picks
randomly from and what `buildVehicle(key)` looks up.

## `BODY_COLORS` / `accentOf(color)` / `shade(hex, amt)`

The paint palette, and two small color-math helpers — `accentOf` picks a
lighter contrasting shade of the same base color (used for the two-tone
roof/trim look) and `shade` is the general lighten/darken-by-amount
primitive both use.

## `wheel(radius, width)`

Builds one wheel: a `CylinderGeometry` tire (axle-axis-correct per
convention #2 above), a metallic hub cylinder, and 5 spoke boxes swept
around the hub via `rotation.z` at even angular intervals. Reused
identically by both `buildCarLike` and `buildBikeLike`.

## `glassMat()` / `lightMat(color)`

Shared materials: a semi-transparent double-sided glass material (used
for all cabin windows — see below) and an emissive "light" material
(reused for headlights, taillights, brake lights).

## `buildCarLike(kind, color)`

Builds `car`/`suv`/`truck`/`van`. Dimensions are sized close to real-world
scale (a sedan is ~4.4m long) specifically so a driver — built with
`CharacterModel.js`'s `buildCharacter()` — actually fits inside with
headroom to spare (verified by measuring the actual character rig's
height against the actual roof height, not assumed).

Key structure:
- **A real transparent "greenhouse" cabin** — a roof panel, a lower sill,
  corner pillars, a B-pillar (except trucks), and **separate glass panes**
  for the windshield, rear window, and both side windows — not a solid
  box with a translucent box awkwardly overlapping it (an earlier version
  did exactly that, which is why the driver used to be invisible/hidden
  while "inside" a car — a solid opaque shell around them regardless of
  any translucent material nearby).
- **Truck-specific**: a cargo bed with floor slats, positioned in the
  **rear** half (`-X`, behind the cab) — see the cab/bed swap bug
  described above.
- **A door-seam line, side mirrors, a random 50%-chance racing stripe per
  instance** (so two parked cars of the same model don't look identical),
  and a **hinged trunk** (cars/SUVs/vans only, not trucks) — the same
  hinge-and-swing pattern `BuildingBuilder.js` uses for doors/gates,
  opened via `VehicleSystem.toggleTrunk()`.

Returns `{ group, wheels, kind, length, width, height, seatY, seatX,
trunkHinge }` — `seatY`/`seatX` are **local, pre-rotation** coordinates
(see `buildVehicle`'s docs below for how they get converted).

## `buildBikeLike(kind, frame, color)`

Builds `bike`/`motorbike` — a simpler frame-tube + seat + handlebar
construction, using the same chassis-front-is-+X and wheel-axle-is-Z
conventions. Riders sit **on top of** a bike rather than inside a cabin
(no headroom concern the way cars needed fixing for), so this file's
dimensions needed a more modest ~20% size-up (to match the now-larger
cars) rather than the fuller redesign `buildCarLike` needed.

## `buildVehicle(vehicleKey)`

The public entry point — looks up the catalog entry, dispatches to
`buildCarLike`/`buildBikeLike`, then wraps the result in an **outer**
group with a fixed `rotation.y = -Math.PI / 2` **inner** rotation, so that
the model's own local +X front (convention #1) ends up pointing along the
*outer* group's local +Z — matching the `(sin(heading), cos(heading))`
forward basis every heading-based system in the engine shares (see
`CameraRig.md`/`VehicleController.md`). This inner/outer split is why
`seatX` (a value along the inner model's own +X) needs the same rotation
applied to become a usable offset in world space — done via
`entry.seatForwardOffset` (exposed on the returned object precisely so
callers don't have to re-derive this themselves) which
`VehicleSystem._syncDriver` projects along the outer heading using
`sin`/`cos`, exactly the same forward basis.

Returns `{ group, innerGroup, wheels, kind, height, seatHeight,
seatForwardOffset, length, width, trunkHinge, def }` —
`innerGroup` is exposed specifically so anything needing to reason about
the model's own pre-rotation local space (e.g. placing a marker at the
model's true front for testing) doesn't have to fight the outer rotation.

## What depends on this file

`VehicleSystem.js` is the sole direct consumer — calls `buildVehicle()`
per spawn and reads every field on the returned object described above.
`PhysicsController.js` does **not** import from here; it receives vehicle
collider data already computed by `VehicleSystem.getVehicleColliders()`.
