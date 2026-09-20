# `engine/WeaponSystem.js`

**One-line summary**: equip/aim/fire for melee and ranged weapons —
raycast hit detection, ammo/reload, recoil, procedural low-poly weapon
models — with a load-bearing scope limit: **damage only ever applies to
the client-side NPC population, never to another real player.**

## Why NPC-only damage is a deliberate design line, not a missing feature

From the file's own header: applying real damage to another player's
character from a raycast computed on *your own* client would mean
trusting every client to police every other player — a cheating/griefing
hole, not a physics problem. Real player-vs-player damage needs a
server-authoritative hit-registration service, which doesn't exist in
this project (see `ARCHITECTURE.md`'s multiplayer section —
`game-world-service`'s Socket.IO layer is position-sync only, with no
combat authority). Other players **do** see what you have equipped and
see you swing/fire it (it's fully visible, networked cosmetically), they
just can't actually be hurt by it. This is intentional and shouldn't be
"fixed" without first building that server-side piece.

## `WEAPON_DEFS`

The full catalog — `unarmed`(fists), `hammer`, `pistol`, and others in the
same shape: `type` (`'melee'` or `'ranged'`), `damage`, and type-specific
fields — melee gets `range`/`arcDeg` (the swing arc, in degrees, used by
`_resolveMelee`'s cone check) and `cooldown`; ranged gets `magSize`,
`reserveMax`, `reloadTime`, `spread` (accuracy cone), `automatic`
(hold-to-fire vs click-per-shot), `recoil` (camera kick per shot, fed to
`CameraRig.addRecoil`).

## `class WeaponSystem`

### `constructor({ scene, camera, cameraRig, bones, npcSystem, playerHeightGetter, audio })`

`bones` is the player rig's bone dictionary (from `buildCharacter()`) —
this is how the equipped weapon model gets parented to the correct hand
bone. Starts unarmed.

### `equip(key)`

Switches to `WEAPON_DEFS[key]`, builds (or reuses a cached) procedural
weapon mesh, parents it to the right hand bone, and calls
`applyGripPose()` (imported from `CharacterModel.js`) so the hand
visually wraps around the weapon's grip instead of floating open next to
it — melee weapons get a slightly looser grip curl than firearms (a fuller
fist around a trigger guard vs. a looser wrap around a hammer handle).
Resets ammo/reload state for the new weapon.

### `_emitStatus()`

Pushes the current weapon/ammo/reload state out via `gameEvents` for the
`WeaponHUD` panel to render — the HUD never reaches into this class
directly.

### `startReload()`

Begins the reload timer (`def.reloadTime`); `update()` completes it and
refills `mag` from `reserve`.

### `isAutomaticNow()`

Whether the currently-equipped weapon should keep firing while the mouse
button is held (vs. requiring a click per shot) — read by `GameEngine`'s
mouse-down handler loop.

### `setAiming(aiming)`

Right-click aim-down-sights state — affects camera FOV/positioning
elsewhere and (for ranged weapons) tightens `spread`.

### `update(dt)`

Per-frame: advances the reload timer if reloading, decrements the
fire-cooldown timer.

### `tryFire(playerPos)`

The actual "pull the trigger" call (from `GameEngine`, gated by cooldown
and ammo/reload state). Dispatches to `_resolveMelee` or
`_resolveHitscan` based on `def.type`, plays the appropriate SFX
(`AudioSystem.playGunshot`/`playMeleeSwing`), triggers `_muzzleFlash()`
for ranged weapons, and applies `CameraRig.addRecoil()`.

### `_muzzleFlash()`

A brief emissive flash mesh at the weapon's muzzle point, auto-removed
after a short timeout — purely visual.

### `_resolveMelee(def, playerPos)`

Checks every NPC within `def.range` and within `def.arcDeg` of the
player's facing direction (a cone check, not a raycast — melee doesn't
need line-of-sight precision) and applies damage to whichever is closest
within that cone.

### `_resolveHitscan(def)`

A `THREE.Raycaster` shot from the camera through screen-center (with
`def.spread` random jitter, tighter while aiming), checked against
`npcSystem.getHittableGroups()`. On a hit, walks up the hit mesh's
`userData.npcEntry` (set by `NpcSystem._spawnOne` on every mesh in an
NPC's rig — this is how a hit on, say, a finger mesh traces back to which
NPC it belongs to) and calls `_applyHit`.

### `_applyHit(npc, damage)`

Calls `npcSystem.applyDamage(npc, damage)` and fires a hit-marker SFX/UI
event.

### `dispose()`

Removes the currently-equipped weapon mesh and any lingering muzzle-flash
mesh from the scene.

## What depends on this file

`GameEngine.js` owns the one instance — wires mouse-down/up to
`tryFire`/automatic-fire looping, `R` to `startReload`, number keys to
`equip`, and right-mouse to `setAiming`. Imports `applyGripPose` from
`CharacterModel.js` directly. Reads from `NpcSystem.js`
(`getHittableGroups`, `applyDamage`) and writes to `CameraRig.js`
(`addRecoil`) and `AudioSystem.js` (SFX).
