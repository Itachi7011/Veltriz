# Veltriz — Documentation

This `docs/` folder is a companion to the root [`README.md`](../README.md)
(which is a project pitch + quickstart) and to each service's own
`README.md`. Where those explain **how to run** things, this folder explains
**how things work and why**, in enough depth that someone who has never
touched this codebase — including a future version of the person reading
this — can get productive quickly, or safely change something without
breaking an invariant three files away that isn't obvious from reading any
one of them in isolation.

Everything here describes the game **as it actually is**, not the aspirational
long-term vision paragraphs in the root README (those are clearly marked
there as "not built yet" — this docs folder does not repeat them).

## How this folder is organized

```
docs/
├── README.md                    ← you are here
├── ARCHITECTURE.md              ← the 8 services, how they talk to each other, data flow
├── TECH_STACK.md                ← every language/framework/library actually in use, and why
├── HOW_IT_WORKS.md              ← gameplay systems explained end-to-end (movement, vehicles,
│                                    houses, crime, economy, NPCs, multiplayer sync...)
├── SETUP_AND_DEVELOPMENT.md     ← installing, running, building, environment variables,
│                                    debugging tips, coding conventions this codebase follows
├── FUTURE_SCOPE.md              ← known limitations, and concrete next steps if this is
│                                    picked up again later
└── modules/                     ← one file per source module, function-by-function
    ├── game-client/
    │   ├── engine/               ← the 3D game engine itself (GameEngine, PhysicsController,
    │   │                            CharacterModel, VehicleModel, BuildingBuilder, NpcSystem...)
    │   │                            — one .md per file, every exported function documented
    │   ├── pages/                ← character creation + the main GamePage shell
    │   └── ui/                   ← the 60+ UI panels (grouped — see that folder's own README)
    └── backend-services/         ← one .md per backend service (auth, economy, game-world,
                                     crime, simulation, admin) covering its models, routes,
                                     and background jobs
```

## Suggested reading order

**If you're new to the project entirely:**
1. Root [`README.md`](../README.md) for the pitch + what's playable today.
2. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — the big picture: 8 services, what each owns.
3. [`TECH_STACK.md`](./TECH_STACK.md) — what's actually in the toolbox.
4. [`HOW_IT_WORKS.md`](./HOW_IT_WORKS.md) — how a play session actually flows.
5. [`SETUP_AND_DEVELOPMENT.md`](./SETUP_AND_DEVELOPMENT.md) — get it running locally.

**If you're about to change something specific:**
Go straight to `modules/` and find the file you're touching. Every module
doc explains that file's purpose, its full list of exports with signatures,
what each function actually does, which other files depend on it, and any
non-obvious invariant a change could silently break (these are called out
explicitly wherever they exist — this codebase has a few, and they are the
single most common source of "I changed X and Y broke in a totally
unrelated place" bugs if missed).

**If you're planning future work:**
[`FUTURE_SCOPE.md`](./FUTURE_SCOPE.md) lists known gaps and rough
implementation sketches for the most requested next features, written from
direct hands-on experience extending this codebase.

## A note on accuracy

This documentation describes the client-side 3D engine (`game-client`) in
the most depth, since that is the most architecturally dense part of the
project — a small, deliberately-not-a-physics-engine kinematic controller,
a from-scratch procedural human character rig, procedural vehicles and
buildings, and a from-scratch third-person camera, all built on raw
Three.js with no game-engine framework underneath. The six backend services
are documented at the model/route/job level rather than function-by-function
— they're conventional Express + Mongoose REST APIs, and their own
per-service `README.md` files (already present in each service folder)
cover their environment variables and endpoints in more copy-paste-ready
detail than is repeated here.
