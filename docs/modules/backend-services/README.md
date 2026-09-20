# `backend-services/` — module docs index

One doc per backend service, covering its models, routes, and background
jobs. See `ARCHITECTURE.md` for the big picture (which services call
which, ports, data ownership) before diving into an individual service.

| Service | Port | Doc |
|---|---|---|
| `auth-service` | 5000 | [`auth-service.md`](./auth-service.md) |
| `economy-service` | 5001 | [`economy-service.md`](./economy-service.md) |
| `game-world-service` | 5002 | [`game-world-service.md`](./game-world-service.md) |
| `admin-service` | 5003 | [`admin-service.md`](./admin-service.md) |
| `simulation-service` | 5004 | [`simulation-service.md`](./simulation-service.md) |
| `crime-service` | 5005 | [`crime-service.md`](./crime-service.md) |

`admin-client` (the React admin dashboard) has no separate doc here — it's
a conventional data-dashboard SPA with no interesting architecture beyond
"calls `admin-service`'s REST API and renders tables/forms" (see
`TECH_STACK.md`). If you're working on it, its own component structure is
self-explanatory relative to which `admin-service` routes (documented in
`admin-service.md`) it's calling.

For request/response body shapes and the exact list of required
environment variables per service, see that service's own `README.md` in
its folder — those are kept as the copy-paste-ready reference and
deliberately not duplicated here, so there's exactly one place to update
when an endpoint's contract changes.
