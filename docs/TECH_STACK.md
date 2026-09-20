# Tech Stack

This lists what's actually installed and used, verified against each
service's real `package.json` — not the aspirational stack table in the
root README's vision section (that one lists TypeScript, Redis, BullMQ,
Zustand, React Query, and Babylon.js, none of which are in this codebase).

## Backend (all 6 services: auth, economy, game-world, crime, simulation, admin)

| Tool | Used for |
|---|---|
| **Node.js + Express** | Every service is a plain Express app — no Nest/Fastify/etc. |
| **MongoDB + Mongoose** | The only database. One shared cluster, separate collections per service, no cross-service `ref`s (see `ARCHITECTURE.md`). |
| **Zod** | Request body/query validation (`src/validators/*.js` in every service), applied via a shared `validate` middleware. |
| **jsonwebtoken** | Player auth — `auth-service` issues JWTs, every other service verifies them with the same shared `JWT_SECRET`. |
| **helmet, express-rate-limit, express-mongo-sanitize, xss-clean, cors** | Standard Express hardening middleware, applied near-identically across all 6 services. |
| **axios** | Service-to-service internal calls (`crime`→`economy`, `simulation`→`economy`, `admin-service`→everyone), authenticated with a shared `INTERNAL_API_KEY` header rather than a JWT. |
| **socket.io** (economy-service, game-world-service) | `game-world-service` uses it for live player position broadcast between connected clients. `economy-service`'s usage is narrower (live price/market ticks). |
| **node-cron** | Scheduled jobs — economy-service (interest/inflation ticks), simulation-service (NPC work/spend cycles, news generation), auth-service and admin-service (housekeeping jobs). |
| **bcryptjs** | Password hashing (auth-service, admin-service's separate admin accounts). |
| **passport, passport-google-oauth20** | Google OAuth login, auth-service only. |
| **@sendgrid/mail** | Transactional email (verification, password reset) — auth-service and admin-service. |
| **cloudinary, multer** | Avatar/image upload — auth-service only. |

None of these services use TypeScript — everything is plain JS (CommonJS
`require`, not ESM) on the backend.

## `game-client` (the 3D game)

| Tool | Used for |
|---|---|
| **React 18 + React Router** | The app shell, auth/character-creation pages, and every in-game UI overlay (HUDs, panels, pause menu). The 3D game itself is **not** a React render tree — see below. |
| **Vite** | Dev server + production bundler. `GamePage` is lazy-loaded (`React.lazy`) specifically so the Three.js bundle isn't pulled in until a player actually enters the game. |
| **three (Three.js)** | The entire 3D engine — scene graph, procedural geometry (characters/vehicles/buildings are all built from primitives at runtime, no imported models/glTF pipeline), the renderer, camera, lighting, shadow maps. See `ARCHITECTURE.md` for why there's no game-engine framework on top of it. |
| **cannon-es** | Present in `package.json` but **not actually used** for movement. An earlier version of the engine used it for full rigid-body physics; it was deliberately replaced with a much simpler, deterministic hand-written kinematic controller (`PhysicsController.js`) for predictability and performance — see that file's own doc for the reasoning preserved in its comments. Safe to remove as a dependency if nothing else references it; worth grepping for `cannon-es` imports before doing so. |
| **socket.io-client** | The one live connection to `game-world-service`, for multiplayer position sync. |
| **axios** | All other HTTP calls, to auth/economy/game-world/crime services. |
| **lucide-react** | Icon set used throughout every UI panel. |
| **sweetalert2** | Modal/confirmation dialogs (e.g. the relax/purchase confirmations in several panels). |

### Why raw Three.js instead of a game engine or glTF assets

Every character, vehicle, and building in the game is **procedurally
generated from primitive geometry at runtime** — spheres, boxes, cylinders,
capsules, lathes — composed in code (see `CharacterModel.js`,
`VehicleModel.js`, `BuildingBuilder.js`). There are no `.glb`/`.fbx` model
files anywhere in the project. This was a deliberate choice that keeps the
whole visual layer as ordinary, diffable JavaScript instead of binary
assets, at the cost of needing hand-tuned geometry/proportions (which is
where most of the subtlety in those three files lives — see their module
docs for the specific anatomical/mechanical reasoning behind the numbers).

## `admin-client`

Same React + Vite + React Router + axios + lucide-react + sweetalert2 stack
as `game-client`, minus Three.js/cannon-es/socket.io-client entirely — it's
a conventional data-dashboard SPA with no 3D rendering.

## Tooling that is notably absent

- **No TypeScript** anywhere in the project (root README's vision section
  mentions it; not present in any actual `package.json`).
- **No Redis / BullMQ** — `node-cron` in-process scheduling is used instead
  of a real job queue.
- **No Docker/Kubernetes** setup currently present, despite being mentioned
  as a "future" deployment target in the vision section.
- **No test framework** configured in any service's `package.json` at the
  time of writing — see `FUTURE_SCOPE.md`.
