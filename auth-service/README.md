# Veltriz — Auth Service

Identity & authentication microservice for Veltriz. Handles signup/login
(email+password and Google OAuth), email verification, password reset,
refresh-token rotation, avatar upload, and audit/activity logging.

This service owns **only** identity data (the `User` collection). Game data
(character, wallet, country/city choice, jobs, etc.) belongs to
`economy-service` and `game-world-service` — they reference the user by
`userId`, they don't duplicate identity fields.

## Setup

```bash
npm install
cp .env.example .env   # fill in your real values
npm run dev
```

Requires: MongoDB (Atlas free tier is fine), a SendGrid API key + verified
sender, a Cloudinary account (free tier), and a Google OAuth Client
ID/Secret (from Google Cloud Console — enable "Google People API", add
`http://localhost:5000/api/auth/google/callback` and your production
callback URL as authorized redirect URIs).

## How other Veltriz services should verify logins

Every service shares the same `JWT_SECRET`. A user logs in **once**, here,
and gets an access token. `economy-service` and `game-world-service` do
**not** need to call this service to check if a token is valid — they just
run the same `jwt.verify(token, process.env.JWT_SECRET)` locally (copy
`src/middleware/auth.middleware.js`'s `protect` function). This keeps
services independent and avoids a login check becoming a bottleneck/single
point of failure.

Only refresh-token rotation and revocation is centralized here (since that
needs the shared `RefreshToken` collection).

## Endpoints

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/signup` | — | Create account, sends verification email |
| POST | `/api/auth/login` | — | Login with email/username + password |
| GET | `/api/auth/google` | — | Start Google OAuth flow |
| GET | `/api/auth/google/callback` | — | Google OAuth redirect target |
| POST | `/api/auth/refresh` | cookie | Rotate refresh token, get new access token |
| POST | `/api/auth/logout` | cookie | Revoke current device's refresh token |
| POST | `/api/auth/logout-all` | Bearer | Revoke all devices |
| POST | `/api/auth/verify-email` | — | Verify email via token from email link |
| POST | `/api/auth/resend-verification` | Bearer | Resend verification email |
| POST | `/api/auth/forgot-password` | — | Request password reset email |
| POST | `/api/auth/reset-password` | — | Set new password via token |
| POST | `/api/auth/change-password` | Bearer | Change password while logged in |
| GET | `/api/auth/me` | Bearer | Get current user profile |
| POST | `/api/auth/avatar` | Bearer | Upload avatar (multipart, field `avatar`) |

## Notes on design decisions

- **Refresh tokens** are httpOnly cookies (not localStorage) — safer against
  XSS. Access tokens go in memory on the client and are attached as
  `Authorization: Bearer <token>`.
- **Token rotation**: every `/refresh` call revokes the old refresh token
  and issues a new one, so a leaked/stolen refresh token can only be used
  once before it stops working.
- **Account lockout**: `MAX_LOGIN_ATTEMPTS` failed logins locks the account
  for `LOCK_TIME`.
- **Verification/reset tokens** are never stored raw in the DB — only a
  SHA-256 hash — so a database leak alone can't be used to take over
  accounts or verify arbitrary emails.
