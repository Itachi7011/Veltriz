# Veltriz — Crime Service

Owns risk-reward criminal actions (`CrimeAction` config) and each player's
heat/track record (`CrimeRecord`). Shares the same MongoDB cluster as every
other service, its own two collections only.

On a successful attempt it pays the player out by calling economy-service's
existing wallet-credit internal route directly (see
`src/services/economyClient.js`) — it does not touch the `Wallet` collection
itself.

## Setup

```bash
npm install
cp .env.example .env   # JWT_SECRET and INTERNAL_API_KEY must match every other service exactly
npm run seed            # seeds 5 starter crime actions (pickpocket -> bank heist)
npm run dev
```

## Endpoints

Player-facing (`/api/crime`, requires player JWT):
- `GET /actions` — active crime actions
- `GET /me` — your heat, totals, and per-action cooldowns
- `POST /attempt { actionKey }` — attempt a crime
- `POST /pay-fine` — the Police Station's legal option: instantly pay off
  ALL current heat (5 VC per heat point) by debiting the wallet via
  economy-service, instead of waiting for it to decay on its own

Internal (`/api/internal`, requires `X-Internal-Api-Key`, called by admin-service):
- `GET /actions` / `POST /actions` — admin CRUD for crime actions
- `GET /heat` / `POST /heat/:userId/reset` — player heat leaderboard + reset

## Heat

Heat rises per attempt (more on a failed attempt, and more for riskier
actions), caps at 100, and halves your success odds at 70+ ("too hot"). It
decays automatically in the background — see `src/cron/heatDecay.js` — so it
never requires manual admin intervention to come back down.
