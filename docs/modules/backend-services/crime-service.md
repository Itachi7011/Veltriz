# `crime-service` (port 5005)

**Owns**: the risk/reward crime-attempt system — the catalog of possible
crimes, rolling success/failure server-side, tracking each player's
"heat," and the Police Station's legal fine-payoff flow. Calls
`economy-service` internally to actually move money (crime payouts, fine
payments) rather than touching wallets itself.

## Models

- **`CrimeAction`**: the catalog — `key`, `title`, `description`, `icon`,
  `baseSuccessChance`, `minPayout`/`maxPayout`, `cooldownMinutes`. Ordered
  roughly low-risk/low-reward to high-risk/high-reward (e.g. `pickpocket`
  at the low end: 80% base success, small payout, short cooldown).
- **`CrimeRecord`**: one per player — current `heat` (0 to `MAX_HEAT`),
  used both to gate a "dangerous" state (`isDangerous` once heat crosses
  `DANGEROUS_HEAT_THRESHOLD` — this is what `game-client`'s `NpcSystem`
  police-alert reaction keys off of) and to compute the Police Station
  fine (`FINE_PER_HEAT_POINT` × current heat).

## The heat mechanic, precisely

Every crime attempt (success or failure) can add heat — riskier crimes
(lower `baseSuccessChance`) draw more heat per attempt, and a **failed**
attempt draws more heat than a **successful** one at the same crime (per
`computeHeatGain`'s own logic). Heat never decreases on its own; the only
ways down are the Police Station's `pay-fine` route (pays
`heat × FINE_PER_HEAT_POINT` VC, clears heat to 0 — **and the fine is
debited before heat is cleared**, so a failed payment never gives a free
heat discount) or an internal `heat/:userId/reset` call (an admin/service
lever, not player-facing).

## Routes

- **`/api/crime`**: `GET /actions` (the catalog), `GET /me` (current heat
  + record), `POST /attempt` (the actual roll — see below),
  `POST /rush-cooldown` (pay Chrono Shards to skip a crime's cooldown,
  with `GET /rush-cost/:actionKey` to preview the price — same "rush with
  premium currency" pattern `economy-service`'s job system uses),
  `POST /pay-fine`, `POST /contest-fine` (a separate, presumably
  lower-success-chance way to try to clear heat without paying — contests
  the fine rather than paying it outright).
- **`/api/internal`** (requires `X-Internal-Api-Key`): `GET`/`POST
  /actions` (catalog CRUD, admin-service's lever), `GET /heat` (bulk heat
  lookup), `POST /heat/:userId/reset`.

## `POST /attempt` flow

Rolls success against `baseSuccessChance` (presumably adjusted by factors
like an owned weapon — `economy-service`'s internal
`inventory/:userId/has-weapon` route exists specifically for this kind of
check, though the exact modifier logic lives in this service's own
controller), computes `heatGain` from the action + outcome, updates
`CrimeRecord.heat` (clamped to `MAX_HEAT`), and — on success — calls
`economy-service` internally to credit a payout randomly within
`[minPayout, maxPayout]`. Returns success/failure, the payout (if any),
and `heatAfter` for the client to react to (the `CrimeMinigame`/
`CrimePanel` UI, and — if heat crossed the dangerous threshold — the
police-alert behavior described in `game-client`'s `HOW_IT_WORKS.md` §7).

## Seed data

`seed/seedCrimeActions.js` — the initial `CrimeAction` catalog, run via
the root `npm run seed` (see `SETUP_AND_DEVELOPMENT.md`).

## Full endpoint reference

See `crime-service/README.md` for request/response bodies and env vars.
