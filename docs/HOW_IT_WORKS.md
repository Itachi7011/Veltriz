# How It Works

This walks through the actual gameplay systems, front to back, at the level
of "why is it built this way" — not just "what file does this." For exact
function signatures, see the per-file docs in `modules/`.

## 1. The game loop

`GameEngine._tick(time)` is the single `requestAnimationFrame` loop
everything hangs off. Every frame, in order: movement (on-foot or driving),
remote-player interpolation, visibility culling (throttled — see below),
building/house/vehicle proximity checks, NPC/vehicle/world-event updates,
weapon updates, door/gate hinge animation, then the actual
`renderer.render(scene, camera)` call.

A few of these are deliberately **throttled** rather than run every frame
(culling every 300ms, for instance) because they're O(n) over every
building/house/NPC on the map and don't need 60Hz precision — see
`GameEngine.md` for exactly which.

## 2. On-foot movement (`PhysicsController`)

This is a **kinematic** controller, not a rigid-body physics simulation
(despite `cannon-es` being an installed dependency — see `TECH_STACK.md`).
Every frame it:

1. Computes a "wish direction" from WASD/arrow input, relative to the
   camera's current yaw (so "forward" always means "the direction the
   camera is looking," matching the third-person convention almost every
   game like this uses).
2. **Eases** the actual velocity toward that wish-direction at a fixed
   acceleration/deceleration rate — movement doesn't snap instantly to
   full speed or stop dead, it ramps over a few frames.
3. Resolves X and Z movement **independently** against a static list of
   axis-aligned rectangle colliders (every building, house, and obstacle
   is pre-computed into this list once at map load) — resolving each axis
   separately is what gives you "slide along a wall" instead of sticking
   dead when moving diagonally into a corner.
4. Separately, a second list of **vehicle colliders** is rebuilt every
   frame (vehicles move, so they can't be baked in once) and checked with
   real oriented-rectangle math (not just axis-aligned), so a car parked
   at an angle blocks correctly.
5. Applies gravity/jump vertically, independent of the horizontal checks.

### Houses are walk-in-able; other buildings are not

Every other building (shops, civic buildings, etc.) is one solid
axis-aligned rectangle — you can walk up to it and interact via a
proximity prompt, but not through it. **Houses are different**: their
collider is 4-5 separate wall segments (back, left, right, and the front
wall split around a doorway-width gap), built from the exact same numbers
`BuildingBuilder.js` uses to construct the visible walls, so the collision
gap and the visible doorway can never disagree. This is what lets a player
actually walk inside a house.

Critically, **NPCs and AI-driven vehicles use a different, second collider
list for houses** — a plain solid box, same as any other building — because
they have no interior-navigation logic at all. Without this split, NPCs
would wander (and AI cars would drive) straight through the new doorway
gaps into house interiors, which would look completely broken. This is a
sharp, deliberate architectural line: `PhysicsController.getColliders()`
(solid boxes, for NPC/vehicle AI) vs. the controller's own internal
`_blockedAt()` (wall segments with gaps, for the player only).

### Stairs, without touching normal ground physics anywhere else

Multi-floor houses have real, climbable staircases. The mechanism:
`PhysicsController._groundHeightAt(x, z, currentY)` returns `0` — literally
just the number zero — everywhere on the map **except** while standing
within a registered staircase or upper-floor footprint, where it returns
the interpolated step height (or the flat upper-floor height). Every other
part of gravity/jumping/landing is unchanged; it just clamps to this
(usually-zero) value instead of a hardcoded `0`. The one genuinely subtle
piece: the **same (x,z) column** can have a valid floor at several
different heights in a multi-storey house (ground floor, 2nd floor, 3rd
floor all stack on top of each other), so the height lookup picks the
**highest** registered floor that's within a small step-up tolerance of
where the player already was — this is what lets someone walk up a
staircase onto the 2nd floor without the 1st floor's flat ground
"winning" by default, while still landing on the right floor after an
ordinary jump.

## 3. The character rig (`CharacterModel.js`)

One shared procedural builder (`buildCharacter(appearance)`) is used for
the player, every pedestrian NPC, every faction/crowd-event NPC, every
remote multiplayer player, and every vehicle driver — there is no separate
"NPC model" system. Differentiation comes entirely from the `appearance`
object passed in (skin tone, hair, outfit, gender, build scale) plus a
deterministic **"face genetics"** system: a seeded PRNG resolves a full set
of facial proportions (one of 5 head-shape archetypes, eye/nose/mouth/ear
proportions, cheekbone prominence...) from that appearance object, so the
same appearance always produces the same face (stable across sessions),
but two different NPCs essentially never look alike, and a role (e.g.
police) can be biased toward a family of archetypes without losing
individual variation.

The rig is a real bone hierarchy (hips → torso → neck → head, plus
shoulder → upper arm → forearm → hand → 2-jointed fingers per side, and hip
→ upper leg → lower leg → ankle → foot per side), animated procedurally
every frame in `animateCharacter()` based on speed/grounded state/whether
it's currently on a staircase (a different, higher-knee-lift gait kicks in
specifically while climbing).

