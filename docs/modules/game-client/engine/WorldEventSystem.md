# `engine/WorldEventSystem.js`

**One-line summary**: scripted crowd events layered on top of ordinary
NPC wandering — political rallies, gang turf wars, food distributions,
economic-unrest crowds outside financial buildings — reusing the same
character rig and combat/damage system as everything else, so a "crowd
event" is really just a temporary AI behavior override on a batch of
existing NPCs, not a separate visual system.

## Event catalogs

- **`SOLO_CONFIGS`** (`rally`, `food_distribution`, `gathering`): one-sided
  crowds — no opposing faction, NPCs just gather and repeat one of a small
  set of `phrases` (rendered as speech-bubble-style text, presumably via a
  UI layer reading `_publicState()`).
- **`CLASH_CONFIGS`** (`political_clash`, `gang_war`): **two** rival
  factions (picked via `FactionData.js`'s `twoRivals()`) that approach each
  other and fight — `combatDamage: [min, max]` and `combatIntervalMs`
  drive `_updateClashCombat()`. Both are flagged `callsPolice: true`.
- **`ECONOMIC_CONFIG`**: the "economic unrest" crowd — a single config
  (not keyed by type since there's only one), spawned outside financial
  buildings, `agitated: true` (affects the NPC animation amplitude — see
  `_updateClashCombat`/`update`'s bob calculation).
- **`MANUAL_EVENT_TYPES`**: the list a UI panel (`PoliticsPanel`) shows the
  player to manually start an event at their own location.

## `class WorldEventSystem`

### `constructor({ npcSystem, buildingEntries, scale })`

Stores references; no active events at construction.

### `isActive()`

Whether any event is currently running (only one at a time — see
`start()`).

### `start(type, x, z)`

The player-triggered entry point (called from `'politics:start'` via
`GameEngine`'s listener). Dispatches to `_startSolo` or `_startClash`
based on which config table `type` is found in.

### `startEconomicDistress(x, z)`

A separate, narrower entry point specifically for the economic-unrest
crowd (see `maybeAutoStart()` below for its trigger condition) — not
player-invokable directly through the same `type` dispatch as `start()`.

### `_nearbyCivilians(x, z, radius, cap)`

Pulls up to `cap` nearby non-police NPCs from `npcSystem` within `radius`
to repurpose as event participants — this is the "reuse existing NPCs"
mechanism; no new characters are spawned for an event.

### `_startSolo(type, x, z)` / `_startClash(type, x, z)`

Builds the active event record: picks participants via
`_nearbyCivilians`, assigns each a formation spot (`_spotFor` →
`_crowdSpot` for a loose cluster or `_sideSpot` for the two-faction
clash's opposing lines), attaches a faction flag sprite
(`FactionFlags.buildFactionFlag`) for clash participants, and — for
clashes — picks the two rival factions via `twoRivals()`.

### `_spotFor(config, x, z, i)` / `_crowdSpot(x, z, i)` / `_sideSpot(x, z, i, side)`

Pure position math — spreads participants into a crowd cluster or two
opposing lines (`side = -1 | 1`) around the event's origin, based on
`config.formation`.

### `update(dt, now)`

Per-frame (called from `GameEngine._tick`, only when an event is active).
Moves each participant toward their assigned spot (same `dx`/`dz` →
`Math.atan2(dx, dz) + Math.PI` facing pattern as `NpcSystem.js` — see that
file's doc and `CharacterModel.md` for why the `+ Math.PI` is required;
this file had the identical missing-offset bug in three separate spots,
now fixed), applies a bobbing arm-raise animation once in formation
(amplitude/frequency scaled up if `config.agitated`), and cycles through
`config.phrases` periodically. Expires the event once `duration` has
elapsed.

### `_updateClashCombat(ev, now)`

For `political_clash`/`gang_war` only — once both sides are in formation,
periodically (`combatIntervalMs`) has paired NPCs "attack" each other for
`combatDamage` via the same non-graphic health/knockdown system player
combat uses (see `NpcSystem.md`'s `applyDamage`) — no gore, just a
stylized down-state.

### `maybeAutoStart(now, marketTrendPercent)`

Called every frame by `GameEngine` (cheap early-return via
`AUTO_CHECK_INTERVAL_MS` throttling). With `AUTO_START_CHANCE` probability
per check, and only if no event is currently active and off cooldown
(`AUTO_COOLDOWN_MS`), starts a random event **near the player** — either a
random solo/clash type, or (if `marketTrendPercent` indicates a market
downturn and `_findFinancialSpot()` locates a nearby financial building)
the economic-unrest crowd specifically. This is what makes the city feel
alive without the player doing anything.

### `_findFinancialSpot()`

Picks a random `FINANCIAL_TYPES` building from `buildingEntries` for
`maybeAutoStart`'s economic-unrest trigger.

### `_publicState()`

Returns a plain-data snapshot of the active event (type, label, time
remaining, current phrase) — read by the UI layer (a HUD widget showing
"Political Clash — 0:42 remaining" style status) rather than that UI
reaching into engine internals directly.

### `clear()` / `dispose()`

`clear()` ends the current event early (releases participant NPCs back to
normal wandering, hides flags). `dispose()` is the full teardown.

## What depends on this file

`GameEngine.js` owns the one instance, calls `update()` and
`maybeAutoStart()` every frame, and listens for `'politics:start'` (from
`PoliticsPanel`) to call `start()`. Imports `animateCharacter` from
`CharacterModel.js` directly (for the participant bob/arm animation) and
`buildFactionFlag`/faction data from `FactionFlags.js`/`FactionData.js`.
