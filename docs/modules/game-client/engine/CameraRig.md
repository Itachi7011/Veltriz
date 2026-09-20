# `engine/CameraRig.js`

**One-line summary**: first/third-person camera, mouse-look via Pointer
Lock, and — critically — the single source of truth for the "forward"
direction basis (`sin`/`cos` of yaw) that every other heading-based system
in the engine (on-foot movement, vehicle heading, NPC facing) is built to
agree with.

## The forward/right convention, precisely

At `yaw = 0`, this rig looks toward world `+Z`
(`dirZ = cos(0)·cos(pitch) ≈ 1`). As `yaw` increases, the look direction
rotates — concretely, `(sin(yaw), cos(yaw))` is "forward" and
`(-cos(yaw), sin(yaw))` is "right" (the `cross(forward, up)` for this
specific axis layout). **Every other file that deals with a heading**
(`PhysicsController`'s movement basis, `VehicleController`'s heading,
`NpcSystem`'s facing) either derives from or must agree with this exact
pairing. See `PhysicsController.md`'s `update()` entry for where the same
`(sin,cos)` pair reappears.

## Constants

`TPV_DISTANCE` (4.2, third-person camera distance), `TPV_HEIGHT` (1.55,
look-at height above the player's feet), `FPV_HEIGHT` (1.62, eye height in
first-person).

## `class CameraRig`

### `constructor({ camera, domElement, scene, characterGroup })`

`characterGroup` is the one visible rig this camera directly rotates every
frame (see `update()`) — for the player, `GameEngine` passes its own
`playerRig.group`. Sets up Pointer Lock listeners
(`mousemove`/`pointerlockchange`/`click`).

Two settings-controlled fields exist for the Settings panel to write to
directly (see `HOW_IT_WORKS.md` §9): `this.sensitivity` (default `0.0024`)
and `this.invertY` (default `false`) — `GameEngine.applySettings()` sets
these; nothing else needs to change for the sensitivity slider / invert-Y
toggle to take effect, since `_onMouseMove` reads them live every event.

**A non-obvious fix baked into the constructor**:
`this.raycaster.camera = camera` — without this, `THREE.Sprite`'s own
`raycast()` implementation (used by the building name-sign labels, which
are sprites) throws trying to read a null camera's `matrixWorld`, on every
single frame, before anything ever renders. This was the root cause of a
real blank-screen bug; if you ever see that again after touching sprites,
this is the first thing to check.

### `_onClick()` / `_onPointerLockChange()`

Standard Pointer Lock request/track-state boilerplate — clicking the game
canvas requests pointer lock; losing it (Esc, alt-tab) is tracked so
`_onMouseMove` stops applying movement when not locked.

### `_onMouseMove(e)`

```js
this.yaw -= e.movementX * sensitivity;
this.pitch -= e.movementY * sensitivity * (this.invertY ? -1 : 1);
```

Moving the mouse right **decreases** yaw. Combined with the forward-basis
convention above, decreasing yaw turns the camera to its own right — this
was verified empirically (not just derived) after a previous, unrelated
steering-direction bug made every heading-related sign convention in the
project worth re-checking by building real geometry rather than trusting
algebra alone; see `VehicleModel.md`'s "empirical verification" note for
why that became the standard here. Pitch is clamped to
`[minPitch, maxPitch]` (`-1.15` to `1.0` radians) every event.

### `toggleMode()` / `setMode(mode)`

Switches between `'third'` and `'first'`. `toggleMode` returns the new
mode (used by `GameEngine`'s `V` key handler to fire a UI update).

### `releasePointerLock()`

Explicit exit, used when a UI panel opens (movement/look should stop while
a menu is up).

### `addRecoil(pitchKick, yawKick = 0)`

Called by `WeaponSystem` on every shot. Recoil is tracked **separately**
from `pitch`/`yaw` (see `this.recoilPitch`/`this.recoilYaw`) specifically
so it never gets absorbed into or fights with the player's own mouse
input — it decays back to zero on its own (`*= 0.9` per `update()` call,
snapped to exactly `0` once negligibly small) rather than needing the
player to manually correct for it.

### `update(playerPos, collidables)`

The per-frame camera placement, called by `GameEngine` every frame with
the player's current world position and (for third-person) the list of
nearby building/house groups to raycast against for wall pull-in.

- Decays recoil (see above), computes `effectivePitch`/`effectiveYaw` as
  base + recoil, clamping pitch again after adding recoil.
- **First-person**: camera sits exactly at `(playerPos.x, headY,
  playerPos.z)` and looks along the `(sin(yaw)cos(pitch), sin(pitch),
  cos(yaw)cos(pitch))` direction — a standard FPS look vector.
- **Third-person**: computes the same direction vector, then raycasts
  **backward** from a point above the player (`origin`) toward the camera's
  intended position; if something (a wall) is hit closer than the default
  `TPV_DISTANCE`, the camera pulls in to just short of that hit distance
  instead of clipping through it. Camera position is then
  `playerPos - dir·dist` (behind the player along the look direction) with
  a small additional vertical offset for a more natural over-the-shoulder
  angle, and `camera.lookAt(playerPos.x, targetY, playerPos.z)`.
- **The character rig's own rotation is set here, every frame**:
  `characterGroup.rotation.y = this.yaw + Math.PI`. This `+ Math.PI` is
  load-bearing — see `CharacterModel.md`'s "front convention" section for
  why the rig's own local front is `-Z` and this offset is what makes it
  actually face the direction the camera is looking, and for a real bug
  history where other call sites (NPC wander, remote multiplayer players)
  independently computed a heading and forgot this same offset, and
  consequently walked backward.
- Also toggles `characterGroup.visible = this.mode !== 'first'` — the
  body is hidden in first-person so the player isn't staring at the
  inside of their own head.

### `get facingYaw()`

Returns `this.yaw` (not `effectiveYaw` — recoil doesn't affect movement
direction, only where the camera/gun points). This is what
`PhysicsController.update()` receives as `facingYaw`.

### `dispose()`

Removes all listeners, exits pointer lock if held.

## What depends on this file

- `GameEngine.js` owns the one instance, calls `update()` every frame, and
  reads `.facingYaw` for movement input, `.pitch`/`.mode` for weapon
  aiming and animation head-pitch, and directly writes `.yaw` in two
  places specifically for driving (snap-on-entry and the per-frame
  soft-follow toward vehicle heading — see `HOW_IT_WORKS.md` §4's
  "player-vs-camera-heading sync" section and `GameEngine.md`).
- `WeaponSystem.js` calls `addRecoil()` on fire.
