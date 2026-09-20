# `game-client/src/pages/game/ui/` — the 60 UI panels

**One-line summary**: every HUD widget and interaction panel layered on
top of the 3D canvas by `GamePage.jsx`. Grouped here by role rather than
one file per doc, since most of these are conventional React panels that
call one backend endpoint and render a form/list — the interesting
architecture is in how they're **triggered and wired**, which is
consistent across all of them, not in each individual panel's own markup.

## The shared wiring pattern every panel follows

1. `GameEngine` detects proximity (to a building, house, crime opportunity,
   vehicle...) and emits a `gameEvents` event.
2. `GamePage.jsx` listens, sets React state, and shows a
   "Press E to enter..." prompt.
3. Player presses `E`/`Enter` → `GamePage.jsx` sets `openPanel` → the
   matching panel renders.
4. The panel calls its owning backend service directly over HTTP (with
   the player's JWT) — **not** through the engine at all. `onClose` is the
   only prop nearly every panel needs; a few (like `HousePanel`) also take
   an id (`houseId`/`houseName`) since they're not keyed 1:1 by building
   `type` the way most panels are.
5. On a successful action, the panel typically fires a
   `'veltriz:stats-updated'` or similar browser `CustomEvent`/`gameEvents`
   emit so other UI (a HUD stat, the character's health bar) picks up the
   change without the panel needing a reference to them.

If you're adding a new building-interaction panel, this is the shape to
copy — see `HOW_IT_WORKS.md` §7 for the same flow described from the
engine side.

## Building/location interaction panels (one per building `type`, opened via `openPanel === type`)

Most of these are themed, mostly-independent panels, each calling its own
specific backend endpoint(s) in `economy-service`/`game-world-service`/
`crime-service`: `BoutiquePanel`, `CasinoPanel`, `CinemaPanel`,
`CityHallPanel`, `CourthousePanel`, `CreditUnionPanel`,
`ElectronicsPanel`, `EmbassyPanel`, `FactoryPanel`, `FarmPanel`,
`FishMarketPanel`, `FishingWharfPanel`, `GovernmentComplexPanel`,
`GunStorePanel`, `GymPanel`, `HardwareStorePanel`, `HospitalPanel`,
`InsuranceOfficePanel`, `JewelerPanel`, `LogisticsHubPanel`,
`LotteryPanel`, `MarinaPanel`, `MarineResearchPanel`, `MarketPanel`,
`OilRigPanel`, `ParkPanel`, `PearlExchangePanel`, `PoliceStationPanel`,
`PortAuthorityPanel`, `QuantumLabsPanel`, `RealEstatePanel` (buy/sell/own
houses — the panel that owns the "which houses do I own" data
`HousePanel` separately queries to decide whether to offer relaxing —
see `engine/BuildingBuilder.md`/`HousePanel` below), `RestaurantPanel`,
`SchoolPanel`, `SmugglersDenPanel`, `StockExchangePanel`,
`TechCampusPanel`, `TradingPostPanel`, `UniversityPanel`, `JobPanel` (the
Job Center — apply/work/resign, the same endpoints `LocationCareers`
below reuses).

**Three of these are thin wrappers, not independent implementations** —
worth knowing so you don't duplicate logic that already exists:
- `CategoryShopPanel` is reused by `HospitalPanel` (category=`"medicine"`)
  and `RestaurantPanel` (category=`"food"`) — both are themed fronts over
  `economy-service`'s existing market buy-**and-use** flow (a consumable
  item), not two separate systems.
- `CategoryTradePanel` is reused by `ElectronicsPanel`, `BoutiquePanel`,
  and `JewelerPanel` — themed fronts over the market's buy/sell-back flow
  for **non-consumable** categories (held as inventory, sold back at a
  rate multiplier, no "use" action).
- `AutoDockMotorsPanel` is a one-line wrapper around
  `VehicleDealerPanel` (`terrain="land"`) — `VehicleDealerPanel` itself
  presumably also serves a water/marina variant given the `terrain` prop.

### `HousePanel` (not building-`type`-keyed — see `engine/GameEngine.md`'s house-proximity section)

Takes `houseId`/`houseName` props rather than being selected by a shared
`type`, since each of the 100+ houses is individually owned. Checks
ownership live against `RealEstatePanel`'s same "my houses" data; offers
a free "relax" action (reusing the exact same `/api/character/relax`
endpoint `ParkPanel` uses — no new backend needed) only if the player
actually owns that specific house.

### `LocationCareers`

Not opened via `openPanel` directly — embedded **inside** most of the
paid-location panels above (a "jobs available here" section at the
bottom). Reuses the same `economy-service` job endpoints `JobPanel` (the
dedicated Job Center) uses, filtered to jobs tagged with that location's
type.

## Crime

`CrimePanel` — the menu of available crime actions at the current
location. `CrimeMinigame` — the actual "commit the crime" interaction: a
marker sweeps across a bar and the player has to hit the timing window
(Space/click); this is what stands between picking a menu option and
actually succeeding — you can still fail even standing in the right spot,
and the server-side roll (via `crime-service`) is the real authority on
success, not just this client-side timing game.

## Vehicle/store panels reached differently

`VehicleDealerPanel` (buy vehicles — see `AutoDockMotorsPanel` above),
`ChronoStorePanel` (buys "Chrono Shards," the game's premium currency,
via `economy-service`'s `/api/payments/checkout` — currently routed
through a sandbox payment provider that moves no real money; see that
service's own docs for what plugging in a real provider would involve).

## Always-visible HUD overlays (not gated by `openPanel`)

`GameHUD` (wallet balance + Chrono Shard count, read live via a
`SocketContext` economy socket, plus the in-game clock via
`GameClockWidget`), `WeaponHUD`, `VehicleHUD`, `MiniMap`/`FullMap` (`M`
key toggles between them), `GameClockWidget` (fetches
`game-world-service`'s stateless world-clock endpoint once and ticks
locally between 60s re-syncs rather than polling every second — see that
service's `gameClock.js` for why the time is pure math server-side, not a
stored value), `NewsTicker` (simulation-service's generated news
articles), `SubtitleBar` (a single shared render target for **any** NPC/
character speech — ambient chatter, political-event chants, phone
calls — all funneled through one `'subtitle:show'` `gameEvents` emit
rather than each source having its own text UI), `FpsCounter` (see
`engine/GameEngine.md` — only renders once Settings > Show FPS is on).

## System panels

`PauseMenu` (Esc — Resume / Settings / Mute / Exit), `SettingsPanel`
(graphics quality + audio + mouse sensitivity/invert-Y + FPS toggle — see
`HOW_IT_WORKS.md` §9 for exactly how it applies live via
`gameEvents.emit('settings:update', patch)`), `WalletPanel` (a detailed
balance/transaction view, separate from the always-visible `GameHUD`
summary), `PhoneUI` (`P` key — a real, if simple, phone showing actual
wallet balance, actual government/election status, and actual crime heat,
not placeholder content), `PoliticsPanel` (lets the player manually
trigger a `WorldEventSystem` crowd event at their location — see that
file's `MANUAL_EVENT_TYPES`).

## What depends on these files

`GamePage.jsx` imports and conditionally renders every panel above.
Nothing in `engine/` imports from `ui/` at all — the dependency only ever
runs one direction (UI → calls backend services directly, and listens to
`gameEvents` the engine emits; the engine never imports a UI component).
