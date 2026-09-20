# `engine/WorldBuilder.js`

**One-line summary**: the ground plane — zone terrain/grass, road grid,
zone name labels, and the paved sidewalk "apron" under every building and
house. Not the buildings/houses themselves (that's `BuildingBuilder.js`) —
just what they sit on.

## `ZONE_THEME`

A color palette per zone key (`old_meridian`, `neo_meridian`,
`dustridge_county`, `port_haven`, `veltriz_sea`, plus a `default`
fallback) — ground color, a second ground shade, label text color, road
color. Exported (`export { ZONE_THEME }`) — `BuildingBuilder.js` also
imports this for its own zone-tinted wall coloring, so a new zone only
needs its palette added here once.

## `grassTexture(theme)` / `roadTexture(theme)` / `sidewalkTexture()` *(internal)*

Each draws a small tileable pattern onto a `<canvas>` (a subtle two-tone
checker/noise for grass, lane-marking style stripes for roads, a
grid-of-slabs pattern for sidewalks) and wraps it as a
`THREE.CanvasTexture` with wrapping set to `RepeatWrapping` — these are
then `.clone()`'d with different `.repeat` values per use so one drawn
canvas serves the whole map's terrain instead of one texture per tile.

## `buildWorld(scene, mapConfig, scale)`

The main export, called once at world load by `GameEngine._initWorld()`.

1. **Ground planes**, one per zone, sized to that zone's `minX`–`maxX`
   span and the map's full height, using `grassTexture` — except
   `veltriz_sea`, which gets a lighter, glossier material (higher
   `metalness`, lower `roughness`, a pale blue tint) to read as water
   instead of land.
2. **Road grid**: within each non-water zone, a simple evenly-spaced
   perpendicular grid of road strips (spacing derived from the zone's
   size, roughly aiming for city-block-sized gaps — `blockX`/`blockZ`
   computed as `zoneWidth / 26`-ish). This is a purely visual grid; it has
   no relationship to `PhysicsController`'s collision system or to where
   NPCs/vehicles are allowed to path — nothing is actually constrained to
   stay on these roads.
3. **Zone name labels**: a `THREE.Sprite` per zone with the zone's name
   drawn onto a canvas, floating at a fixed height above the zone's
   center. `sprite.raycast = () => {}` — same reasoning as every other
   floating label/flag sprite in the project: a billboard icon shouldn't
   be hittable by `CameraRig`'s wall-collision raycast.
4. **Paved aprons**: a flat sidewalk-textured plane under every building
   and every house, sized to that structure's own footprint plus a small
   margin. **Houses and buildings are sized separately here**
   (`HOUSE_SIZE_MULTIPLIER`, imported from `BuildingBuilder.js`, applied
   only to houses) — this used to be one shared loop treating both the
   same way, which silently broke once houses were resized larger than
   buildings (see this file's own change history: houses' actual walls
   were overflowing past the edge of their own paved base once
   `HOUSE_SIZE_MULTIPLIER` was introduced in `BuildingBuilder.js`, since
   this file wasn't using that same constant). If you ever change how
   large houses render again, this is the other place that has to move
   with it — which is now guaranteed by construction, since both files
   import the same constant rather than each hardcoding their own copy of
   "how big is a house."
5. **Obstacles**: small concrete-block-styled boxes from `mapConfig`'s
   `obstacles` array.

Returns the assembled `THREE.Group` (already added to `scene`).

## What depends on this file

`GameEngine._initWorld()` calls `buildWorld()` once. `BuildingBuilder.js`
imports `ZONE_THEME` from here for wall tinting. Nothing else references
this file — it has no per-frame update, it's built once and never touched
again.
