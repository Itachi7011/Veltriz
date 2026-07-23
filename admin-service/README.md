# Veltriz — Admin Service

Backend for the admin panel: admin authentication (completely separate
from player auth), player account management, and economy control. Shares
the same MongoDB cluster as the other three services.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Then create your first admin account by calling `POST /api/admin-auth/signup`
with the `signupCode` matching your `ADMIN_SIGNUP_CODE` env value (this
prevents randoms from creating admin accounts if the endpoint is ever
exposed publicly — share the code only with people you trust).

## Why this service can read/write the player `users` collection directly

Per the project's own scope ("admin can control/change anything in the
game"), this service connects to the **exact same MongoDB
database** as `auth-service`, and defines lightweight Mongoose models
(`src/models/PlayerUserRef.js`, `src/models/AuditLogRef.js`) pointed at
its `users` and `auditlogs` collections. This is a deliberate shared-database
pattern for admin tooling — not how the player-facing services talk to each
other (they never touch each other's collections; only this admin service
does, and only for read + moderation-field writes).

**Important boundary:** `PlayerUserRef` never declares or touches
`password`, `emailVerifyTokenHash`, or `resetPasswordTokenHash`. It's only
used for listing accounts and updating `status` / clearing lockout fields.
All the actual auth business logic (hashing, tokens, lockout counting)
stays exclusively in `auth-service`.

## Why economy control goes through a separate key, not player JWTs

This service calls `economy-service`'s `/api/internal/*` routes using a
shared secret (`INTERNAL_API_KEY`, must match economy-service's env
exactly) — not an admin JWT, and not a player JWT. `economy-service` has no
idea what an "admin" is; it just trusts requests carrying the right key.
This keeps economy-service simple and means admin-service is the only
place that needs to know both "what is an admin" and "how to reach the
economy."

## Admin auth model

Deliberately mirrors auth-service's player auth (JWT access + rotating
refresh token in an httpOnly cookie, account lockout after
`MAX_LOGIN_ATTEMPTS`, hashed-token password reset via SendGrid) but with:
- its own `AdminUser` collection (completely separate from player `User`)
- its own JWT secret (`ADMIN_JWT_SECRET`) so an admin token and a player
  token are never interchangeable even if one secret ever leaked
- its own refresh cookie name/path (`veltriz_admin_rt`, scoped to
  `/api/admin-auth`) so it can't collide with the player game client's
  refresh cookie if they're ever loaded in the same browser

## Endpoints

**Admin auth** (`/api/admin-auth`): `signup` (requires `signupCode`),
`login`, `refresh`, `logout`, `forgot-password`, `reset-password`, `me`.

**User management** (`/api/users`, all require admin auth):
- `GET /` — paginated list, `?search=` and `?status=` filters
- `GET /:id` — profile + wallet + recent transactions + recent activity logs, in one call
- `POST /:id/status` `{ status }` — suspend/ban/reactivate
- `POST /:id/unlock` — clear a failed-login lockout

**Economy control** (`/api/economy`, all require admin auth, all proxy to
economy-service): `overview`, `wallets` (list/credit/debit/lock/unlock),
`jobs` (list/create-or-update), `market-items` (list/create-or-update),
`market-items/adjust-price` — **this is the main "control prices in
real time" feature**; it broadcasts to every connected player instantly.

## Note on the `CLIENT_*_LOGS_RETENTION_DAYS` env vars

You listed `CLIENT_ACTIVITY_LOGS_RETENTION_DAYS` and
`CLIENT_AUDIT_LOGS_RETENTION_DAYS` in your original variable list alongside
the `ADMIN_*` and `USER_*` ones. Being upfront: there isn't a concrete
"client" logging concept implemented anywhere in Phase 1 (it wasn't clear
whether you meant admin-panel-frontend visitor analytics, or something
else) — so those two are **not wired to anything yet**, rather than having
me guess and build something that might not match what you actually meant.
`USER_*` retention is handled in `auth-service`; `ADMIN_*` activity/audit
log retention (`src/jobs/cleanup.js`, same daily-cron pattern as
auth-service) **is** wired up here and controlled by
`ADMIN_ACTIVITY_LOGS_RETENTION_DAYS` / `ADMIN_AUDIT_LOGS_RETENTION_DAYS`.
