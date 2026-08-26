# Veltriz — Simulation Service

Phase 2: AI population (NPCs), world events, and the auto-generated news
feed. Shares the same MongoDB cluster as the other services (own
collections: `npcs`, `worldevents`, `newsarticles`).

## Setup

```bash
npm install
cp .env.example .env   # INTERNAL_API_KEY must match economy-service's exactly
npm run seed            # requires economy-service to be running + already seeded
npm run dev
```

## How NPCs work (and an honest limitation)

NPCs are **not** rows in economy-service's real `Wallet`/`Employment`
collections — they hold their own simulated `wealth` field here. This is a
deliberate choice: economy-service's endpoints are built around a real,
authenticated player JWT (`req.user.id`), and forcing NPCs through that
same path would mean either faking player accounts (messy, and pollutes
real player data/analytics) or rewriting economy-service's model to have
optional auth (weakens its security model for real money). So instead:

- Every tick (`NPC_TICK_INTERVAL_MS`, default 2 min), each NPC has a chance
  to **work** (earns that job's salary into their own `wealth` field) and a
  separate chance to **buy** something from the market (spends `wealth`,
  scaled by their `personality.spendingHabit`).
- A purchase also sends a small **real** price nudge to economy-service via
  the existing internal price-override endpoint (capped by
  `NPC_MAX_PRICE_NUDGE_PERCENT`) — so NPC demand has a genuine, visible
  effect on live prices players see, without needing full per-unit
  order-book simulation.

**What this means honestly:** NPCs don't show up in economy-service's
wallet list or transaction ledger, and they don't compete with players for
the *same* coins — they're a demand-pressure signal layered on top of the
real player economy, not literal participants in it. If you later want
NPCs as fully real economic actors (e.g. visible in the admin wallet list,
tradeable with players), that's a bigger change to economy-service's auth
model and is worth discussing as its own task.

## How world events work

An event picks one market item and a multiplier, applies it via
economy-service's price-override endpoint (both the live price instantly
and the base-price anchor), and auto-reverts after `durationMinutes` back
to the original base price. Every activation and reversion publishes a
`NewsArticle`.

Two ways an event fires:
1. **Admin-triggered** — `admin-service` calls `POST /api/internal/events`
   here with a type, target item, optional exact multiplier (otherwise a
   sensible random value for that type is used), and duration.
2. **Random** — a small per-tick chance (`RANDOM_EVENT_PROBABILITY`, default
   1%) auto-fires a random flavor event on a random item with no admin
   input, so the world keeps evolving even when no admin is online. It
   skips items that already have an active event so effects don't stack.

Event types: `shortage`/`boom` (price up), `crisis`/`bonus` (price down) —
see `src/data/eventTemplates.js` for the exact multiplier ranges and the
news copy each type generates.

## Endpoints

**Public** (no auth — consumed by the game client):
- `GET /api/news?page=&limit=` — news feed
- `GET /api/events/active` — currently active world events
- `GET /api/npcs/summary` — aggregate population stats (not individual NPCs)

**Internal** (shared `INTERNAL_API_KEY`, called by `admin-service`):
- `GET /api/internal/events?status=` — full event history/management view
- `POST /api/internal/events` `{ type, targetItemKey, multiplier?, durationMinutes, title?, description? }`
- `POST /api/internal/events/:id/revert` — end an active event early

## Not built in this phase (being upfront)

Politics, war, and the full media/sentiment/propaganda systems from the
original design doc are still not built — crime *is* built (see
`crime-service`), just not by this service. This phase only adds the AI
population + events + news layer on top of the existing economy. Each of
the remaining systems needs its own state machine and is a substantial
task in its own right, better scoped as its own phase than rushed in here.
