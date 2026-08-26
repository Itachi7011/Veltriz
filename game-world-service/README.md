# Veltriz — Game World Service

Owns character identity (country/city/background/appearance), the playable
map configuration, and the real-time multiplayer position sync players see
via Socket.IO. Shares the same MongoDB cluster as `auth-service` and
`economy-service` (its own `Character` collection — never touches `User`
or `Wallet`).

## Setup

```bash
npm install
cp .env.example .env   # JWT_SECRET must match auth-service exactly
npm run seed             # syncs House ownership records from the map (safe to re-run)
npm run dev
```

## Map scope — three zones, one continuous map

Country/city selection at character creation still only sets identity
flavor — every character spawns at the same point. But that "one map"
(`delhi_cp_district`, defined in `src/data/worldData.js`) is now genuinely
three districts stitched into a single Matter.js world and Phaser scene:

- **Old Meridian** (x: 0-4800) — the original district. 30 locations, a
  40-type traditional house catalog (`data/houseTypes.js`).
- **Neo Meridian** (x: 5200-14000) — a modern district almost 2x Old
  Meridian's area. 30 more locations, a 60-type modern house catalog
  (`data/modernHouseTypes.js`, condos up through skyscraper-sized
  penthouses/estates).
- **Dustridge County** (x: 14400-27600) — a huge, sparse rural district, 3x
  Neo Meridian's area (84.48M vs 28.16M sq units) but with only 15
  buildings and just 50 houses total — "less houses" was an explicit
  design goal here, not a side effect, so house placement runs at a much
  coarser grid step in this zone only (see `placeHouses()`'s per-zone
  `stepX`/`stepY` options). A compact 15-entry catalog of small, cheap,
  old-style houses (`data/ruralHouseTypes.js`) fills what little housing
  there is; the rest of the huge footprint is open farmland with
  fence/crop-row scenery.

There is deliberately **no portal, loading screen, or second map fetch**
between any of them — a player just keeps walking and the terrain changes
character. One `GET /api/world/map/:mapId` call returns all three zones in
one payload (~82KB with 75 buildings + 346 houses — still trivial);
`MainScene.js` renders a distinct ground tint per zone (see its `zones`
handling, now a proper theme lookup table rather than a two-way ternary)
purely for visual feedback, with zero collision or scene-transition logic
involved. Every building's (and house's) `zone` field is computed
automatically from its x-coordinate against the map's own `zones`
metadata, so it can never drift out of sync.

28 of Neo Meridian's 30 buildings, and 13 of Dustridge County's 15,
deliberately **reuse an existing building `type`** under a new name (Neo
Bank/Dustridge Bank are both just another `bank`, Sky Lounge/Rusty Spur
Saloon are both just another `cinema`/`casino`, etc.) — GamePage.jsx's
panels are keyed by type, not building id, so this needed zero new
frontend code per reused building, the same pattern already used for
Restaurant/Hospital sharing Market's buy+use flow. Only 4 buildings across
both new zones are genuinely new mechanics: **Tech Campus**
(`tech_campus`), **Quantum Labs** (`quantum_labs`), **Farm** (`farm`) —
three more career tracks in economy-service's seed — and **Gun Store**
(`gun_store`), a new `weapon` market category. Owning any weapon gives a
real (if modest) crime success-chance bonus — see
`crime-service/src/services/economyClient.js#checkHasWeapon` — the one
place Dustridge County's "more violence" theme actually reaches a
mechanic, rather than just being a reskinned building.

## Houses (non-interactive, ownable via Real Estate)

`src/data/houseTypes.js` (Old Meridian, 40 types),
`src/data/modernHouseTypes.js` (Neo Meridian, 60 types), and
`src/data/ruralHouseTypes.js` (Dustridge County, 15 types, deliberately
small and cheap) are catalogs of visually distinct house templates
(footprint + color + price).
`placeHouses()` in `worldData.js` runs once per zone with that zone's own
catalog and x-range, scanning for anywhere a house fits without
overlapping a real building's sensor zone, an obstacle, the spawn point, or
another house — checked against actual geometry every time, so adding an
11th/61st house type (or another building anywhere) later never requires
re-tuning the
algorithm by hand, it just packs the new shapes into whatever space is
still open.

