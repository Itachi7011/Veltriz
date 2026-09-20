# Architecture

## The shape of the system

Veltriz is 8 independently-runnable Node/React processes, tied together by
an npm-workspaces monorepo at the root (one `package.json` with a
`workspaces` array — see [`SETUP_AND_DEVELOPMENT.md`](./SETUP_AND_DEVELOPMENT.md)
for the actual run commands). There is no API gateway, no message queue, and
no shared in-process code between services — every service is a standalone
Express app with its own MongoDB collections, and the two React apps talk to
the backend purely over HTTP + one WebSocket connection each.

```
                        ┌─────────────────┐        ┌──────────────────┐
                        │   game-client    │        │   admin-client    │
                        │  (React, 5173)   │        │  (React, 5174)    │
                        └───┬─────────┬────┘        └─────────┬─────────┘
                            │         │ Socket.IO               │ HTTP only
                     HTTP   │         │ (position sync)          │ (proxied)
                            ▼         ▼                          ▼
        ┌──────────┐  ┌───────────┐ ┌────────────────┐   ┌──────────────┐
        │   auth    │  │  economy  │ │   game-world    │   │ admin-service │
        │  :5000    │  │  :5001    │ │     :5002        │   │    :5003      │
        └──────────┘  └───────────┘ └────────────────┘   └──────┬───────┘
                                                                    │ HTTP, with
                                                                    │ X-Internal-Api-Key,
                                                                    │ to every other service
        ┌──────────────┐   ┌─────────────┐
        │  simulation   │   │    crime     │
        │    :5004      │   │    :5005     │
        └──────────────┘   └─────────────┘

                    Every backend service → its own MongoDB
                    collections, on one shared MongoDB cluster.
```

## The 8 services

| Service | Port | Owns | Talks to other services? |
|---|---|---|---|
| `auth-service` | 5000 | Accounts, login/signup, JWT issuance, password reset, Google OAuth | No |
| `economy-service` | 5001 | Wallet balances, jobs (salaries, promotions), the player+NPC market/stock exchange, Casino | No |
| `game-world-service` | 5002 | Character identity/appearance, the world map data (buildings/houses), live position broadcast, Park/Gym/Cinema "free" actions, Real Estate ownership | No |
| `crime-service` | 5005 | Risk/reward crime actions, player heat, Police Station fine payoff | Calls `economy-service` (to pay out crime proceeds / fines) |
| `simulation-service` | 5004 | Generated news articles, world events, the NPC population (NPCs actually work jobs and buy/sell on the market server-side, moving real economy numbers) | Calls `economy-service` (NPC job income, NPC market trades) |
| `admin-service` | 5003 | Nothing of its own — a backend-for-frontend that proxies every other service for `admin-client`, with its own separate admin-account auth | Calls **every** other service |
| `game-client` | 5173 (dev) | The player-facing 3D game — a React shell around a hand-written Three.js engine (see below) | Calls `auth`, `economy`, `game-world`, `crime` directly over HTTP; one Socket.IO connection to `game-world-service` for live position sync |
| `admin-client` | 5174 (dev) | The admin dashboard — React, talks only to `admin-service` | No |

### Why no API gateway / shared queue

The root README is explicit that this is the pragmatic, "no Redis/BullMQ,
plain Node/Express + MongoDB + React" implementation of a much larger
original pitch document. Each service is small enough to reason about on
its own, and the two cross-service call patterns that do exist
(`crime`→`economy`, `simulation`→`economy`, `admin-service`→everything) are
plain `axios` HTTP calls authenticated with a shared `INTERNAL_API_KEY`
header (`X-Internal-Api-Key`), checked by an `internalAuth` middleware
present in each service's `src/middleware/` folder. There's no retry queue
or eventual-consistency handling — if the downstream service is down, the
calling request fails synchronously. That's a deliberate simplicity
trade-off worth knowing about if this ever needs to scale past "single
small deployment."

### Data ownership

Every service owns its own MongoDB collections and never reaches into
another service's collections directly — even though they may share one
physical MongoDB cluster for convenience, there are no cross-service
Mongoose `ref`s. A player's `userId` (issued by `auth-service`'s JWT) is the
only thing threaded through every other service's own collections to tie a
player's data together across services. This means, for example, that
`game-world-service`'s `Character` model and `economy-service`'s `Wallet`
model are two separate documents in two separate databases, both keyed by
the same `userId`, kept consistent only by each service doing the right
thing when called — there is no distributed transaction.

## `game-client`'s internal architecture

