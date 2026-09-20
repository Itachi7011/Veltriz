# `pages/character/CharacterCreate.jsx` + `CharacterPreview3D.jsx`

**One-line summary**: the one-time character creation form (name,
country/city, background, appearance pickers) plus its live-rotating 3D
preview — the only other place in the app besides the main game that
renders a `CharacterModel.js` rig outside of `GameEngine`.

## `CharacterCreate.jsx`

A conventional controlled-form React page — `displayName`/`country`/
`city`/`background` plus an `appearance` object
(`gender`/`skinTone`/`faceType`/`hairStyle`/`hairColor`/`outfitColor`)
built up via a series of swatch/option pickers, each just setting one key
of `appearance` in state. The `faceType` picker is populated from
`CharacterModel.js`'s exported `FACE_ARCHETYPES` array — see that file's
"face genetics" section for what each archetype actually changes. On
submit, posts the whole form (including the `appearance` object) to
`game-world-service`'s character-creation endpoint.

Country/city data is fetched once on mount (`loadingCountries`) from a
static list — not itself part of the 3D engine.

## `CharacterPreview3D.jsx`

A small, **self-contained** Three.js scene — its own renderer, camera, and
a slow auto-rotating turntable — that takes the in-progress `appearance`
object as a prop and calls `buildCharacter(appearance)`
(`engine/CharacterModel.js`) directly, live, as the player changes
pickers, so they see the actual rig update in real time rather than a
static illustration. This is **not** connected to `GameEngine` in any
way — it's a second, independent, much simpler Three.js scene that exists
purely for this one page, disposed on unmount.

## What depends on these files

Nothing else imports from either — they're leaf pages, reached only via
the app's post-signup / character-creation router flow. Both import
`buildCharacter` (and `CharacterCreate.jsx` additionally imports
`FACE_ARCHETYPES`/`SKIN_TONES`/`HAIR_STYLES`/`HAIR_COLORS`/
`OUTFIT_COLORS`) from `engine/CharacterModel.js` — if that file's
`appearance` object shape ever changes, both of these need checking
alongside every other consumer listed in `CharacterModel.md`.
