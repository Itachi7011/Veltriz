# Veltriz — Economy Service

Handles wallets, jobs/salaries, marketplace (buy/sell + live fluctuating
prices), and the real-time layer players see prices/balance update through.
Shares the same MongoDB cluster as `auth-service` (different collections —
this service never touches the `User` collection).

## Setup

```bash
npm install
cp .env.example .env   # fill in values — JWT_SECRET MUST match auth-service exactly
npm run seed            # creates the jobs + market items (safe to re-run — idempotent upsert by key)
npm run dev
```

## Casino, School, and Stock Exchange

Three self-contained additions, all living in this service because each one
only ever needs the wallet this service already owns — no cross-service
calls required for any of them:

- **Casino** (`/api/casino`) — a coin-flip wager (`POST /bet { amount }`).
  Debits then (on a win) credits the same wallet in one request. Virtual VC
  only, purely a game mechanic (see `CASINO_*` env vars for tuning).
- **School** (`/api/school`) — `POST /study` pays tuition and permanently
  raises `PlayerSkill.skillLevel` (capped at 5), which
  `jobs.controller.js#workShift` reads on every shift to boost salary by
  `SALARY_BONUS_PER_LEVEL` (5%) per level. This is the one place a "stat"
  from one system (School) directly changes the payout of another (Jobs).
- **Stock Exchange** — not a separate route at all. "Stock" is just another
  `MarketItem.category`, traded through the exact same `/api/market`
  buy/sell endpoints and the exact same price engine as commodities — see
  the seed file for how volatility/spread are tuned differently to make it
  feel like a faster-moving market than the commodity one.


## How auth works here

This service does **not** call `auth-service`. It verifies the same JWT
locally (`src/middleware/auth.middleware.js`) using the shared `JWT_SECRET`.
It doesn't even need a `User` model — just the `userId` from the token to
scope wallets/jobs/inventory to the right player.

## How admin-service controls this service

`admin-service` never talks to this service's public `/api/wallet`,
`/api/jobs`, `/api/market` routes as a "user" — it uses a separate set of
routes under `/api/internal/*`, authenticated by a **shared secret header**
(`X-Internal-Api-Key`, must match `INTERNAL_API_KEY` in both services'
`.env`), not a user JWT. This is because admin accounts live in a totally
separate `AdminUser` collection inside `admin-service` — this service
doesn't need to know anything about how admins log in, it just trusts
requests carrying the correct internal key.

Internal endpoints admin-service can call:
- `GET /api/internal/overview` — economy health stats
- `GET /api/internal/wallets` — paginated wallet list (for user management)
- `POST /api/internal/wallets/:userId/credit` `{ amount, reason }`
- `POST /api/internal/wallets/:userId/debit` `{ amount, reason }`
- `POST /api/internal/wallets/:userId/lock` / `/unlock`
- `GET/POST /api/internal/jobs` — job CRUD
- `GET/POST /api/internal/market-items` — market item CRUD
- `POST /api/internal/market-items/adjust-price` `{ itemKey, newPrice, newBasePrice }`
  — **this is the "admin controls prices in realtime" feature**. Setting
  `newPrice` overrides the live price immediately and broadcasts it to every
  connected player via Socket.IO; `newBasePrice` moves the anchor the price
  engine's random walk drifts around instead (a gentler, gradual change).

## Real-time (Socket.IO)

Clients connect with `io(URL, { auth: { token: accessToken } })`. The
handshake is JWT-verified server-side before the connection is accepted.
Each user is auto-joined to a private room (`user:<id>`) for wallet update
pushes; market price ticks are broadcast to everyone.

Events emitted to clients:
- `wallet:update` — `{ balance }` (sent to the specific user only)
- `market:price_update` — `{ itemKey, currentPrice }` (broadcast to all)

## The price engine

Every `PRICE_TICK_INTERVAL_MS` (default 60s), every active market item's
price takes a small random walk bounded by its `volatilityPercent` (or the
global `PRICE_MAX_DRIFT_PERCENT` fallback). This is deliberately simple for
Phase 1 — real demand/supply-driven pricing comes once there's enough
trading volume for that to matter. **Admin price overrides are the main
lever for now**, which matches what you asked for: prices controlled by the
admin, not left to fully automatic simulation.

## About the "real API for gold/currency prices" request

There is no genuinely free, no-signup API for live gold spot prices — every
option (metals-api.com, GoldAPI, etc.) requires a free-tier API key at
minimum, and most cap you at very low request volumes. What **is** truly
free with zero signup is [frankfurter.app](https://www.frankfurter.app/)
for real currency exchange rates (ECB data). `src/cron/externalFeed.js`
pulls USD→INR from it hourly and stores it as a **reference number only** —
visible on the admin dashboard for context, but it does **not** auto-drive
any in-game price. If you get a metals-api key later, dropping it into a
second small cron module here is a ~20-line addition — happy to build that
in when you're ready to sign up for one.

## Notes on design decisions

- **Ledger is append-only** (`Transaction` model) — nothing is ever
  updated/deleted, matching the design doc's "immutable ledger" requirement.
  Reversals are done as an offsetting transaction, not an edit.
- **Wallet credit/debit is race-safe** without needing Mongo replica-set
  transactions: debits use `findOneAndUpdate` with `balance: {$gte: amount}`
  baked into the filter, so two simultaneous spends can't both succeed and
  push a balance negative.