This is the part of the codebase with the most going on, so it gets its own
section (and its own much more detailed `modules/game-client/` docs).

```
main.jsx
  └─ App.jsx                          React Router root
       ├─ ThemeProvider / AuthProvider / CharacterProvider / SocketProvider
       │    (React Context — global auth/character/socket state)
       ├─ /login, /signup, ...        plain React pages, talk to auth-service
       ├─ /create-character           talks to game-world-service
       └─ /game  →  GamePage.jsx      lazy-loaded (Three.js is a large bundle)
                       │
                       │  mounts a <div>, then hands it to:
                       ▼
                  GameEngine (engine/GameEngine.js)
                       │
                       │  a plain JS class (NOT a React component) that owns
                       │  the entire Three.js scene, render loop, input, and
                       │  every other engine subsystem below. GamePage's job
                       │  is just to construct one GameEngine instance, feed
                       │  it a <div>, and render React UI panels (HUDs,
                       │  building interaction panels, pause menu) as
                       │  overlays that talk to the engine only through a
                       │  small pub/sub event bus (gameEvents.js) and a
                       │  handful of direct method calls via a ref.
                       ▼
     ┌─────────────────────────────────────────────────────────┐
     │  GameEngine composes, and drives every frame:             │
     │                                                             │
     │  PhysicsController   — on-foot movement, gravity, collision,│
     │                         stairs (see HOW_IT_WORKS.md)        │
     │  CameraRig           — third/first-person camera, mouse-look│
     │  CharacterModel      — builds the procedural human rig used │
     │                         for the player, every NPC, and every│
     │                         vehicle driver                      │
     │  NpcSystem           — pedestrian NPC spawning/wander AI    │
     │  VehicleModel/System — procedural vehicles + driving physics│
     │  BuildingBuilder     — procedural buildings/houses, incl.   │
     │                         walk-in house interiors + stairs    │
     │  WeaponSystem        — equip/aim/fire, hit detection        │
     │  WorldEventSystem    — scripted crowd events (protests etc.)│
     │  AudioSystem         — procedural WebAudio SFX + ambience   │
     │  BillboardSystem     — building name-sign sprites           │
     └─────────────────────────────────────────────────────────┘
```

Every one of those subsystems is documented individually, function by
function, in [`modules/game-client/engine/`](./modules/game-client/engine/).

### Why no game-engine framework

There is no Unity/Unreal/Babylon/PlayCanvas underneath any of this — it's
raw `three` (the library) plus hand-written systems for everything a game
engine would normally give you for free: a kinematic (not rigid-body)
physics controller, a from-scratch third-person camera with collision
pull-in, procedural mesh generation for every character/vehicle/building
instead of imported models or a glTF pipeline, and a simple event bus
(`gameEvents.js`, a tiny pub/sub) instead of a full ECS. See
[`TECH_STACK.md`](./TECH_STACK.md) for why (`cannon-es` is a dependency but
was deliberately removed from the actual movement code — see that file).

### Multiplayer sync model

`game-client` opens one Socket.IO connection to `game-world-service` per
session. The client periodically emits its own position/facing; the server
rebroadcasts other connected players' positions to everyone else in the
same map; `GameEngine._updateRemoteInterpolation()` smooths those into
other players' rendered positions between updates rather than snapping.
There is no server-authoritative physics or anti-cheat on movement — this
is a trust-the-client model, consistent with the project's current scope.

## Request flow example: a player commits a crime

1. `game-client`'s `WeaponSystem`/crime-proximity code in `GameEngine`
   detects the player is near a crime opportunity and shows a prompt (via
   `gameEvents`).
2. Player presses the interact key → a React panel (`CrimePanel.jsx` /
   `CrimeMinigame.jsx`) opens and calls `crime-service`'s
   `POST /api/crime/attempt` with a JWT from `auth-service` in the
   `Authorization` header.
3. `crime-service` rolls success/failure server-side (accounting for the
   player's heat, any owned weapon bonus, etc.), updates its own
   `CrimeRecord`/heat collections, and — on success — calls
   `economy-service` internally (`X-Internal-Api-Key`) to credit the
   player's wallet.
4. The response (success/fail, payout, new heat level) flows back through
   `crime-service` → the React panel → the engine (to trigger the
   police-alert behavior in `WorldEventSystem`/`NpcSystem` if heat crossed a
   threshold).

This same shape (client → single owning service → occasionally that service
calls one other service internally → response bubbles back) is the pattern
for essentially every gameplay action in the project.
