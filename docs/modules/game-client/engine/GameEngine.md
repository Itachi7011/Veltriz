# `engine/GameEngine.js`

**One-line summary**: the single class that owns the entire Three.js
scene, render loop, input, and every subsystem documented elsewhere in
this folder. Not a React component — a plain JS class `GamePage.jsx`
instantiates once and hands a `<div>` to. This is the file to start in if
you're trying to trace "what actually happens when the player presses a
key," since nearly every cross-subsystem interaction is wired here.

## `GRAPHICS_QUALITIES` / `GRAPHICS_PRESETS` / `loadStoredSettings` / `saveStoredSettings`

The Settings system's data (see `HOW_IT_WORKS.md` §9). Three presets
(`low`/`medium`/`hd`), each a full set of `pixelRatioCap`, `antialias`,
`shadows`(+`shadowMapSize`), and `houseRenderDist`/`buildingRenderDist`/
`nearbyCollidableDist`. `loadStoredSettings`/`saveStoredSettings` are
plain `localStorage` read/merge/write helpers, exported so
`SettingsPanel.jsx` can read the current values without needing a direct
engine reference.

## Constants

`CULL_TICK_MS` (300 — how often visibility culling re-evaluates, see
`_updateCulling`), `CRIME_INTERACT_DIST`, `BUST_DIST`.

## `class GameEngine`

### `constructor({ container, mapConfig, character, socket })`

Runs the `_init*()` sequence below in order (order matters — e.g.
`_initCamera()` must run before `_initCivicSystems()`, which calls
`applySettings()` and needs `this.cameraRig` to already exist).

### `_initThree()`

Reads the stored graphics quality (for the renderer's `antialias` flag —
a construction-time-only WebGL option), creates the scene/camera/
renderer/lights, then calls `applyGraphicsQuality(quality)` immediately
to apply everything else.

### `applyGraphicsQuality(quality)`

Callable anytime (constructor, or live from the Settings panel via
`applySettings`). Sets pixel ratio, `renderer.shadowMap.enabled` +
`sun.shadow.mapSize`, `scene.fog.near/far`, and `this.renderDist` (an
object `_updateCulling` and several proximity checks read instead of
hardcoded distances). Persists the choice.

### `_initWorld()`

Calls `buildWorld()` (`WorldBuilder.js`) for terrain/roads, then
`buildStructure()` (`BuildingBuilder.js`) once per building and once per
house, populating `this.buildingEntries`/`this.houseEntries` and a
precomputed `this._allStructureEntries` (the concatenation of both — kept
as a real array built once rather than re-spread every frame; see the
performance note under `_updateDoorsAndGates` below for why that matters).

### `_initPlayer()`

Builds the player's own rig via `buildCharacter()`.

### `_toggleSkateboard()`

Swaps in/out of the skateboard prop + pose.

### `_initPhysics()` / `_initNpcs()` / `_initVehicles()`

Constructs the one `PhysicsController`/`NpcSystem`/`VehicleSystem`
instance each, wiring the collider lists between them (see each file's
own doc for exactly which collider list each receives).

### `_initCivicSystems()`

Constructs `BillboardSystem`/`WorldEventSystem`, wires the
`'politics:start'`/`'audio:setMuted'`/`'settings:update'` `gameEvents`
listeners, and calls `this.applySettings(loadStoredSettings())` once to
apply whatever was last saved (this is what makes a returning player's
settings take effect on load, not just when they reopen the Settings
panel).

### `applySettings(patch = {})`

The single entry point for every settings change — both the initial load
above and every live change from `SettingsPanel.jsx` (via the
`'settings:update'` event) route through here. Applies whichever fields
are present in `patch` (graphics quality → `applyGraphicsQuality`; audio
levels → `this.audio.setXVolume`; sensitivity/invertY →
`this.cameraRig.sensitivity`/`.invertY`; `showFps` → `this.showFps`) and
persists the patch.

### `openPhone()` / `closePhone()`

Toggles the phone-call pose (`applyPhonePose`/`clearPhonePose` from
`CharacterModel.js`). `closePhone()` re-applies the weapon grip curl if a
weapon is currently equipped — otherwise relaxing the hand for the phone
would leave an equipped weapon looking like it's floating in an open palm.

