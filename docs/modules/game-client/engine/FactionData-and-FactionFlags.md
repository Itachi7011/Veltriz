# `engine/FactionData.js` + `engine/FactionFlags.js`

**One-line summary**: the static roster of fictional political
parties/gangs, and the canvas-texture flag sprites built from that data —
both entirely invented for this game (see the file-level comment: not
real-world parties, people, or criminal organizations).

## `FactionData.js`

### `POLITICAL_PARTIES`

Three fictional parties (`unity`, `reform`, `progress`), each with a
`key`, display `name`, `short` abbreviation, brand `color`, and an
`emblem` id (consumed by `FactionFlags.js`'s `drawEmblem`). Ties into
`game-world-service`'s own Government/Election models — this is the
client-side rendering data for factions that exist authoritatively on the
backend.

### `GANGS`

Three fictional criminal factions (`ironclaw`, `redtide`, `duskrunners`),
same `key`/`name`/`color`/`emblem` shape, one field shorter (no `short`
abbreviation — gangs don't get a ballot-style acronym).

### `twoRivals(list)`

Picks two **distinct** random entries from either list (rejection-samples
until `b.key !== a.key`) — used by `WorldEventSystem.js` to pick the two
opposing sides of a scripted crowd event (a political rally or gang
clash).

## `FactionFlags.js`

### `drawEmblem(ctx, emblem, cx, cy, r, color)`

A 2D canvas drawing function — one `case` per emblem id (`star`, `leaf`,
`torch`, `claw`, `wave`, `bolt`), each hand-drawn with canvas path
commands centered at `(cx, cy)` with radius `r`. Not exported; internal
to this file.

### `makeFlagTexture(faction)` *(internal, not exported)*

Draws a small canvas (background in the faction's `color`, emblem on top
via `drawEmblem`), wraps it in a `THREE.CanvasTexture`, and caches the
result in a module-level `Map` keyed by faction key — the same texture
object is reused for every NPC carrying that faction's flag rather than
re-rendering the canvas per-NPC.

### `buildFactionFlag(faction)`

Builds a small `THREE.Sprite` (a billboard that always faces the camera)
using the cached texture, sized to float above an NPC's head. Returns it
**hidden** (`visible = false`) — the caller (`WorldEventSystem.js`) shows
it only for NPCs actively participating in a crowd event. `sprite.raycast
= () => {}` disables raycasting against it, same reasoning as the building
name-sign sprites in `BuildingBuilder.js` — a floating icon shouldn't be
something the camera's wall-collision raycast can hit.

## What depends on these files

`WorldEventSystem.js` is the sole consumer — picks two rival factions via
`twoRivals()` when starting a scripted crowd event, and attaches a
`buildFactionFlag()` sprite to each participating NPC, toggling its
visibility for the event's duration.
