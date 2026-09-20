# `engine/AudioSystem.js`

**One-line summary**: all game audio — SFX and ambience — is procedurally
synthesized with the raw Web Audio API. There are no audio asset files
(`.mp3`/`.wav`) anywhere in the project; every sound is oscillators/noise
built at runtime, in the same "no binary assets, everything is code"
spirit as the procedural visuals (see `TECH_STACK.md`).

## `class AudioSystem`

### `constructor()`

Just initializes state — `ctx` (the `AudioContext`) stays `null` until
`ensureStarted()`. Also sets the three user-controlled level fields
(`masterVolume: 0.8`, `musicVolume: 0.14`, `sfxVolume: 0.5`) — defaults
that the Settings panel's sliders read/write via
`GameEngine.applySettings()` (see `HOW_IT_WORKS.md` §9).

### `ensureStarted()`

Lazily creates the `AudioContext` and a 3-node gain graph
(`master → destination`, `musicGain → master`, `sfxGain → master`) the
first time it's called — browsers require audio to start from a user
gesture, so this is called on first click/keypress rather than at
construction. Also kicks off `_startAmbientMusic()`.

### `setMuted(muted)` / `setMasterVolume(v)` / `setMusicVolume(v)` / `setSfxVolume(v)`

Each ramps the relevant gain node's value with `setTargetAtTime` (a short,
click-free fade rather than an instant jump) and stores the new level so
it applies correctly even if called before `ensureStarted()` (the stored
value is what the gain nodes get initialized to once the context exists).
Muting and the volume sliders are independent — muting always drives
audible output to 0 regardless of the stored volume levels, so unmuting
restores whatever level was last set.

### `_startAmbientMusic()`

A simple generative ambient pad/rhythm loop — the specifics are just sound
design (oscillator frequencies/timing), not architecturally significant.

### `_blip({ freq, duration, type, gain, sweepTo })`

The shared low-level building block nearly every SFX below is built from:
one oscillator, optionally frequency-swept from `freq` to `sweepTo` over
`duration`, with a short attack/decay gain envelope, routed through
`sfxGain`.

### `_noiseBurst({ duration, gain, filterFreq })`

The other shared building block — white noise through a low-pass filter,
used for anything percussive/textured (gunshots, footsteps, hits) rather
than tonal.

### Public one-shot SFX methods

`playFootstep()`, `playJump()`, `playGunshot(weaponKey)`,
`playMeleeSwing()`, `playHitMarker()`, `playReload()`, `playHorn()`,
`playEngineTick(speedFactor)`, `playUIBeep()`, `playBusted()`,
`playCrowdMurmur()` — each is a short, specific combination of `_blip`/
`_noiseBurst` calls tuned for that event. `playGunshot` varies its
sound based on `weaponKey` (different weapons get a different pitch/
sharpness). `playEngineTick(speedFactor)` is called continuously while
driving with the vehicle's current speed fraction, pitching the engine
tone up with speed.

### `dispose()`

Closes the `AudioContext`.

## What depends on this file

`GameEngine.js` owns the one instance and is by far the primary caller —
footsteps/jump tied to `PhysicsController` state, gunfire/reload from
`WeaponSystem`, horn/engine tick while driving, busted/UI sounds from
various gameplay events. Listens for `gameEvents`'s `'audio:setMuted'`
and `'settings:update'` (for the volume sliders) rather than any UI code
holding a direct reference to this instance — see `HOW_IT_WORKS.md` §9.