### `_initCamera()`

Constructs the one `CameraRig` instance, passing `this.playerRig.group`
as its `characterGroup`.

### `_initWeapons()`

Constructs the one `WeaponSystem` instance.

### `_initInput()`

All raw `keydown`/`keyup`/mouse listeners. Every keybinding lives here —
this is the canonical list of what each key does. Notably:
`KeyF` **and** `Enter` both call `_toggleVehicle()` (fully interchangeable
by design, matching how building/house interaction already treats `E`/
`Enter` the same way in `GamePage.jsx`) — `Enter` used to only work for
buildings, not vehicles.

### `setInputEnabled(enabled)`

Called by `GamePage.jsx` whenever a UI panel opens/closes — disables key
processing (and releases pointer lock) while a panel has focus.

### `_wireSocket()` / `addRemotePlayer(p)` / `updateRemotePlayer(p)` / `removeRemotePlayer(userId)`

The multiplayer position-sync glue — see `ARCHITECTURE.md`'s multiplayer
section. Each remote player gets their own `buildCharacter()` rig, and
`updateRemotePlayer` just updates a `targetX`/`targetZ` the render loop
eases toward (see `_updateRemoteInterpolation` below), not a snap.

### `_tick(time)`

The `requestAnimationFrame` loop. Computes `dt`, optionally tracks/emits
FPS (throttled to every 250ms, only when `this.showFps` is on — costs
nothing when the setting is off), then runs, in order: movement, remote
interpolation, culling (throttled), building/house proximity (skipped
while driving), vehicle proximity, NPC/vehicle-system/world-event
updates, billboard updates, busted-check, weapon update, door/gate
animation, and finally the actual render call. Wrapped in `try/catch` so
one frame's exception doesn't permanently kill the loop.

### `_updateMovement(dt, now)`

