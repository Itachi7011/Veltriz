# `simulation-service` (port 5004)

**Owns**: the *economic* NPC population (jobs, market trades — real money
movement through `economy-service`, completely separate from
`game-client`'s visual wandering pedestrians), generated news articles,
and world events (temporary economic modifiers — e.g. a price
spike/crash affecting a category of market items).

## The economic-NPC vs. visual-NPC distinction (important, and easy to conflate)

This service's `Npc` model is an **abstract economic actor** with **no
position** — a job, a wealth number, a personality/behavior profile. It
never renders anywhere and has no connection to `game-client`'s
`NpcSystem.js` (the pedestrians you actually see walking around), which is
a separate, client-side-only visual population with its own random
spawning. `game-client`'s `NpcSystem.md` has the same note from the other
side. If a task mentions "NPCs," check which of these two completely
separate systems it actually means.

## Models

- **`Npc`**: the economic actor — presumably a name/personality profile,
  current job (if any), and wealth, driven by the cron engine below.
- **`WorldEvent`**: a temporary economic modifier — `status`
  (`active`/`reverted`), `endAt`, and whatever multiplier/target-category
  data `eventTemplates.js` defines for that event type (e.g.
  `randomMultiplier` applied to a market category's prices for the
  event's duration).
- **`NewsArticle`**: generated news content, presumably summarizing
  world events / economic conditions / crime activity for `NewsTicker`
  on the client.

## Routes

- **`/api/public`**: `GET /news`, `GET /events/active`,
  `GET /npcs/summary` (aggregate stats — how many NPCs employed, in which
  jobs, etc. — not individual position data, since there isn't any).
- **`/api/internal`** (requires `X-Internal-Api-Key`): `GET`/`POST
  /events` (admin-service's lever to manually trigger a world event),
  `POST /events/:id/revert` (manually end one early).

## Background jobs (`src/cron/`)

- **`npcEngine.js`**: periodically has NPCs actually work their jobs and
  buy/sell on the market — calling `economy-service` for real (via a
  `services/economyClient.js` wrapper distinguishing `economyPublic` vs
  `economyInternal` calls), meaning NPC economic activity genuinely moves
  the same job/market numbers a player interacts with. Caches the jobs/
  market-item catalogs for 60s (`CACHE_TTL_MS`) rather than re-fetching
  every tick, since simulating potentially many NPCs per tick against
  those same catalogs would otherwise hammer `economy-service` with
  redundant identical requests.
- **`eventEngine.js`**: `revertExpiredEvents()` sweeps `WorldEvent`
  documents whose `endAt` has passed and reverts their economic effect
  (via `eventService.js`), and (elsewhere in the same file) has a chance
  to activate a new templated event from `data/eventTemplates.js`.

## What actually connects to `game-client`

Only indirectly: this service's news/events feed `NewsTicker`, and its
NPC-driven trading is part of why `economy-service`'s market prices move
even when no player is actively trading — but nothing here is rendered.
`game-client`'s `WorldEventSystem.js` (scripted crowd events — rallies,
gang clashes) is a **different, purely visual** system with its own
independent random triggers; it doesn't read this service's `WorldEvent`
model at all.

## Full endpoint reference

See `simulation-service/README.md` for request/response bodies and env
vars.
