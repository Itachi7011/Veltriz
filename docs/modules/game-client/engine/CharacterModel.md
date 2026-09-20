# `engine/CharacterModel.js`

**One-line summary**: one shared procedural human rig builder, used for
the player, every pedestrian NPC, every crowd-event NPC, every remote
multiplayer player, and every vehicle driver — no separate "NPC model."
The largest and most anatomically/geometrically subtle file in the
project; several real bugs in this codebase's history trace back to
conventions established here that other files must agree with.

## The front-facing convention — read this before touching rotation anywhere in the engine

The rig's own local front is **-Z**, not +Z. This is enforced inside
`buildCharacter()` via a `headOrientation` sub-group with a fixed 180°
`rotation.y`, wrapping the head/face/hair construction (which is written
the "natural" way, facing local +Z, and then flipped as one rigid unit —
see `buildCharacter`'s own comments for why a whole-unit flip is safe
here: every facial feature is built as a left/right **mirrored pair**, so
flipping X along with Z as part of a 180° turn just swaps which physical
side gets which mirrored value, which is invisible for a bilaterally
mirrored face).

**The consequence for every caller**: to make this rig visually face the
direction of travel, its root `rotation.y` must be set to
`someHeadingOrYaw + Math.PI` — not just the raw heading/yaw. This project
has a real bug history of call sites forgetting that `+ Math.PI`
(pedestrian NPC wander, crowd-event NPCs, remote multiplayer players all
independently computed `Math.atan2(dx, dz)` without it and consequently
walked backward, facing directly away from their own direction of
travel — see `NpcSystem.md`/`WorldEventSystem.md`/`GameEngine.md` for
where this was found and fixed). If you add a new place that rotates a
rig built from this file based on a movement direction, this offset is
not optional.

## Face genetics — deterministic per-character variation without hand-authoring every face

`mulberry32(seed)` (a small deterministic PRNG) + `hashStringToSeed(str)`
+ `resolveFaceGenes(appearance)` together turn an `appearance` object into
a full set of facial proportions: which of the 5 `FACE_ARCHETYPES`
(`oval`/`round`/`square`/`heart`/`long` — each with a genuinely different
head-scale/jaw/chin shape, not just a recolor), plus continuous jitter on
eye size/spacing/tilt, brow angle/thickness, nose length/width/bridge,
mouth width/lip fullness/curve, ear size/flare, and cheekbone prominence.

- If `appearance.faceSeed` (a number) is present, it's used directly as
  the seed — `NpcSystem`/`VehicleSystem` pass a **fresh random** one per
  spawn specifically so two NPCs that happen to roll a similar color
  palette still get visibly different faces.
- Otherwise, a seed is deterministically hashed from the other appearance
  fields (skin/hair/outfit/gender/etc.) — this is what makes the **same**
  saved player character, or the **same** remote multiplayer user id,
  render with the same face every time rather than randomizing on every
  load.
- `appearance.faceArchetypePool` can restrict the random archetype pick to
  a subset — used to give a *role* a family resemblance (e.g. police NPCs
  are biased toward square/long — "stern" — archetypes) while individual
  officers still vary within that pool.
- `appearance.faceType` (an explicit archetype) overrides the random pick
  entirely — this is what the character-creation UI's face-shape picker
  sets.

## Body-building primitives

- **`limbSegment({ radius, length, material, radialSegments, capSegments,
  castShadow, receiveShadow })`**: the shared capsule-shaped bone segment
  used for arms/legs/fingers/the shoulder slope/ponytail hair — geometry
  is pre-translated so the pivot's origin is the segment's *top* and it
  extends downward along local -Y by `length`, which is what makes
  chaining segments (upper leg → lower leg → foot) trivial. `castShadow`/
  `receiveShadow` default to `true` but are explicitly set `false` for
  finger/thumb segments specifically — see the performance section below.
- **`buildTorsoLathe({ points, material, segments })`**: a
  `THREE.LatheGeometry` torso from a 2D height/radius profile. **A lathe
  is inherently radially symmetric** — its cross-section at any given
  height is a perfect circle, meaning front and back (and every other
  angle) are mathematically identical. This is *exactly* why the torso
  used to look the same from behind as from the front regardless of body
  type, and why a lathe alone can never fix that — see `buildCharacter`'s
  chest/belly/shoulder-blade section below for the actual fix.