Branches immediately to `_updateDriving()` if `this.isDriving`. Otherwise:
feeds `this.physics.setVehicleColliders(this.vehicleSystem.getVehicleColliders())`
(rebuilt every frame — this is what makes parked/moving vehicles solid to
a walking player; there was previously no vehicle collision at all), reads
WASD/arrow keys into `forward`/`strafe`, and calls
`this.physics.update(dt, {...})`. **The forward/strafe key mapping here
was investigated and re-verified multiple times** across this codebase's
history in response to repeated "controls feel backward" reports — every
time it was checked with real executable geometry (build the actual
camera direction, the actual character rig, and the actual movement
vector, and compare them as real `THREE.Vector3`s rather than trusting
algebra), the mapping here came back correct. Separately, a **different**
file (`VehicleModel.js`'s truck cab/bed placement) turned out to be the
real cause of at least one "vehicle drives backward"-shaped report even
though the heading math itself was fine — worth checking for a geometry
placement issue in the relevant model file before re-doubting this
mapping again. If a future report says controls are backward, re-derive
the specific claim the same empirical way before changing anything — see
`SETUP_AND_DEVELOPMENT.md`'s testing-approach note.

### `_toggleNearestTrunk()`

`T` key — opens/closes the trunk of whichever vehicle is relevant (the
one being driven, or the nearest enterable one on foot).

### `_toggleVehicle()`

`F`/`Enter` — the main enter/exit/carjack dispatch. On entry, **snaps the
camera's free-look yaw to the vehicle's current heading** — without this,
the camera keeps whatever yaw it had from walking around on foot (nothing
to do with the vehicle's heading), so the driver rig — which correctly
faces the vehicle's heading — could end up facing a direction unrelated
to where the camera happens to be pointed, which looked like "the
character is facing backward" despite the underlying facing math being
correct. On exit, restores the on-foot physics position and relaxes the
driving hand-grip pose (re-applying a weapon grip if one's equipped,
same reasoning as `closePhone()`).

### `_updateVehicleProximity()`

Building/house-style proximity check, but for "is there an enterable/
jackable vehicle nearby" (drives `VehicleHUD`'s prompt).

### `_updateDriving(dt, now)`

Runs instead of `_updateMovement`'s normal branch while `this.isDriving`.
Reads throttle/steer from keys, calls
`entry.controller.update(dt, {...})`, then **softly eases the camera's
yaw toward the vehicle's current heading every frame**
(`yawDiff = atan2(sin(diff), cos(diff))` for the shortest angular path,
eased at a fixed rate) — mouse input still moves the camera instantly on
top of this, it just drifts back to sit behind the vehicle within about a
second of no input, rather than the camera staying wherever it happened
to be pointed while the vehicle turns underneath it. Positions the player
rig at the vehicle's actual seat (not center) using `seatForwardOffset`
and the `hipOffset`-corrected seat height (see `CharacterModel.md` for
why that correction is necessary), and points the camera at roughly chest
height above the seat for a natural driving framing.

### `_updateRemoteInterpolation()`

Eases every remote player's rig toward their latest broadcast
`targetX`/`targetZ` (not a snap), and sets their facing via
`Math.atan2(dx, dz) + Math.PI` — the same front-convention offset as
everywhere else (see `CharacterModel.md`); this was a real, since-fixed
bug (missing that `+ Math.PI`, so other players in a multiplayer session
visibly walked backward).

### `_getEffectivePosition()`

Returns the player's current world position whether on-foot or driving
(the vehicle's position, while driving) — the one function other
proximity/culling checks call instead of each re-deriving "where is the
player right now."

### `_updateCulling(now)`

Throttled to `CULL_TICK_MS` (300ms). Toggles `visible` on every building/
house entry based on distance vs. `this.renderDist.house`/`.building`,
and rebuilds `this._nearbyCollidables` (the list `CameraRig`'s wall-
pull-in raycast checks against) from `this._allStructureEntries`.

### `_updateDoorsAndGates(pos, dt)`

Eases every visible building/house's door hinge (and, for houses, yard
gate hinge) toward open/closed based on player distance — same lerp-
toward-target pattern `VehicleSystem._syncTrunk` uses for trunks.
**Performance note**: this used to allocate a fresh `[...buildingEntries,
...houseEntries]` array **every single frame** (pure avoidable garbage-
collector pressure on a map with hundreds of structures) — it now
iterates the precomputed `this._allStructureEntries` built once at world
load instead.

### `_updateBuildingProximity()` / `_updateHouseProximity()`

Finds the nearest building/house within interaction range and emits
`'building:enter'`/`'building:leave'` or `'house:enter'`/`'house:leave'`
via `gameEvents` — this is what drives `GamePage.jsx`'s "Press E to
enter..." prompts and panel-opening logic. Houses are tracked separately
from buildings since each house is individually named/owned rather than
sharing one panel per shared `type` the way buildings do.

### `_updateWeapon(dt, pos)`

Drives `WeaponSystem.update()` and continuous-fire handling for automatic
weapons while the mouse button is held.

### `_computeMarketTrend()`

A lightweight proxy the `WorldEventSystem` uses to decide whether an
economic-unrest crowd should auto-spawn (see `WorldEventSystem.md`'s
`maybeAutoStart`).

### `_updateCrimeProximity()`

Finds nearby crime opportunities (from `mapConfig`'s crime location data)
and emits a `gameEvents` update for the crime interaction prompt/panel.

### `_checkBusted(pos, now)` / `alertPoliceNear()`

The bust-condition check (player near police + sufficient heat) and the
NPC-alerting call (`NpcSystem.alertNear`) when a crime alert fires.

### `pause()` / `resume()`

Freezes/resumes the render loop (`this.paused`), used when a menu opens.

### `_onResize()`

Window-resize handler — updates camera aspect + renderer size.

### `destroy()`

Full teardown — removes all listeners, disposes every subsystem, cancels
the animation frame.

## What depends on this file

`GamePage.jsx` is the only thing that constructs a `GameEngine` — it
creates one instance per game session, renders React UI panels as
overlays that communicate with it via `gameEvents` (never direct method
calls for gameplay state, though a few UI-triggered actions like
`pause()`/`resume()`/`applySettings()` are called directly through a
`ref`), and calls `destroy()` on unmount.