**One convention every consumer of this rig must respect**: the rig's own
local "front" is -Z, and a rig's root `rotation.y` must be set to
`someHeadingOrYaw + Math.PI` for it to visually face the direction it's
actually moving. This is *not* obvious from the geometry alone, and was
the source of a real, since-fixed bug where multiple call sites (pedestrian
NPC wander, crowd-event NPCs, remote multiplayer players) computed a
raw `Math.atan2(dx, dz)` without the `+ Math.PI` and consequently walked
backward, facing away from their own direction of travel. Every current
call site includes it; the module doc for `CharacterModel.js` explains the
underlying math so this doesn't get silently reintroduced.

## 4. Vehicles

`VehicleModel.js` procedurally builds every car/truck/van/SUV/bike/
motorbike from a shared set of primitives, sized close to real-world
dimensions (a sedan is ~4.4m long) specifically so the driver's rig — using
the same `buildCharacter()` above — actually fits inside with headroom, a
real transparent "greenhouse" cabin (separate glass panes on all 4 sides,
not a solid box), and a trunk that can be opened independently.

`VehicleController.js` is the actual per-vehicle physics: throttle/brake/
steer/handbrake in, a heading + speed out, using a chassis-local convention
where **length runs along local X, width along local Z** — this matters
because the wheel geometry's own rolling axis has to be built to match
(get the axis wrong and wheels render edge-on/nearly invisible from the
normal side view, which was a real bug here once — see `VehicleModel.md`).
A real, separately-confirmed bug also existed in a pickup truck's cab/bed
placement specifically — the cab (with the driver in it) was positioned at
the rear (near the taillights) and the bed at the front (near the
headlights), completely swapped from a real truck's layout. Even though
the heading/rotation math was verified correct multiple times, that
placement bug alone made the truck look and feel like it was driving in
reverse — worth remembering that "controls feel backward" can have a
geometry-placement root cause instead of a math one, and is worth checking
before re-doubting math that's already been verified.

`VehicleSystem.js` owns the pool of active vehicles on the map (parked +
player-driven + AI-driven), syncs each one's visual transform to its
controller's output every frame, and runs a simple closed-loop proportional
steering controller for AI drivers (compute the heading error to a wander
target, steer proportionally to reduce it — self-correcting regardless of
sign conventions elsewhere, which is why AI driving direction never needed
the same fixes the player's own steering input mapping did).

### The player-vs-camera-heading sync

While driving, the third-person camera's free-look yaw is intentionally
decoupled from the vehicle's heading (so you can look around/aim while
driving straight). Without anything else, this means getting into a
vehicle with the camera pointed some arbitrary direction (leftover from
walking around on foot) could make the driver's rig — which correctly
faces the vehicle's heading — look like it's facing the wrong way relative
to where the camera happens to be pointed. The fix: the camera's yaw is
hard-snapped to the vehicle's heading the instant you get in, then softly
eased to keep following the vehicle's heading every frame afterward
(mouse input still moves it instantly; it just drifts back within about a
second of no input).