- **`buildPhoneProp(scale)`**: the small phone mesh parented to the right
  hand grip, shown/hidden by `applyPhonePose`/`clearPhonePose`.
- **`buildHand({ skinMat, scale, gender })`**: a palm + 4 fingers (each
  **two-jointed** — a base knuckle and a tip, not one rigid capsule, so a
  hand can actually curl around something) + a thumb + a `grip` anchor
  `THREE.Group` at the front of the palm, correctly oriented so anything
  parented to it (a weapon, a phone, a steering wheel) sits naturally
  "held." Returns `{ hand, grip, fingers, thumb }` — `fingers`/`thumb` are
  what `applyGripPose()` (below) actually curls.
- **`buildFace(headGroup, { skinMat, skinTone, eyeColor, scale, gender,
  genes })`**: builds every facial feature from the resolved `genes` —
  eyes (with eyelid crease, brow, tilt), a real 3-part nose (bridge + tip
  + nostril wings, not a single cone), a 2-part mouth (separate upper/
  lower lip volumes with a corner curve), cheekbone bumps, structured ears
  (an outer rim + inner lobe), and an archetype-driven chin/jaw (a cone
  for `heart`'s pointed chin, a wide cylinder for `square`'s jaw, a sphere
  otherwise) — this archetype-driven *shape change*, not just a resize, is
  what makes the 5 archetypes actually look structurally different from
  each other rather than palette-swapped copies.
- **`buildHair(headGroup, { hairMat, hairStyle, scale, gender, genes })`**:
  builds the selected `HAIR_STYLES` entry, scaled to the same
  `genes.headScale` the head sphere itself uses — without this, a
  hairstyle sized for the default head proportions would visibly float
  over or gap around an archetype with different proportions (e.g. the
  `long` archetype's tall, narrow head).
- **`addShoulderSlope(torsoGroup, { side, scale, material, collarX,
  collarY, shoulderX, shoulderY })`**: bridges the (narrow) collar where
  the torso lathe now actually ends to the real shoulder/arm-socket
  position with an angled capsule — the trapezius/deltoid slope real
  shoulders have, which a lathe's flat circular top can never produce on
  its own. The collar point sits **above** the nominal shoulder height
  (partway up the side of the neck) and further inward, specifically so
  there's a real, visible vertical drop as well as horizontal reach — an
  earlier version of this fix used a collar point only slightly below the
  shoulder height, which technically added *some* slope but was shallow
  enough (a few degrees) to still read as flat/90°; the current numbers
  were chosen to produce a clearly visible ~25° slope, verified by
  computing the actual angle from the same coordinates the code uses, not
  just eyeballing it.

## `buildCharacter(appearance = {})`

The main export — builds the complete rig and returns
`{ group, totalHeight, hipOffset, scale, faceType, bones }`.

**`hipOffset`** deserves its own callout: it's the fixed vertical distance
from the rig's root (which represents ground/feet level — on-foot
movement places the root directly at `physics.position.y`) up to the hip
pivot. Anything that wants to seat this character somewhere **other**
than standing on the ground — a car seat, a bike saddle — has to place the
root at `(desired hip height - hipOffset)`, not at the desired hip height
directly, or the character floats a full hip-height too high. This was a
real, once-shipped bug (the driver visually sitting *on top of* the car
roof instead of inside the cabin) whose actual root cause was exactly
this — placing the root at the seat height without subtracting
`hipOffset` first. See `VehicleSystem.md`'s `_syncDriver` for the fix.

