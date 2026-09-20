# Future Scope

This is not the aspirational feature list from the root README's vision
section — it's a working list of specific, concrete gaps identified from
hands-on work extending this codebase, each with enough of an
implementation sketch that picking one up later doesn't require
re-deriving the approach from scratch.

## Near-term, contained follow-ups

### NPCs cannot enter houses
Houses got a real walk-in interior + collision model (see
`HOW_IT_WORKS.md` §2 and `BuildingBuilder.md`/`PhysicsController.md`), but
this was deliberately scoped to the **player only**. Pedestrian NPCs
(`NpcSystem.js`) have no pathfinding or reason to go near a house door at
all — they wander between random points on the open street grid. The
underlying physics mechanism (`PhysicsController._groundHeightAt`) is
already NPC-agnostic (it's just a spatial height lookup, not tied to "the
player" in any way), so an NPC positioned on a staircase would get the
right height for free. What's missing is entirely on the AI side: a
wander-target picker that occasionally chooses a nearby house's doorway,
walks the NPC through it, and a simple state machine for "inside a house,
wander this smaller interior footprint instead of the open street" before
walking back out. This is a genuinely new AI feature, not a physics one.

### Vehicle geometry needs the same empirical-test treatment applied to the rest
Wheel orientation and a truck's cab/bed placement both turned out to be
backward in ways that were only caught by building the actual geometry and
measuring it, not by reading the code (see `VehicleModel.md`). The other
vehicle kinds (van, SUV, bike variants) haven't had the same scrutiny
applied to every individual visual detail (mirror placement, wheel-arch
fit at extreme steering angles, etc.) — worth a pass if visual bugs are
reported for a specific kind.

### Scene complexity / performance
A real, measured performance pass already happened once (see
`GameEngine.md` for the specifics — a per-frame array-allocation bug and
blanket shadow-casting on tiny decorative meshes were both found and
fixed), but the underlying architecture still builds **every** building,
house (with full interior + furniture + stairs), and their contents for
the **entire map** unconditionally at load time, whether or not the player
will ever go near them. Visibility culling hides them, but the mesh/
geometry/material objects all exist in memory and in the scene graph from
the first frame. If the map grows further, the next real lever is one of:
- **Lazy interior construction**: only build a house's interior/furniture/
  stairs the first time the player gets within some proximity of it,
  instead of at world load.
- **Geometry instancing** for repeated small elements (wheel spokes,
  furniture, house wall segments) via `THREE.InstancedMesh` — most
  furniture pieces across 100+ houses are geometrically identical, just
  repositioned.
- **LOD**: swap distant characters/vehicles/buildings for a lower-segment-
  count version rather than relying on distance culling alone (currently
  an object is either fully rendered or not rendered at all — nothing in
  between).

### No server-side movement validation (multiplayer)
`game-world-service`'s Socket.IO position sync trusts whatever position a
connected client reports (see `ARCHITECTURE.md` §"Multiplayer sync
model"). There's no server-side speed/teleport sanity check. Fine for the
project's current scope; would need addressing before this could be
considered resistant to a modified client.

### No automated tests anywhere
Every verification claim in this codebase's recent history was done with
throwaway Node scripts that import the real module and assert on measured
geometry/physics output (see `SETUP_AND_DEVELOPMENT.md`). None of these
are checked into the repo as an actual test suite. The pattern is proven
to catch real bugs (several of the fixes referenced throughout these docs
were caught exactly this way) — turning the more load-bearing ones
(wheel/character orientation, physics collision math, settings
persistence) into a real `vitest`/`jest` suite committed to the repo would
turn "verified once by hand" into "protected against regressing again."

## Larger, more open-ended ideas

### A real content pipeline instead of procedural-only visuals
Every character/vehicle/building is built from primitive geometry in code
(see `TECH_STACK.md` for why). This keeps the visual layer diffable and
asset-free, but hand-tuning proportions in code has a real ceiling on
visual fidelity and variety compared to authored 3D models. If visual
quality needs to go further, introducing a glTF import pipeline
*alongside* (not necessarily replacing) the procedural system — e.g. for
hero/unique assets — is the natural next step, while keeping procedural
generation for the "hundreds of interchangeable NPCs/houses" case where it
genuinely earns its keep.

### API gateway / message queue, if the service count keeps growing
Current inter-service calls are direct `axios` HTTP with a shared internal
API key and no retry/backoff (see `ARCHITECTURE.md`). This is a reasonable
trade-off at 8 services; if more are added, or if any inter-service call
needs to be reliable across a downstream outage, this is where a queue
(the root README's vision section mentions BullMQ/Redis) would actually
start paying for itself rather than being premature infrastructure.

### Bringing the aspirational vision-doc features to parity
The root README's vision section describes a considerably larger game
(more zones, deeper economic simulation, etc.) than what's currently
implemented. None of that is contradicted by anything in this docs
folder — it's just out of scope for what currently exists, and revisiting
it would be a product-scoping exercise more than an engineering one.