Houses render in `MainScene.js` as solid, silent scenery — no "Press E"
prompt, since there's nothing to do there yet. `House` (this service's own
model) tracks which ones are owned; run `npm run seed` after any map change
to sync it (safe to re-run — it upserts by `houseId` and never touches
existing ownership). The Real Estate Agency building (`/api/realestate`)
lets a player buy one unowned house as a primary residence — no resale yet,
one house per player for now.

## Gym, Cinema, and Real Estate — this service calling OUT to economy-service

Unlike the internal routes below (economy-service calling INTO this
service), these three go the other direction: this service debits the
player's wallet in economy-service before applying its own effect — see
`src/services/economyClient.js#debitWallet`. All three throw on
insufficient funds so the effect (stat change / house ownership) never
applies without payment actually succeeding.

## Character creation flow

`POST /api/character` does two things in order:
1. Creates the `Character` document (position = the map's spawn point).
2. Calls `economy-service`'s `POST /api/wallet/init`, **forwarding the
   player's own access token** (not an internal key — this is the service
   acting on the player's behalf, verified independently by economy-service
   via the same shared `JWT_SECRET`).

If step 2 fails (economy-service down, etc.), the character is rolled back
and the player gets a clean error to retry — so you never end up with a
"citizen that exists but has no wallet" half-state.

## Real-time multiplayer (Socket.IO)

Client connects with `io(URL, { auth: { token: accessToken } })`, then:

```js
socket.emit('world:join', { mapId, displayName, x, y });
// server replies:
socket.on('world:snapshot', ({ players }) => { /* everyone already on the map */ });
socket.on('player:joined', (player) => { /* someone else joined */ });
socket.on('player:moved', ({ userId, x, y, vx, vy, facing }) => { /* live movement */ });
socket.on('player:left', ({ userId }) => { /* someone disconnected */ });

// client sends movement on every physics tick (or throttled to ~20/sec):
socket.emit('player:move', { x, y, vx, vy, facing });
```

An in-memory registry (per map) tracks who's currently connected for fast
broadcast — it is **not** the source of truth. MongoDB is, via:
- A throttled autosave on every `player:move` (at most once per
  `POSITION_SAVE_INTERVAL_MS`, default 5s) — so a crash mid-session loses at
  most a few seconds of movement, not the whole session.
- A final save on `disconnect`.
- `PATCH /api/character/position` as an explicit REST fallback (call this
  on `beforeunload` in the browser, since a clean disconnect isn't
  guaranteed on tab close).

## Is "save where you left off" a good idea? (you asked)

Yes — this is standard for persistent-world games, and it's basically
free here: your character's `position`/`mapId` already live in MongoDB from
the first save, so "resuming" is just loading that document on next login.
No separate save file, no extra system to build.

## Endpoints (full list)

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/world/countries` | — | List selectable countries/cities |
| GET | `/api/world/map/:mapId` | — | Map layout (buildings + houses + bounds + spawn point) for the frontend to build Matter.js bodies from |
| POST | `/api/character` | Bearer | Create character (one per account) |
| GET | `/api/character/me` | Bearer | Fetch your character |
| PATCH | `/api/character/position` | Bearer | Explicit position save fallback |
| POST | `/api/character/relax` | Bearer | Park's free action (cooldown, no cost) |
| POST | `/api/character/gym` | Bearer | Gym's paid workout (-energy, +happiness) |
| POST | `/api/character/cinema` | Bearer | Cinema's paid ticket (+happiness only) |
| GET | `/api/realestate/listings` | Bearer | Unowned houses, cheapest first |
| GET | `/api/realestate/my` | Bearer | The house(s) you own |
| POST | `/api/realestate/buy` | Bearer | `{ houseId }` — buy a house |
