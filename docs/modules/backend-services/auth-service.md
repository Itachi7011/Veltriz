# `auth-service` (port 5000)

**Owns**: player accounts — signup/login, JWT issuance + refresh, email
verification, password reset, Google OAuth, avatar upload, account
lockout after repeated failed logins.

Every other backend service verifies the JWTs this service issues (shared
`JWT_SECRET` — see `SETUP_AND_DEVELOPMENT.md`) but never talks to this
service directly over HTTP for that — verification is stateless (the JWT
itself carries what's needed).

## Models

- **`User`**: `username` (unique, alphanumeric+underscore, 3-24 chars),
  `displayName`, `email` (unique), `password` (bcrypt-hashed, `select:
  false` — never returned by a query unless explicitly requested),
  `authProvider` (`'local'` | `'google'`), `googleId` (sparse-unique, only
  set for OAuth accounts), `avatarUrl` (Cloudinary URL), email-verification
  and password-reset token hashes + expiries (also `select: false`),
  `loginAttempts`/`lockUntil` (account lockout state), and a coarse `role`
  field — this service only ever issues `'player'`; admin accounts are a
  **separate** model entirely, owned by `admin-service`, not a role on
  this one.
- **`RefreshToken`**: long-lived refresh tokens, one document per active
  session/device, allowing `logout` (revoke one) vs `logout-all` (revoke
  every session) to actually differ.
- **`AuditLog`**: two `logType`s — `user_activity` (routine actions) and
  `user_audit` (security-relevant events: login, password change,
  lockout). Both retention-pruned by the cleanup job below,
  independently configurable via `USER_ACTIVITY_LOGS_RETENTION_DAYS`/
  `USER_AUDIT_LOGS_RETENTION_DAYS`.

## Routes (`/api/auth`)

`POST /signup`, `POST /login`, `POST /logout`, `POST /logout-all`,
`POST /refresh` (exchange a refresh token for a new access token),
`POST /change-password`, `POST /forgot-password`, `POST /reset-password`,
`POST /resend-verification`, `POST /verify-email`, `GET /me` (current
user from the JWT), `POST /avatar` (Cloudinary upload via `multer`),
`GET /google` (OAuth kickoff — `passport-google-oauth20`).

## Background jobs

`jobs/cleanup.js` — a `node-cron` job that deletes `AuditLog` entries
older than their configured retention window, split by `logType`.

## Config

`config/passport.js` (Google OAuth strategy), `config/sendgrid.js`
(verification/reset emails via `@sendgrid/mail`), `config/cloudinary.js`
(avatar storage), `config/db.js` (Mongo connection).

## Full endpoint reference

See this service's own `README.md` (`auth-service/README.md`) for
request/response bodies and required env vars — not duplicated here to
avoid the two going out of sync.
