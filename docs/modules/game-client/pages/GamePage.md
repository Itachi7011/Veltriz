# `pages/game/GamePage.jsx`

**One-line summary**: the React shell around the 3D engine — constructs
one `GameEngine` instance, renders every UI overlay (HUDs, ~47 different
interaction panels, the pause menu) as siblings of the game canvas, and is
the bridge between React state and the imperative engine via `gameEvents`
and a `ref`.

## The core pattern: this is not a React render of the game

The 3D game itself is never described by JSX — `GamePage` renders one
plain `<div>` (`containerRef`) and hands it to `new GameEngine({...})` in
a `useEffect` on mount. Every visible game frame after that is drawn by
Three.js directly into that div's canvas, completely outside React's
render cycle. What React **does** render is everything layered on top:
HUD widgets, the ~47 `openPanel === 'x'` conditional panels, prompts like
"Press E to enter...". These panels get their live game data by listening
to `gameEvents` (a tiny pub/sub — see `engine/GameEngine.md`), not by
`GameEngine` re-rendering React.

## State

A large flat list of `useState` hooks, each mirroring one thing the
engine's `gameEvents` emit: `nearbyBuilding`/`nearbyHouse`/`activeHouse`
(proximity prompts — houses are tracked separately from buildings, see
`engine/GameEngine.md`'s proximity methods), `openPanel` (which of the ~47
panels, if any, is currently shown), `isPaused`, `isMapOpen`,
`isUsingPhone`, weapon/vehicle HUD state, etc.

## Effects

One `useEffect` per `gameEvents` subscription — each just calls the
matching `setXState`. A separate effect on mount constructs the
`GameEngine`, stores it in `gameRef`, and calls `destroy()` in the cleanup
function on unmount. Keyboard handling for **non-gameplay** keys (`Esc`
for pause, `E`/`Enter` for building/house interaction, `M` for the map)
lives here in plain `window.addEventListener` calls — **gameplay** keys
(WASD, weapon slots, vehicle controls) are handled entirely inside
`GameEngine._initInput()` instead; this file only handles the keys that
open/close a React panel.

### The `E`/`Enter` building-vs-house priority

Both keys check `nearbyBuilding` first (opens the shared per-`type`
panel) and only fall through to `nearbyHouse` (opens `HousePanel` with
that specific house's id/name) if no building is nearby — since a player
is very rarely standing simultaneously in both a building's and a house's
interaction radius, this ordering rarely matters in practice, but building
priority is the intentional choice where it does.

## Rendering

A large block of `{openPanel === 'x' && <XPanel onClose={...} />}`
conditionals — see `modules/game-client/ui/README.md` for the full panel
list and what each one is for. Always-visible overlays (not gated by
`openPanel`) include `WeaponHUD`, `VehicleHUD`, `FpsCounter` (the last one
only actually renders anything once `gameEvents` emits an `'fps:update'`,
which only happens when Settings > Show FPS is on — see
`engine/GameEngine.md`'s `_tick` entry).

## What depends on this file

Nothing else in the codebase imports from `GamePage.jsx` except the
router (`App.jsx`'s `/game` route, lazy-loaded specifically because the
Three.js bundle it pulls in via `GameEngine` is large — see
`ARCHITECTURE.md`). This file imports from nearly every file in
`engine/` and every file in `ui/`.
