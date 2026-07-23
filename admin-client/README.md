# Veltriz — Admin Client

React + Vite frontend for admins. Completely separate app/deployment from
the player game client, talking only to `admin-service`.

## Setup

```bash
npm install
npm run dev     # http://localhost:5174
```

Create your first admin account at `/signup` — you'll need the
`ADMIN_SIGNUP_CODE` value from `admin-service`'s `.env`.

## Sidebar/navbar sync

Exactly the pattern you specified: `src/context/SidebarContext.jsx` holds
`isExpanded`/`toggleSidebar`. `AdminSidebar.jsx` and `AdminNavbar.jsx` both
read from it — the sidebar animates its own `width` via CSS transition, and
the navbar's `left` position + the main content's `margin-left` are set
from the same `isExpanded` value, so all three animate in lockstep. Toggling
works from either the sidebar's own collapse button or the navbar's menu
icon.

## Sidebar structure

`src/components/layout/navConfig.js` defines the nav tree. Leaf nodes have
a `path` and render as a real link; nodes with `children` are pure toggles
(no route) and can nest arbitrarily — see **Economy → Market → Items &
Prices** for a two-level-deep example, alongside simple one-level dropdowns
(**Players**) and plain leaf links (**Dashboard**, **Audit Logs**).

## Navbar features

Avatar + dropdown (profile/security/logout), a notifications bell with a
badge, a search input, dark/light toggle, and the sidebar collapse button
— all keyboard-and-click-outside dismissible, with `aria-expanded`/
`aria-haspopup`/`aria-label` wired up.

**Honest note:** the notifications dropdown is a static UI shell
(`NOTIFICATIONS_PLACEHOLDER` in `AdminNavbar.jsx`) — there's no real
notification-generating system in Phase 1 (that would mean building
something like the design doc's event/alert engine), so I built the
interface but didn't fake a backend for it. Same for the navbar search bar
— it's there and styled, but doesn't call a real search endpoint yet.

## Pages wired to real data

- **Dashboard** — live economy overview + player count
- **Players** — list/search/filter, suspend/ban/reactivate, clear login lockouts
- **Player detail** — wallet balance, credit/debit with a reason (goes in
  the ledger), recent transactions, recent activity log
- **Economy → Wallets** — paginated wallet list, lock/unlock
- **Economy → Jobs** — create/edit jobs (salary, cooldown, sector)
- **Economy → Market Items** — create/edit items, and **Override price**
  — the real-time price control feature, broadcasts instantly to every
  connected player via economy-service's Socket.IO
- **Audit Logs** — player activity and admin action trails
- **Settings → Profile / Security** — view profile, change password

## Auth

Same token-store + auto-refresh pattern as the game client (see its
README for the full explanation), pointed at `admin-service` instead, with
its own cookie name/path so it can never collide with a player session in
the same browser.
