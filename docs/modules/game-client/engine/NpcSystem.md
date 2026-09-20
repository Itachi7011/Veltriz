# `engine/NpcSystem.js`

**One-line summary**: the ambient walking population — spawns/despawns
pedestrian NPCs around the player as they move, with simple wander AI,
police tagging, phone-use idling, chase/flee reactions to nearby crime,
and non-graphic damage/knockdown for weapon hits.

## An important scope note (from the file's own header comment)

`simulation-service`'s `Npc` records are **abstract economic actors** — a
job, a wealth number, a personality vector — with **no position at all**.
They were never meant to be rendered, and syncing real positions for them
across every client would mean a full server-authoritative crowd
simulation (out of scope — see `FUTURE_SCOPE.md`). This file is a
**separate, client-side-only** visual population that exists purely to
make the world feel alive (spawns/despawns near the player so an
arbitrarily large map only ever costs what's nearby) — it has zero
connection to the economic NPC simulation running server-side. Don't
conflate the two when working on either.

## Constants

`WALK_SPEED`, `POLICE_FRACTION` (chance any given spawn becomes a
`role: 'police'` NPC, spawned near a police-station anchor when possible),
spawn/despawn radii relative to the player, `AMBIENT_PHRASES` (idle
speech-bubble lines).

## `class NpcSystem`

### `constructor({ scene, mapConfig, scale, colliders })`

`colliders` is `PhysicsController.getColliders()` — the **solid-box**
version (see `PhysicsController.md`'s split explanation: NPCs have no
interior logic and must treat houses as fully solid, same as any other
building). Pre-computes `policeAnchors` from the map's police-station
building entries.

### `_blockedAt(x, z, radius = 0.32)`

Same closest-point rectangle test as `PhysicsController`'s version,
against the solid-box collider list.

### `_pickSpawnPoint(playerPos)` / `_pickWanderTarget(anchor)`

Random point generation biased to be near-but-not-too-near the player
(spawn) or near a given anchor (wander target), rejecting points that
land inside a collider.

### `_spawnOne(playerPos)`

Rolls whether this spawn is police (near a police anchor) or a regular
civilian (random point near the player), builds a full character rig via
`buildCharacter(randomAppearance(role))` (see `CharacterModel.md` for the
appearance/face-genetics system), and creates the tracking entry
(`role`, `anchor`, `target`, `speed` with per-NPC variance, `hp`/`maxHp`,
`downedUntil`). **Every mesh in the rig is tagged**
`obj.userData.npcEntry = entry` — this is how `WeaponSystem.fire()`'s
raycast hit-testing traces a hit mesh back to which NPC owns it.

### `applyDamage(npc, amount)`

Non-graphic by design (see its own doc comment) — depletes `hp`, flashes
a hit indicator, and past 0 HP puts the NPC in a `downedUntil`-timed
knocked-over pose (`rotation.x = Math.PI / 2.1` — a stylized "on the
ground," not a gore effect) rather than removing them immediately.
Downed NPCs stop being interactive and are eventually despawned/replaced
like any other despawn.

### `alertNear(x, z)`

Called by the crime system when a bust condition fires — sets
`alertedUntil`/`alertOrigin`, which `update()` reads to make nearby police
NPCs react (see below).

### `update(dt, playerPos, now)`

The main per-frame loop: spawns new NPCs up to a population cap as the
player moves into unpopulated areas, despawns ones too far away, and for
each active NPC:

- **Police reacting to an alert**: if `alertedUntil` is active and this
  NPC is police and near enough, switches to `chasing` the alert origin
  at a faster speed instead of normal wander.
- **Normal wander**: walks toward `target` at `speed`; once within a
  threshold of it, either idles briefly (occasionally entering a phone-use
  pose via `applyPhonePose`/`clearPhonePose`) or picks a new
  `_pickWanderTarget`.
- **Facing**: `npc.rig.group.rotation.y = Math.atan2(dx, dz) + Math.PI` —
  the `+ Math.PI` is not optional; see `CharacterModel.md`'s front-
  convention section. **This was a real, since-fixed bug**: the formula
  used to be missing that offset, so every wandering NPC visibly walked
  backward, facing directly away from their own direction of travel. If
  you're touching this line, that history is worth re-reading before
  changing it again.
- Drives `animateCharacter()` with a speed-derived `speedFactor` for the
  walk cycle.
- Occasionally says one of `AMBIENT_PHRASES` (surfaced via `gameEvents`
  for a speech-bubble UI element, if one is listening).

### `applyCulling(playerPos, maxDist)`

Called by `GameEngine` (throttled, alongside the building/house culling)
to toggle `visible` on NPC rigs beyond `maxDist` — visual-only, doesn't
affect the wander/spawn logic itself.

### `getHittableGroups()`

Returns every active (non-downed) NPC's rig group — the list
`WeaponSystem`'s raycast checks against for hit detection.

### `getNearestPolice(playerPos, maxDist = 3)`

Used by the crime/bust system to find a police NPC close enough to
trigger a bust interaction.

### `dispose()`

Removes all NPC rigs from the scene.

## What depends on this file

`GameEngine.js` owns the one instance, calls `update()`/`applyCulling()`
every frame, and calls `alertNear()` when the crime system's bust
condition fires. `WeaponSystem.js` calls `getHittableGroups()` for hit
detection and `applyDamage()` on a confirmed hit. `WorldEventSystem.js`
pulls NPCs out of this system's `active` list to temporarily repurpose as
crowd-event participants (see that file's `_nearbyCivilians`).
