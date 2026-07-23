# Veltriz — Game Client

React + Vite + Phaser 3 (Matter.js physics) frontend. This is what players
actually see and play: signup/login, character creation, and the live
multiplayer 2D world.

## Setup

```bash
npm install
npm run dev     # http://localhost:5173
```

In dev, API calls proxy through Vite (see `vite.config.js`) to:
- `auth-service` on `:5000`
- `economy-service` on `:5001`
- `game-world-service` on `:5002`

Socket.IO connections do **not** go through the proxy — they connect
directly to `economy-service`/`game-world-service` (CORS is already
configured on those services to allow `CLIENT_URL`).

For production, copy `.env.example` → `.env` and set the three
`VITE_*_SERVICE_URL` vars to your deployed Render URLs, and update
`netlify.toml`'s redirect targets to match.

## How auth works on this side

- Access tokens live **only in memory** (`src/utils/tokenStore.js`) —
  never localStorage — to reduce XSS exposure. This means a hard page
  refresh "loses" it, which is expected: `AuthContext` calls
  `POST /api/auth/refresh` once on app load, which succeeds silently using
  the httpOnly refresh cookie the browser already has.
- Every API call goes through `src/api/createClient.js`, which auto-attaches
  the current access token and, on a `401 TOKEN_EXPIRED` response,
  transparently refreshes and retries the request **once**. If the refresh
  itself fails, a `veltriz:session-expired` event fires and the user is
  treated as logged out.
- Three axios instances exist (`authApi`, `economyApi`, `worldApi`) — one
  per microservice — but they all share the exact same token store and
  refresh logic, so a single login works everywhere.

## The game itself

- `src/pages/game/phaser/MainScene.js` is the whole Phaser scene: Matter.js
  physics body for the local player (a circle collider), static bodies for
  buildings + obstacles, sensor zones around each building for "you're near
  this" detection, WASD/arrow movement, camera follow, and the multiplayer
  sync (join a map room, see others, see them move, see them leave).
- Characters are drawn at runtime with layered semi-transparent
  `Graphics`/shape objects (see `drawBlurryHuman` in `MainScene.js`) —
  deliberately simple/low-detail, no sprite art required, per the agreed
  scope.
- `src/pages/game/gameEvents.js` is a tiny shared `Phaser.Events.EventEmitter`
  bridging the canvas (imperative) and React (declarative) — e.g. the scene
  emits `building:enter` when you walk into a building's sensor zone, and
  `GamePage.jsx` listens for that to show the "Press E to enter" prompt.
- Fullscreen: `GamePage.jsx` calls `enterFullscreen()` right after the
  Phaser game boots. Pressing **Escape** opens the pause menu (matching
  the "other games" behavior you asked for); pressing it again resumes.
  Exiting to the main menu calls `exitFullscreen()` and tears down both the
  Phaser instance and the game-world socket cleanly.
- Building interactions: walking into a building's sensor zone shows a
  "Press E to enter X" HUD prompt; pressing **E** opens the matching panel
  (Job Center / Market / Bank), which call `economy-service` directly.

## Bundle size

`GamePage` (and Phaser with it) is lazy-loaded via `React.lazy` — the
login/signup screens ship a ~367KB (114KB gzipped) bundle, and the
Phaser-heavy game chunk (~1.5MB, ~346KB gzipped) only downloads once a
player actually enters `/game`. Phaser itself is just a big library; this
is the standard way to keep it from taxing the pages that don't need it.