Inside `buildCharacter`, after the torso lathe (squashed to `scale.z =
0.62` — shallower front-to-back than side-to-side, since real torsos are
noticeably flatter that way and a lathe's default circular cross-section
is not), **front-only** chest/belly bulges and **back-only** shoulder-
blade bumps are added as separate meshes, sized to clearly protrude past
that flattened base rather than sitting flush with (and invisible
against) it — this combination is what actually gives the torso a
different front and back, which a lathe alone is structurally incapable
of on its own (see `buildTorsoLathe`'s note above). A first attempt at
this fix used a less-flattened base and smaller bulges that didn't
protrude past the base's own (still circular, still symmetric) widest
point, so the bounding box came out symmetric anyway despite the bulges
technically existing — worth knowing if a future "make the body more
X-shaped" change runs into the same trap.

A **blanket `root.traverse()` pass at the end** sets
`castShadow`/`receiveShadow` based on each mesh's own bounding-sphere
radius (anything under `0.025 * scale` doesn't cast) — this is a
performance fix, not a visual one: ~20 tiny finger/thumb segments per
character were each independently casting shadows before this, and this
pass (plus the equivalent explicit `castShadow: false` on the finger/
thumb `limbSegment()` calls themselves, which this same blanket pass used
to silently override) cut a character's shadow-casting mesh count roughly
in half. **If you add new tiny decorative geometry to this file, this
pass handles it automatically** — no per-mesh shadow flag needed unless
you want to override the size heuristic.

## `animateCharacter(bones, { time, speedFactor, headPitch, isGrounded, jumpT, onRamp })`

The per-frame procedural walk-cycle, called for the player, every NPC,
and every remote player. Every position/scale value is computed as an
**absolute** offset from a stored baseline (`bones.hips.userData.baseY`,
etc.) each frame — **never** accumulated with `+=`/`-=` across frames.
This is a direct fix for a real, once-shipped bug: the walk-bob used to
add to `hips.position.y` every frame while moving and never subtract it
back out, so the character (and every NPC, since they all run through
this same function) drifted continuously upward the longer a movement key
was held. If you're adding a new animated offset here, compute it as
`baseline + f(time)`, never as a running accumulator.

`onRamp` (set by `PhysicsController.onRamp` — see that file's doc) drives
a **different, higher-knee-lift gait** with a slower cadence specifically
while climbing/descending a staircase — real stair-climbing keeps both
knees more bent than a flat-ground stride, and this only ever activates
while genuinely on a registered stair/ramp footprint, so normal
flat-ground walking is untouched.

## `HAIR_STYLES`, `SKIN_TONES`, `OUTFIT_COLORS`, `HAIR_COLORS`

The catalogs the character-creation UI's pickers and `NpcSystem`'s
`randomAppearance()` draw from.

## `buildSkateboard()` / `applySkateboardPose(bones, {...})`

The skateboard prop mesh and its riding pose (crouched stance, arms out
for balance) — a separate, simpler pose system from the main walk cycle,
swapped in while `GameEngine.isSkateboarding`.

## `applyCrimePose(bones, progress)`

The crouched, reaching pose during a crime attempt's timing mini-game.
Same absolute-offset-not-accumulator fix as `animateCharacter` above
applies here too — this function used to subtract from `hips.position.y`
every frame for the whole crime-attempt duration, sinking the player
through the floor at a fixed rate per frame instead of holding one
crouched offset.

## `applyGripPose(bones, label, curl = 1)` / `clearGripPose(bones, label)`

Curls a hand's fingers/thumb from open (`curl = 0`) to a full wraparound
grip (`curl = 1`) — used any time a character is holding something: a
weapon grip (`WeaponSystem.equip`), a phone (`applyPhonePose` below), or a
steering wheel/handlebar (`VehicleSystem`'s `applyDrivingPose`).
`clearGripPose` is `applyGripPose(bones, label, 0)`.

## `applyPhonePose(bones)` / `clearPhonePose(bones)`

The phone-call pose (arm raised, phone visible, fingers curled around it
via `applyGripPose`) and its reverse.

## What depends on this file

Essentially every other engine file: `GameEngine.js` (player rig),
`NpcSystem.js` (pedestrian NPCs), `WorldEventSystem.js` (crowd-event
NPCs), `VehicleSystem.js` (drivers), `WeaponSystem.js` (grip pose on
equip), `CharacterPreview3D.jsx`/`CharacterCreate.jsx` (the character-
creation live preview). If you change this file's bone names or the
shape of the returned `bones` object, every one of those needs checking.
