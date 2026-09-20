# `game-world-service` (port 5002)

**Owns**: character identity/appearance, the entire world map data
(zones, buildings, houses, vehicles-for-sale — everything
`game-client`'s `BuildingBuilder.js`/`WorldBuilder.js` render), live
multiplayer position sync, Real Estate ownership, Marina (boat) sales,
the government/election system, and the free Park/Gym/Cinema actions.

This is the service `game-client` talks to the most after auth/economy —
it's both a conventional REST API and a Socket.IO server.

## Models

- **`Character`**: the player's in-game identity — `displayName`,
  `country`/`city`, `background`, `appearance` (the object
  `CharacterModel.js`'s `buildCharacter()` consumes client-side — see that
  file's docs), current `x`/`y`/`mapId`/`facing`, and stat fields
  (`energy`, `happiness`, etc.) the `relax`/`gym`/`cinema` routes below
  modify.
- **`House`**: which player owns which house (by the same `houseId` keys
  `game-client`'s house catalogs — `houseTypes.js` and its regional
  variants — use), price paid, purchase date.
- **`Vehicle`**: same idea for player-purchased vehicles (from
  `data/vehicleTypes.js`).
- **`Government`** / **`Election`**: the in-fiction political system —
  current officeholders, active election cycle, candidates, vote tallies.
  `FactionData.js` on the client is the **rendering** data for the same
  factions this model tracks authoritatively.

## World data (`src/data/`)

Not database-backed — these are plain JS modules `game-client` doesn't
talk to over HTTP for their *content* (they're bundled into the client),
but the `/api/world/map/:mapId` route below serves the **placement**
data (which building/house sits where) that's generated from them at
service startup or on demand. `worldData.js` is the main map layout;
`houseTypes.js` + its five regional variants (`modernHouseTypes.js`,
`frostHouseTypes.js`, `portHouseTypes.js`, `ruralHouseTypes.js`,
`seaHouseTypes.js`) are the ~190 house archetype catalog
`BuildingBuilder.js`'s `classifyHouse()` pattern-matches against (see
that file's doc); `vehicleTypes.js` is the vehicle-for-sale catalog.

## Routes

- **`/api/character`**: `POST /` (create — called once from
  `CharacterCreate.jsx`), `GET /me`, `PATCH /position` (periodic
  position sync, a REST fallback/companion to the Socket.IO path below),
  `POST /relax` (the free action `ParkPanel`/`HousePanel` both call — see
  `game-client`'s `ui/README.md`), `POST /gym`, `POST /cinema`,
  `POST /relocate` (move to a different city/zone).
- **`/api/world`**: `GET /countries`, `GET /map/:mapId` (the full
  building/house/zone layout `game-client` fetches once at world load),
  `GET /clock` — stateless: the in-game time is computed from real
  elapsed time via pure math (a formula, not a stored "current time"
  value), which is why `game-client`'s `GameClockWidget` only re-fetches
  this every 60s and ticks locally in between rather than polling
  constantly — there's nothing server-side to fall out of sync with.
- **`/api/government`**: `GET /me`, `POST /file` (file candidacy),
  `POST /vote`, `PATCH /policy`.
- **`/api/realestate`**: `GET /listings`, `GET /my`, `POST /buy`,
  `POST /sell`.
- **`/api/marina`**: same shape as real estate, for boats — `GET /catalog`,
  `GET /my`, `POST /buy`, `POST /sell`.
- **`/api/internal`** (requires `X-Internal-Api-Key`): `POST
  /character/:userId/stats` (used by other services to push a stat change
  — e.g. crime-service adjusting happiness after a bust) and `GET
  /government` (read-only government status, used by
  `game-client`'s `BillboardSystem.js` for the political ticker screens
  and by `admin-service`'s proxy).

## Sockets (`src/sockets/index.js`)

The live multiplayer position-sync layer (see `ARCHITECTURE.md`'s
multiplayer section and `game-client`'s `GameEngine.md`). Maintains an
**in-memory** `mapRegistry` of who's currently connected per map — **not**
the source of truth (MongoDB's `Character.x/y` is), just a fast lookup so
broadcasting doesn't hit the database on every movement update. This
registry resets on service restart by design — it only tracks "who's
online right now," not anything persistent. JWT-authenticated on connect
(same shared secret as every other service). Broadcasts other connected
players' positions to everyone else on the same map; `game-client`'s
`GameEngine._updateRemoteInterpolation()` smooths those into rendered
motion rather than snapping.

## What game-client does with the map data specifically

`GET /map/:mapId`'s response (buildings, houses, zones) is what
`GameEngine._initWorld()` feeds directly into `BuildingBuilder.js`'s
`buildStructure()` and `WorldBuilder.js`'s `buildWorld()` — this service
owns *where* things are and *what* they are; the client owns turning that
into 3D geometry.

## Full endpoint reference

See `game-world-service/README.md` for request/response bodies and env
vars.
