# `economy-service` (port 5001)

**Owns**: everything money — wallet balances (both in-game cash and the
premium "Chrono Shards" currency), jobs (apply/work/promote/quit), the
player-facing market (buy/sell/use items, with a live price engine), the
Casino, Credit Union (loans), Insurance, School (skill training), Lottery,
and real-money payment checkout for Chrono Shards.

This is the service every other backend calls into when something needs
to actually move money — `crime-service` (payouts/fines) and
`simulation-service` (NPC job income and NPC market trades) both call this
service's internal routes rather than touching money themselves.

## Models

`Wallet` (cash + Chrono Shard balances, plus a `locked` flag internal
routes can set — e.g. while an admin investigates suspicious activity),
`Transaction`/`ShardTransaction` (append-only ledgers for each currency),
`Job`/`Employment` (the job catalog and each player's current job/
progress), `MarketItem`/`MarketPrice` (the item catalog and its live
price history), `Inventory` (what a player currently holds),
`CasinoRecord`, `Loan`, `Lottery`, `PlayerInsurance`, `PlayerSkill`,
`PaymentProduct`/`PaymentTransaction` (the Chrono Shard purchase catalog
and transaction log).

## Routes

- **`/api/wallet`**: `init` (called once at character creation),
  `me`, `transactions`, `shard-transactions`.
- **`/api/jobs`**: browse jobs, `me` (current employment), `apply`,
  `work/start` + `work/collect` (a timed work session — start it, come
  back later to collect the payout) + `work/rush` (pay Chrono Shards to
  skip the wait, with `work/rush-cost` to preview the price), `promote`,
  `quit`.
- **`/api/market`**: browse items, `inventory`, `buy`, `sell`, `use` (for
  consumable items — the mechanism `CategoryShopPanel` on the client rides
  on top of).
- **`/api/casino`**: `me` (recent record), `bet`.
- **`/api/creditunion`**: `me`, `borrow`, `repay` — see the interest cron
  below for how a balance grows if ignored.
- **`/api/insurance`**: `me`, `subscribe`.
- **`/api/school`**: `me`, `study` (skill training).
- **`/api/lottery`**: `me`, `buy` (a ticket) — draws resolve on their own
  schedule, see the cron job below.
- **`/api/payments`**: `products` (the Chrono Shard purchase catalog),
  `checkout`, `history`.
- **`/api/internal`** (requires `X-Internal-Api-Key`, called only by other
  services/admin-service): an admin/service-to-service surface — direct
  wallet credit/debit (both currencies), wallet lock/unlock, job/market-
  item CRUD, **`market-items/adjust-price`** (the deliberate admin
  price-override lever the price engine below is explicitly designed to
  defer to), and `inventory/:userId/has-weapon` (used by `crime-service`
  to check for a weapon-ownership bonus on a crime attempt).

## Background jobs (`src/cron/`)

- **`priceEngine.js`**: a random-walk price tick, bounded by each item's
  own `volatilityPercent`. **Explicitly documented in its own comment as
  a deliberately simplified Phase 1** — the fuller "real API + admin
  multiplier + demand/supply" pricing model is intentionally deferred
  until there's enough real trading volume for demand/supply to mean
  anything; admin price overrides (`adjust-price` above) are the primary
  lever today, and this tick just keeps the market feeling alive between
  those.
- **`loanInterest.js`**: compounds every open Credit Union loan's balance
  by `ACCRUAL_RATE_PERCENT` per tick. Also explicitly documented as
  simple-on-purpose: no forced garnishment or credit-score penalty for an
  overdue loan yet — ignoring a loan just lets the balance keep
  compounding, same as real debt, without a full collections system.
- **`lotteryDraw.js`**: polls every 30s and resolves a draw once its
  scheduled time has passed.
- **`externalFeed.js`**: fetches a real USD→INR rate from
  `frankfurter.app` (free, no API key, ECB-backed) purely as a
  **reference signal** shown on the admin dashboard — it never
  auto-updates in-game prices; that stays a deliberate admin action via
  `adjust-price`, on purpose.

## Sockets

`src/sockets/` — live price ticks pushed to connected clients (narrower in
scope than `game-world-service`'s position-sync socket; see
`ARCHITECTURE.md`).

## Full endpoint reference

See `economy-service/README.md` for request/response bodies and env vars.