## 5. Buildings and houses (`BuildingBuilder.js`)

Every building/house in the world data becomes a real extruded 3D
structure — walls, a pitched or flat roof depending on footprint/type, a
window texture grid, a hinged door, and (for civic/shop buildings) a
type-specific detail (a hospital gets a cross, a jeweler gets a roof gem,
an embassy gets a flagpole...). Houses additionally get a full walk-in
shell: real wall segments with a doorway gap (see §2 above), an interior
floor, basic furniture, and — for multi-floor houses — a real staircase to
an upper floor platform.

**Houses are classified into architectural families** (cottage, ranch,
colonial, villa, mansion, tower, etc.) from their `houseType` key via
pattern matching, each with a different roof shape and massing detail
(porch, chimney, columns, a turret for mansions), plus a deterministic
per-house seed so two houses in the same family still aren't exact clones.

**Both a decorative yard fence/gate and the building's own front door are
real hinge objects** the player can watch swing open on approach and closed
on leaving — driven by `GameEngine._updateDoorsAndGates()`, which eases
each hinge's rotation toward an open/closed target based on distance, for
every door/gate currently rendered (culled entries are skipped, so this
cost tracks the visible set, not the whole map).

## 6. NPCs (`NpcSystem.js`, `WorldEventSystem.js`)

Pedestrian NPCs are spawned near roads/building anchors and wander between
randomly-picked nearby targets, occasionally stopping to use a phone
(`applyPhonePose`) or getting chased/fleeing during a nearby crime. A small
fraction are tagged `role: 'police'` and spawn near police stations.
`WorldEventSystem` layers scripted **crowd events** on top (protests,
faction clashes) with their own simpler approach/react AI, reusing the same
character rig and reusing `PhysicsController`'s collider list for
obstacle avoidance.

NPCs are purely a client-side visual/wander simulation — the actual
*economic* NPC population (NPCs holding jobs, buying/selling on the market,
moving real prices) is a completely separate, server-side system living in
`simulation-service`, with no connection to these visible wandering models.
See `simulation-service`'s own README for that.

## 7. Crime, economy, and every other "walk up to a building, press E" system

This is the same shape every time, described in `ARCHITECTURE.md`'s
request-flow example: `GameEngine` detects proximity → emits a `gameEvents`
event → a React panel opens and calls the owning backend service directly
over HTTP with the player's JWT → the service updates its own MongoDB
collections (occasionally calling one other service internally, e.g. crime
paying out through economy) → the response updates the panel and, via
`gameEvents`, anything in the engine that needs to react (heat-triggered
police behavior, a stat bump reflected on a HUD widget, etc).

## 8. Multiplayer

One Socket.IO connection per client to `game-world-service`. Each client
periodically emits its own position/heading; the server rebroadcasts other
connected players in the same map area; `GameEngine._updateRemoteInterpolation()`
eases other players' rendered rigs toward their latest broadcast position
every frame rather than snapping, so movement looks smooth despite updates
arriving at a lower rate than 60Hz. There is no server-side movement
validation — see `FUTURE_SCOPE.md`.

## 9. Settings and graphics quality

`GameEngine` persists a small settings object to `localStorage`
(`loadStoredSettings`/`saveStoredSettings`) covering graphics quality
(Low/Medium/HD — each a real preset of pixel ratio cap, shadow
enable+resolution, fog distance, and render/cull distance, applied live
except antialiasing which is fixed at renderer creation), audio levels,
mouse sensitivity, and invert-Y. The Settings panel pushes changes via a
`gameEvents.emit('settings:update', patch)` — the same decoupled
pub/sub pattern used for the audio mute toggle — rather than needing a
direct reference to the running engine instance.
