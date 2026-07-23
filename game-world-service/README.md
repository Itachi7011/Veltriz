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
npm run dev
```

## Phase 1 scope (deliberately trimmed)

Country/city selection at character creation currently only sets identity
flavor — every player's avatar spawns into the **same one small map**
(`delhi_cp_district`, defined in `src/data/worldData.js`) with 5 buildings:
Job Center, Market, Bank, and two Home zones. This matches the agreed
Phase 1 scope: one small, real, playable district rather than an empty
promise of "the whole world." Adding more maps later is just more entries
in the `MAPS` object — the schema doesn't need to change.

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

## Endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/world/countries` | — | List selectable countries/cities |
| GET | `/api/world/map/:mapId` | — | Map layout (buildings, bounds, spawn point) for the frontend to build Matter.js bodies from |
| POST | `/api/character` | Bearer | Create character (one per account) |
| GET | `/api/character/me` | Bearer | Fetch your character |
| PATCH | `/api/character/position` | Bearer | Explicit position save fallback |
