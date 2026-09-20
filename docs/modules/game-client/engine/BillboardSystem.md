# `engine/BillboardSystem.js`

**One-line summary**: the big banners/TV screens mounted on certain
building facades — driven by **real, live data** fetched from
`economy-service`/`game-world-service` (stock prices, commodity prices,
election status), not decorative placeholder art.

## Which building types get which screen

| Building `type` | Screen kind | Content |
|---|---|---|
| `bank`, `stock_exchange`, `credit_union` | `'stock'` | scrolling stock-price ticker |
| `market`, `trading_post` | `'commodity'` | a board of `gold`/`silver`/`oil_barrel`/`wheat`/`fuel` prices |
| `city_hall`, `government_complex`, `courthouse` | `'political'` | current Mayor + this term's candidates (Veltriz's own in-fiction election system) |
| `casino`, `cinema` | `'ad'` | a scrolling neon ad screen (the one purely-decorative kind) |

`FETCH_INTERVAL_MS` (45000) — how often live data is re-fetched from the
backend; screens redraw on their own faster cadence (`update()`) using
whatever data was last fetched, so the screen still animates (ticker
scroll) between fetches.

## `class BillboardSystem`

### `constructor({ buildingEntries })`

Scans every building entry (from `GameEngine.buildingEntries`) and, for
each type in the table above, calls `_attachScreen()`.

### `_attachScreen(entry, kind)`

Creates a `<canvas>` + `THREE.CanvasTexture` + an emissive plane mesh
sized/positioned against that specific building's facade (using its
`footprint`), and pushes a `{ mesh, canvas, ctx, kind, scrollT, ... }`
record onto `this.screens`.

### `update(dt, now)`

Called every frame by `GameEngine`. Re-fetches live data
(`economy-service`'s stock/market endpoints,
`game-world-service`'s government/election status) at most every
`FETCH_INTERVAL_MS`, stored on `this.marketItems`/`this.govStatus`.
Advances each screen's scroll offset by `dt` and calls `_draw(screen)`
for each.

### `_draw(screen)`

Dispatches to the right drawing function based on `screen.kind`, then
marks the canvas texture `needsUpdate = true` so Three.js re-uploads it.

### `_drawTicker({ ctx, canvas, scrollT }, category, title, onlyKeys)`

Draws a horizontally-scrolling stock ticker — fetched stock symbols and
prices scrolling right-to-left, looping. Used for both the `'stock'` kind
and (with a different `category`/`onlyKeys`) reused for the commodity
board.

### `_drawPolitical({ ctx, canvas })`

Draws the current Mayor's name/photo-placeholder and a short list of this
term's candidates from `this.govStatus`.

### `_drawAd({ ctx, canvas, scrollT })`

The one non-data-driven screen — a simple animated neon-style ad pattern,
scrolling similarly to the ticker but without any backend fetch involved.

### `dispose()`

Removes all screen meshes/canvases.

## What depends on this file

`GameEngine.js` owns the one instance (constructed in `_initCivicSystems()`
after buildings exist) and calls `update()` every frame. Nothing else
references it — it has no interaction with the player beyond being
visible.
