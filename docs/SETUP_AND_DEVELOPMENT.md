# Setup and Development

## Prerequisites

- Node.js (a reasonably recent LTS — the codebase uses modern ES features
  throughout but no bleeding-edge syntax)
- A MongoDB connection string (all 6 backend services share one cluster,
  in separate collections — see `ARCHITECTURE.md`)
- npm (this is an **npm workspaces** monorepo — one root `package.json`
  lists all 8 services/apps as workspaces; do not `cd` into each one and
  run `npm install` separately, it works but defeats the point)

## First-time setup

```bash
# From the repo root:
npm install                 # installs all 8 workspaces' dependencies in one pass

# Copy every service's .env.example to .env and fill in real values:
cp auth-service/.env.example auth-service/.env
cp economy-service/.env.example economy-service/.env
cp game-world-service/.env.example game-world-service/.env
cp crime-service/.env.example crime-service/.env
cp simulation-service/.env.example simulation-service/.env
cp admin-service/.env.example admin-service/.env
```

**The one env var that must be identical across every backend service**:
`JWT_SECRET`. `auth-service` issues tokens with it; every other service
verifies incoming player JWTs with the same secret. If they don't match,
every authenticated request to every other service will 401.

**`MONGODB_URI`** is also shared verbatim across all 6 backend services'
`.env` files (same cluster, same database name — each service just uses
its own collections within it).

**`INTERNAL_API_KEY`** (present in `economy-service`, `crime-service`,
`simulation-service`, `admin-service`) must also match across whichever
services call each other internally — see `ARCHITECTURE.md` for exactly
which service calls which.

Check each service's own `.env.example` for the full list — they're
already annotated in-place with what each variable is for and which other
service(s) it needs to match.

## Running everything

```bash
npm run dev              # all 8 services + both frontends, one terminal,
                          # color-coded output per service (via `concurrently`)

npm run dev:backend      # just the 6 backend services
npm run dev:frontend     # just game-client + admin-client
```

Or run a single service on its own when you only need that one:

```bash
npm run dev -w game-client        # -w = "in this workspace"
npm run dev -w game-world-service
```

### Ports

| Service | Port |
|---|---|
| auth-service | 5000 |
| economy-service | 5001 |
| game-world-service | 5002 |
| admin-service | 5003 |
| simulation-service | 5004 |
| crime-service | 5005 |
| game-client (Vite dev server) | 5173 |
| admin-client (Vite dev server) | 5174 |

## Seeding data

```bash
npm run seed
```

Runs each service's own seed script in sequence (economy's wallet/payment
seeds, crime's crime-type catalog, game-world's map/house data, simulation's
initial NPC population). Safe to re-run; check each service's own seed
script under `src/seed/` if you need to know exactly what it inserts.

## Building for production

```bash
npm run build
```

Builds `game-client` and `admin-client` (the only two workspaces with a
build step — the backend services just run directly with Node, no
transpilation). Output goes to each app's own `dist/`.

## Working on `game-client` specifically

This is where almost all of the interesting engineering complexity lives.
A few things worth knowing before making changes:

- **The 3D engine is not React.** `GameEngine` (in `src/pages/game/engine/`)
  is a plain JS class instantiated once by `GamePage.jsx` and given a raw
  `<div>` to render into. Don't reach for `useState`/re-renders to change
  anything about the 3D world — call a method on the engine instance, or
  emit a `gameEvents` event, exactly like the existing UI panels do.
- **There are no test files anywhere in this project** (see
  `TECH_STACK.md`). The verification approach this codebase's history has
  relied on instead: small standalone Node scripts (not checked into the
  repo) that import the actual engine module, build real Three.js
  geometry, and assert on measured properties — e.g. "does this wheel's
  bounding sphere read as circular in the X-Z plane and thin along the
  axle axis," or "does the character's face direction match the vehicle's
  movement direction." If you're changing geometry/orientation-sensitive
  code (character rig, vehicles, camera), writing one of these before
  trusting your own mental math is strongly recommended — this project's
  own history includes more than one bug that *felt* obviously correct on
  paper and was empirically backward once actually measured, and at least
  one case where the underlying math was actually correct all along and a
  *different* file (a body-part placement, not a rotation formula) was the
  real cause — measuring the actual, specific thing in question beats
  re-deriving related-but-different math from scratch.
- **Every character/vehicle/building is procedural geometry**, no asset
  pipeline. Changing how something looks means changing the numbers/code
  in `CharacterModel.js` / `VehicleModel.js` / `BuildingBuilder.js`
  directly.
- **Two "front" conventions to keep straight**, both explained in detail in
  their own module docs, both real, both easy to get backward:
  - A character rig's local front is **-Z**, and its root `rotation.y`
    must be `heading/yaw + Math.PI` to face its direction of travel.
  - A vehicle chassis's own front (headlights) is local **+X** (not Z),
    and the wheel geometry's rolling axis has to be built along local Z
    (the chassis's *width* axis) to render right-side-out.

## Working on a backend service

Standard Express + Mongoose shape in every one of the 6 services:
`src/models/` (Mongoose schemas) → `src/controllers/` (business logic) →
`src/routes/` (Express routers, usually one file per feature area) →
`src/validators/` (Zod schemas, applied via a shared `validate` middleware)
→ `src/middleware/` (auth, internal-auth, rate limiting, error handling —
nearly identical across all 6 services). Each service's own `README.md`
lists its actual endpoints.

## Git / commit conventions

No enforced linting or commit-message convention is configured in this
repo at the time of writing (no `.eslintrc`, no `commitlint`, no CI config
present). Match the existing style in whichever file you're editing.
