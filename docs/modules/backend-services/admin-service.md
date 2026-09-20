# `admin-service` (port 5003)

**Owns**: nothing of its own gameplay-wise — this is a **backend-for-
frontend** that proxies/aggregates every other service specifically for
`admin-client`, with its own completely separate admin-account
authentication (an admin login has nothing to do with a player's
`auth-service` account).

## Models

- **`AdminUser`** / **`AdminRefreshToken`**: a fully separate auth system
  from player accounts — same shape as `auth-service`'s `User`/
  `RefreshToken` (bcrypt password, refresh-token rotation) but its own
  collection, own login flow, own JWT (still signed with the same shared
  `JWT_SECRET` so other services' `internalAuth`/player-auth middleware
  isn't involved at all here — admin requests authenticate against this
  service specifically).
- **`AdminAuditLog`**: every admin action (wallet credit/debit, price
  override, account lock...) logged here — a paper trail specifically for
  *admin* actions, separate from `PlayerUserRef`/`AuditLogRef` below.
- **`PlayerUserRef`** / **`AuditLogRef`**: **not** independent data —
  lightweight local mirrors/references to player data that actually lives
  in `auth-service` (and its audit logs), letting the admin dashboard join
  against a player's identity without this service needing to call
  `auth-service` for every single lookup.

## The proxy pattern

Every route here does the same shape of thing: authenticate the admin
(this service's own JWT), then call the *actual* owning service's
internal API (`X-Internal-Api-Key`) via one of the `services/
*ServiceClient.js` wrappers (`economyServiceClient.js`,
`crimeServiceClient.js`, `simulationServiceClient.js` — one per service
this proxies to), and return the result. This service holds essentially
no gameplay state of its own beyond the admin-account/audit models above.

## Routes

- **`/api/admin-auth`**: `signup`, `login`, `refresh`, `logout`,
  `forgot-password`, `reset-password`, `change-password`, `me` — the
  admin's own auth flow, structurally identical to `auth-service`'s
  player flow but a fully separate implementation/collection.
- **`/api/economy`** (proxies `economy-service`'s internal routes):
  `overview`, `wallets` (list/inspect), `wallets/:userId/credit`+`debit`
  (both currencies — `credit-shards`/`debit-shards` for Chrono Shards
  specifically), `wallets/:userId/lock`+`unlock`, `jobs` (list/create),
  `market-items` (list/create/`adjust-price` — the deliberate manual
  pricing lever `economy-service`'s price-engine cron is explicitly
  designed to defer to, see that service's doc), `payment-products`
  (list/create), `payment-transactions` (list).
- **`/api/crime`** (proxies `crime-service`'s internal routes):
  `actions` (list/create), `heat` (list), `heat/:userId/reset`.
- **`/api/world`** (proxies `simulation-service`'s internal routes, despite
  the route prefix — this is the world-*events*/news/NPC-summary surface,
  not `game-world-service`'s map data): `events` (list/create),
  `events/:id/revert`, `npcs/summary`, `news`.
- **`/api/users`**: `GET /` (list players — reads from the local
  `PlayerUserRef` mirror), `GET /:id`, `POST /:id/status` (suspend/
  reinstate), `POST /:id/unlock` (clear an account lockout — presumably
  calling `auth-service` internally, or acting on the mirrored ref
  depending on how that's wired).
- **`/api/logs`**: `GET /players` (player audit log — reads the
  `AuditLogRef` mirror), `GET /admin` (this service's own `AdminAuditLog`).

## Background jobs

`jobs/cleanup.js` — retention pruning, same pattern as `auth-service`'s
own cleanup job (see that file's doc), applied to this service's admin-
specific audit/log collections.

## Full endpoint reference

See `admin-service/README.md` for request/response bodies and env vars.
