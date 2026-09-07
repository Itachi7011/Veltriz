import * as THREE from 'three';

/**
 * Procedural stylized humanoid builder — v2.
 *
 * The v1 body was built from stacked cylinders (a separate waist cylinder
 * glued to a separate chest cylinder, tapered-cylinder limbs) — functional,
 * but the seams between stacked primitives and the faceted cylinder taper
 * are exactly what read as "not looking good" close up. This version:
 *
 *  - Sculpts the torso as ONE continuous lathed surface (a body-of-
 *    revolution profile curve from hip to shoulder) instead of gluing
 *    cylinders together, so there's no visible seam at the waist and the
 *    hip/waist/chest curve actually reads as a body silhouette, gendered
 *    (hourglass taper for female, straighter for male).
 *  - Builds every limb segment as a THREE.CapsuleGeometry (rounded caps
 *    at both ends) instead of a hard-edged tapered cylinder, so joints
 *    blend into each other instead of showing a flat disc where two
 *    primitives meet.
 *
 * Bone hierarchy and the buildCharacter()/animateCharacter() API are
 * unchanged from v1, so nothing else in the engine needed to change.
 */

const BASE_HEAD_RADIUS = 0.125; // multiplied by `scale` everywhere below — single source of truth for buildFace/buildHair/buildCharacter's head sphere, so they can never disagree about how big the head actually is

function shade(hex, amt) {
  const c = new THREE.Color(hex);
  if (amt >= 0) c.lerp(new THREE.Color('#ffffff'), amt);
  else c.lerp(new THREE.Color('#000000'), -amt);
  return c;
}

// ---------------------------------------------------------------------
// FACE GENETICS — every character/NPC gets a real, distinct head shape
// and set of facial proportions instead of one fixed face template
// recolored per person. Deterministic per character (same appearance in
// → same face out, so a saved player character or a remote player looks
// the same every time they're rendered), but varied enough — 5 head-
// shape archetypes crossed with continuous per-feature jitter — that two
// characters essentially never look alike.
// ---------------------------------------------------------------------

/** Tiny deterministic PRNG (mulberry32) — good enough statistical
 * quality for "pick a face", doesn't need to be cryptographic, just
 * needs to be the same sequence every time for the same seed. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Cheap string hash (djb2-ish) → 32-bit seed, used when no explicit
 * numeric `faceSeed` is provided so appearance stays deterministic. */
function hashStringToSeed(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

export const FACE_ARCHETYPES = ['oval', 'round', 'square', 'heart', 'long'];
export const FACE_ARCHETYPE_LABELS = {
  oval: 'Oval',
  round: 'Round',
  square: 'Square jaw',
  heart: 'Heart',
  long: 'Long',
};

// Base head-shape parameters per archetype — deliberately NOT just a
// recolor knob: each one changes the actual head silhouette (sphere
// scale), the jaw/chin primitive and its proportions, and how prominent
// the cheekbones read, so archetypes are visually distinguishable at a
// glance, not just in a stats panel.
const FACE_ARCHETYPE_PRESETS = {
  oval: { headScale: [0.92, 1.08, 0.98], jawWidth: 1.0, chinStyle: 'round', chinScale: [1.0, 0.72, 0.86], cheek: 0.35 },
  round: { headScale: [1.05, 0.97, 1.03], jawWidth: 1.06, chinStyle: 'round', chinScale: [1.18, 0.6, 0.94], cheek: 0.55 },
  square: { headScale: [1.02, 0.95, 1.0], jawWidth: 1.24, chinStyle: 'wide', chinScale: [1.32, 0.5, 0.96], cheek: 0.18 },
  heart: { headScale: [1.0, 1.02, 0.97], jawWidth: 0.8, chinStyle: 'pointed', chinScale: [0.6, 0.9, 0.68], cheek: 0.5 },
  long: { headScale: [0.82, 1.22, 0.9], jawWidth: 0.9, chinStyle: 'narrow', chinScale: [0.85, 0.98, 0.78], cheek: 0.22 },
};

// jitter(rng, base, spread) → base scaled by a random factor in
// [1-spread, 1+spread], so two characters sharing an archetype still
// don't share exact proportions.
function jitter(rng, base, spread) {
  return base * (1 - spread + rng() * spread * 2);
}

/**
 * Resolve a full set of facial "genes" for a character from its
 * appearance object. Deterministic: the same appearance (or the same
 * explicit `faceSeed`) always resolves to the same face.
 *
 * @param {Object} appearance
 * @param {number} [appearance.faceSeed] explicit numeric seed (NpcSystem/
 *   VehicleSystem pass a fresh random one per spawn so recolored NPCs
 *   that happen to share a palette still get different faces)
 * @param {string} [appearance.faceType] explicit archetype pick (player
 *   character creation lets people choose this directly)
 * @param {string[]} [appearance.faceArchetypePool] restrict the random
 *   pick to a subset of archetypes — used to give a role a family
 *   resemblance (e.g. police skew square/long — "stern") while
 *   individuals within that role still vary.
 */
function resolveFaceGenes(appearance = {}) {
  const seedSource =
    typeof appearance.faceSeed === 'number'
      ? appearance.faceSeed
      : hashStringToSeed(
          [
            appearance.gender,
            appearance.skinTone,
            appearance.hairColor,
            appearance.hairStyle,
            appearance.outfitColor,
            appearance.pantsColor,
            appearance.shoeColor,
            appearance.eyeColor,
            appearance.buildScale,
            appearance.faceType,
          ].join('|')
        );
  const rng = mulberry32(seedSource);

  const pool =
    Array.isArray(appearance.faceArchetypePool) && appearance.faceArchetypePool.length
      ? appearance.faceArchetypePool
      : FACE_ARCHETYPES;
  const faceType = FACE_ARCHETYPES.includes(appearance.faceType)
    ? appearance.faceType
    : pool[Math.floor(rng() * pool.length)] || 'oval';

  const preset = FACE_ARCHETYPE_PRESETS[faceType] || FACE_ARCHETYPE_PRESETS.oval;

  return {
    faceType,
    headScale: preset.headScale.map((v) => jitter(rng, v, 0.035)),
    jawWidth: jitter(rng, preset.jawWidth, 0.06),
    chinStyle: preset.chinStyle,
    chinScale: preset.chinScale.map((v) => jitter(rng, v, 0.08)),
    cheekbone: Math.max(0, Math.min(1, jitter(rng, preset.cheek, 0.3))),
    browHeight: jitter(rng, 1, 0.14),
    browAngle: jitter(rng, 1, 0.5), // multiplies the archetype-neutral brow tilt
    browThickness: jitter(rng, 1, 0.22),
    eyeSize: jitter(rng, 1, 0.13),
    eyeSpacing: jitter(rng, 1, 0.09),
    eyeTilt: (rng() - 0.5) * 0.32,
    noseLength: jitter(rng, 1, 0.16),
    noseWidth: jitter(rng, 1, 0.18),
    noseBridge: jitter(rng, 1, 0.2),
    mouthWidth: jitter(rng, 1, 0.14),
    lipFullness: jitter(rng, 1, 0.22),
    mouthCurve: (rng() - 0.4) * 0.5, // slight bias toward neutral/soft-smile over frown
    earSize: jitter(rng, 1, 0.14),
    earFlare: jitter(rng, 1, 0.3),
  };
}

// A capsule "bone" whose pivot (the Group's origin) sits at the TOP of the
// segment (the joint), extending downward by `length` — rotating the
// pivot rotates it exactly like a real limb joint would. Using a capsule
// (rounded ends) instead of a flat-ended cylinder means adjacent segments
// blend together at the joint instead of showing a hard seam.
function limbSegment({ radius, length, material, radialSegments = 8, capSegments = 4, castShadow = true, receiveShadow = true }) {
  const cylLength = Math.max(0.001, length - radius * 2);
  const geo = new THREE.CapsuleGeometry(radius, cylLength, capSegments, radialSegments);
  geo.translate(0, -length / 2, 0);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  const pivot = new THREE.Group();
  pivot.add(mesh);
  pivot.userData.length = length;
  return { pivot, mesh };
}

// A single smooth body-of-revolution torso: no seam between hip/waist/
// chest because it's one continuous lathed surface, and the profile
// curve itself carries the gendered silhouette (hourglass vs. straight)
// instead of relying on separately-sized stacked cylinders.
//
// LatheGeometry only generates the swept OUTER surface — it does NOT cap
// the top and bottom rims (imagine a lampshade with no lid and no
// bottom). Left uncapped, that's a literal hole: from some camera
// angles (low third-person angle, or the head/neck not fully covering
// the top rim) you can see straight through the torso to whatever is
// behind it, which is exactly the "look through its body" bug. Both
// ends are explicitly capped with a flat disc here to close it.
function buildTorsoLathe({ points, material, segments = 20 }) {
  const vec2s = points.map(([y, r]) => new THREE.Vector2(Math.max(0.001, r), y));
  const geo = new THREE.LatheGeometry(vec2s, segments);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const group = new THREE.Group();
  group.add(mesh);

  const [bottomY, bottomR] = points[0];
  const [topY, topR] = points[points.length - 1];
  const bottomCap = new THREE.Mesh(new THREE.CircleGeometry(bottomR, segments), material);
  bottomCap.rotation.x = Math.PI / 2;
  bottomCap.position.y = bottomY;
  group.add(bottomCap);
  const topCap = new THREE.Mesh(new THREE.CircleGeometry(topR, segments), material);
  topCap.rotation.x = -Math.PI / 2;
  topCap.position.y = topY;
  group.add(topCap);

  return group;
}

// A small phone prop, attached to the right grip on every character
// (player and NPCs alike) but hidden by default — PhoneSystem/NpcSystem
// toggle it visible (with the arm raised) when actually "using" it.
function buildPhoneProp(scale) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.045 * scale, 0.095 * scale, 0.008 * scale),
    new THREE.MeshStandardMaterial({ color: '#111318', roughness: 0.3, metalness: 0.4 })
  );
  g.add(body);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.037 * scale, 0.082 * scale),
    new THREE.MeshStandardMaterial({ color: '#7dd3fc', emissive: '#38bdf8', emissiveIntensity: 0.7, roughness: 0.2 })
  );
  screen.position.z = 0.0045 * scale;
  g.add(screen);
  g.visible = false;
  return g;
}

function buildHand({ skinMat, scale, gender }) {
  const hand = new THREE.Group();

  const palmGeo = new THREE.SphereGeometry(0.052 * scale, 10, 8);
  const palm = new THREE.Mesh(palmGeo, skinMat);
  palm.scale.set(1, 1.15, 0.55);
  palm.position.y = -0.055 * scale;
  palm.castShadow = true;
  hand.add(palm);

  // Four fingers, each with TWO jointed segments (knuckle + tip) instead
  // of one rigid capsule — this is what lets a hand actually curl around
  // a weapon grip, a phone, or a steering wheel/handlebar instead of
  // always showing flat straight fingers no matter what it's "holding".
  // Elongated (length notably bigger than radius) and spaced so adjacent
  // capsules never intersect — spacing between finger centers stays
  // comfortably above 2x radius.
  const fingerBaseLen = 0.036 * scale;
  const fingerTipLen = 0.03 * scale;
  const fingerRadius = 0.0095 * scale;
  const fingerOffsets = [-0.0345, -0.0115, 0.0115, 0.0345].map((v) => v * scale);
  const fingers = fingerOffsets.map((offsetX, i) => {
    const lenMult = i === 1 || i === 2 ? 1 : 0.88;
    const radMult = i === 1 || i === 2 ? 1 : 0.92;
    const base = limbSegment({
      radius: fingerRadius * radMult,
      length: fingerBaseLen * lenMult,
      material: skinMat,
      radialSegments: 6,
      capSegments: 2,
      castShadow: false,
      receiveShadow: false,
    });
    base.pivot.position.set(offsetX, -0.1 * scale, 0);
    base.pivot.rotation.x = 0.42 + (i === 0 || i === 3 ? 0.1 : 0);
    hand.add(base.pivot);

    const tip = limbSegment({
      radius: fingerRadius * radMult * 0.85,
      length: fingerTipLen * lenMult,
      material: skinMat,
      radialSegments: 6,
      capSegments: 2,
      castShadow: false,
      receiveShadow: false,
    });
    tip.pivot.position.y = -fingerBaseLen * lenMult;
    tip.pivot.rotation.x = 0.35;
    base.pivot.add(tip.pivot);

    return { base: base.pivot, tip: tip.pivot };
  });

  // Thumb: base knuckle + tip, angled out to the side and slightly
  // forward like a real opposable thumb rather than a fifth finger.
  const thumbBaseLen = 0.05 * scale;
  const thumbTipLen = 0.03 * scale;
  const thumbBase = limbSegment({
    radius: fingerRadius * 1.15,
    length: thumbBaseLen,
    material: skinMat,
    radialSegments: 6,
    capSegments: 2,
    castShadow: false,
    receiveShadow: false,
  });
  thumbBase.pivot.position.set(0.052 * scale * (gender === 'female' ? 0.95 : 1), -0.04 * scale, 0.018 * scale);
  thumbBase.pivot.rotation.z = -0.85;
  thumbBase.pivot.rotation.x = 0.22;
  hand.add(thumbBase.pivot);

  const thumbTip = limbSegment({
    radius: fingerRadius * 1.0,
    length: thumbTipLen,
    material: skinMat,
    radialSegments: 6,
    capSegments: 2,
    castShadow: false,
    receiveShadow: false,
  });
  thumbTip.pivot.position.y = -thumbBaseLen;
  thumbTip.pivot.rotation.x = 0.2;
  thumbBase.pivot.add(thumbTip.pivot);

  const thumb = { base: thumbBase.pivot, tip: thumbTip.pivot };

  // A grip anchor at the front of the palm, oriented so anything parented
  // to it (a tool/weapon) sits naturally "held" rather than floating
  // beside the hand — WeaponSystem attaches equipped items here.
  const grip = new THREE.Group();
  grip.name = 'grip';
  grip.position.set(0, -0.07 * scale, 0.03 * scale);
  grip.rotation.x = -Math.PI / 2.1;
  hand.add(grip);

  return { hand, grip, fingers, thumb };
}

/**
 * Builds a full, distinct human face on `headGroup` driven by `genes`
 * (see resolveFaceGenes). Every feature — eye size/spacing/tilt, brow
 * angle/thickness, a real 3-part nose (bridge + tip + nostrils), 2-part
 * lips with a mouth-corner curve, cheekbone volume, and ears with an
 * outer rim + lobe — reads from genes, so archetypes look structurally
 * different from each other and individuals within an archetype still
 * vary instead of being palette-swapped clones of one template.
 */
function buildFace(headGroup, { skinMat, skinTone, eyeColor, scale, gender, genes }) {
  const g = genes;
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.5 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f2ea, roughness: 0.4 });
  const irisMat = new THREE.MeshStandardMaterial({ color: eyeColor, roughness: 0.3 });
  const browMat = new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.7 });
  const lipBaseColor = gender === 'female' ? '#b5605f' : '#9a6b5c';
  const lipMatUpper = new THREE.MeshStandardMaterial({ color: shade(lipBaseColor, -0.06), roughness: 0.5 });
  const lipMatLower = new THREE.MeshStandardMaterial({ color: lipBaseColor, roughness: 0.5 });
  const innerEarMat = new THREE.MeshStandardMaterial({ color: shade(skinTone, -0.1), roughness: 0.72 });

  const headR = BASE_HEAD_RADIUS * scale;

  // ---- Cheekbones — subtle volume under the eyes, strength per gene ----
  if (g.cheekbone > 0.15) {
    [-1, 1].forEach((side) => {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(headR * (0.22 + g.cheekbone * 0.1), 10, 8), skinMat);
      cheek.scale.set(0.55, 0.4, 0.5);
      cheek.position.set(side * headR * 0.62, -headR * 0.14, headR * 0.7);
      headGroup.add(cheek);
    });
  }

  [-1, 1].forEach((side) => {
    const eyeX = side * headR * 0.42 * g.eyeSpacing;
    const eyeY = headR * 0.06;
    const eyeZ = headR * 0.86;
    const eyeR = headR * 0.155 * g.eyeSize;

    const eyeSocket = new THREE.Group();
    eyeSocket.position.set(eyeX, eyeY, 0);
    eyeSocket.rotation.z = side * g.eyeTilt;
    headGroup.add(eyeSocket);

    const white = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 10, 8), whiteMat);
    white.scale.set(1, 0.72, 0.6);
    white.position.set(0, 0, eyeZ);
    eyeSocket.add(white);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.55, 10, 8), irisMat);
    iris.position.set(0, 0, eyeZ + headR * 0.05);
    eyeSocket.add(iris);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(eyeR * 0.26, 8, 6), darkMat);
    pupil.position.set(0, 0, eyeZ + headR * 0.09);
    eyeSocket.add(pupil);

    // Upper eyelid crease — a thin dark sliver just above the eye, the
    // single biggest thing that makes a face read as "has eyelids"
    // instead of "has two marbles glued to it".
    const lidMat = new THREE.MeshStandardMaterial({ color: shade(skinTone, -0.16), roughness: 0.7 });
    const lid = new THREE.Mesh(new THREE.BoxGeometry(eyeR * 1.9, headR * 0.025, eyeR * 1.0), lidMat);
    lid.position.set(0, eyeR * 0.55, eyeZ - headR * 0.01);
    lid.rotation.x = -0.3;
    eyeSocket.add(lid);

    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(headR * 0.36 * (0.85 + g.browThickness * 0.3), headR * 0.05 * g.browThickness, headR * 0.06),
      browMat
    );
    brow.position.set(0, eyeY + headR * (0.2 + 0.05 * g.browHeight), eyeZ - headR * 0.02);
    brow.rotation.z = side * -0.12 * g.browAngle;
    eyeSocket.add(brow);

    // Ear: outer rim (a partial torus reads as cartilage far better than
    // a flattened sphere) plus an inner lobe.
    const earGroup = new THREE.Group();
    earGroup.position.set(side * headR * 0.98, -headR * 0.02, 0);
    earGroup.rotation.y = side * 0.15 * g.earFlare;
    headGroup.add(earGroup);

    const earRim = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.15 * g.earSize, headR * 0.045 * g.earSize, 8, 12, Math.PI * 1.5), skinMat);
    earRim.rotation.y = Math.PI / 2;
    earRim.rotation.z = 0.3;
    earGroup.add(earRim);

    const earLobe = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.075 * g.earSize, 8, 8), innerEarMat);
    earLobe.scale.set(0.55, 0.9, 0.7);
    earLobe.position.set(headR * 0.01, -headR * 0.12 * g.earSize, 0);
    earGroup.add(earLobe);
  });

  // ---- Nose: bridge + tip + nostril wings, not a single cone ----
  const noseGroup = new THREE.Group();
  noseGroup.position.set(0, headR * 0.16, headR * 0.62);
  headGroup.add(noseGroup);

  const bridgeLen = headR * 0.55 * g.noseLength;
  const bridge = new THREE.Mesh(
    new THREE.CylinderGeometry(headR * 0.05 * g.noseBridge, headR * 0.075 * g.noseWidth, bridgeLen, 8),
    skinMat
  );
  bridge.rotation.x = Math.PI / 2.35;
  bridge.position.set(0, -headR * 0.08, bridgeLen * 0.42);
  noseGroup.add(bridge);

  const tip = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.09 * g.noseWidth, 10, 8), skinMat);
  tip.scale.set(1, 0.85, 0.95);
  tip.position.set(0, -headR * 0.24, bridgeLen * 0.86);
  noseGroup.add(tip);

  [-1, 1].forEach((side) => {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.055 * g.noseWidth, 8, 6), skinMat);
    wing.scale.set(0.8, 0.6, 0.9);
    wing.position.set(side * headR * 0.08 * g.noseWidth, -headR * 0.27, bridgeLen * 0.8);
    noseGroup.add(wing);

    const nostril = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.022, 6, 5), darkMat);
    nostril.position.set(side * headR * 0.06 * g.noseWidth, -headR * 0.29, bridgeLen * 0.88);
    noseGroup.add(nostril);
  });

  // ---- Mouth: separate upper/lower lip volumes with a corner curve ----
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, -headR * 0.42, headR * 0.9);
  mouthGroup.rotation.z = g.mouthCurve * 0.15;
  headGroup.add(mouthGroup);

  const mouthW = headR * 0.32 * g.mouthWidth;
  const upperLip = new THREE.Mesh(new THREE.BoxGeometry(mouthW, headR * 0.032 * g.lipFullness, headR * 0.05), lipMatUpper);
  upperLip.position.y = headR * 0.02;
  mouthGroup.add(upperLip);

  const lowerLip = new THREE.Mesh(new THREE.BoxGeometry(mouthW * 0.94, headR * 0.042 * g.lipFullness, headR * 0.05), lipMatLower);
  lowerLip.position.y = -headR * 0.03 * g.lipFullness;
  mouthGroup.add(lowerLip);

  [-1, 1].forEach((side) => {
    const corner = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.018 * g.lipFullness, 6, 5), lipMatLower);
    corner.position.set(side * mouthW * 0.5, -headR * 0.005 + g.mouthCurve * headR * 0.02, 0);
    mouthGroup.add(corner);
  });

  // ---- Chin / jaw — the single biggest driver of "which archetype is
  // this" at a glance, since it changes both the primitive shape and its
  // proportions rather than just resizing the same sphere. ----
  let chin;
  if (g.chinStyle === 'pointed') {
    chin = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.24, headR * 0.42, 10), skinMat);
    chin.rotation.x = Math.PI;
    chin.position.set(0, -headR * 0.68, headR * 0.5);
  } else if (g.chinStyle === 'wide') {
    chin = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.26, headR * 0.2, headR * 0.24, 12), skinMat);
    chin.position.set(0, -headR * 0.6, headR * 0.5);
  } else {
    chin = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.22, 10, 8), skinMat);
    chin.position.set(0, -headR * 0.62, headR * 0.55);
  }
  chin.scale.x *= g.chinScale[0];
  chin.scale.y *= g.chinScale[1];
  chin.scale.z *= g.chinScale[2];
  headGroup.add(chin);

  // Jaw width hint — two subtle skin-toned wedges flare the lower face
  // out (square/round archetypes) or leave it tighter (heart/long).
  if (Math.abs(g.jawWidth - 1) > 0.03) {
    [-1, 1].forEach((side) => {
      const jaw = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.16, 8, 7), skinMat);
      jaw.scale.set(0.5 * g.jawWidth, 0.55, 0.6);
      jaw.position.set(side * headR * 0.62 * g.jawWidth, -headR * 0.42, headR * 0.35);
      headGroup.add(jaw);
    });
  }
}

function buildHair(headGroup, { hairMat, hairStyle, scale, gender, genes }) {
  const headR = BASE_HEAD_RADIUS * scale;
  const style = hairStyle || (gender === 'female' ? 'long' : 'short');
  // Hair is built as a sibling of the (archetype-scaled) head mesh, so it
  // needs the same non-uniform scale to actually sit on the head instead
  // of floating over a narrower/taller/wider skull — e.g. the 'long'
  // archetype's tall, narrow head would otherwise leave a visible gap
  // under a hair cap sized for the default proportions.
  const hs = (genes && genes.headScale) || [1, 1, 1];

  if (style === 'bald') return;

  if (style === 'buzz' || style === 'short' || style === 'ponytail' || style === 'long') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.06, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
    cap.scale.set(hs[0], hs[1], hs[2]);
    cap.position.y = headR * 0.12 * hs[1];
    cap.castShadow = true;
    headGroup.add(cap);
  }

  if (style === 'short' || style === 'buzz') {
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.5 * hs[0], headR * 0.22, headR * 0.5 * hs[2]), hairMat);
    fringe.position.set(0, headR * 0.42 * hs[1], headR * 0.75 * hs[2]);
    headGroup.add(fringe);
  }

  if (style === 'ponytail') {
    const { pivot: tail } = limbSegment({ radius: headR * 0.12, length: headR * 1.7, material: hairMat, radialSegments: 8 });
    tail.position.set(0, headR * 0.15 * hs[1], -headR * 0.95 * hs[2]);
    tail.rotation.x = 2.1;
    headGroup.add(tail);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.15, headR * 0.035, 6, 10), hairMat);
    tie.position.set(0, headR * 0.05 * hs[1], -headR * 0.98 * hs[2]);
    tie.rotation.x = Math.PI / 2;
    headGroup.add(tie);
  }

  if (style === 'long') {
    const drape = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.95, headR * 2.1, 12, 1, true), hairMat);
    drape.scale.set(hs[0], 1, hs[2]);
    drape.position.set(0, -headR * 1.1, -headR * 0.1 * hs[2]);
    drape.rotation.x = Math.PI;
    drape.castShadow = true;
    headGroup.add(drape);
  }
}

/**
 * Build a full jointed character rig.
 *
 * @param {Object} appearance
 * @param {'male'|'female'} appearance.gender
 * @param {string} appearance.skinTone
 * @param {string} appearance.outfitColor
 * @param {string} appearance.hairColor
 * @param {string} [appearance.hairStyle] 'bald'|'buzz'|'short'|'ponytail'|'long'
 * @param {string} [appearance.pantsColor]
 * @param {string} [appearance.shoeColor]
 * @param {number} [appearance.buildScale] extra uniform scale (used for
 *   crowd/NPC variety — a stand-in for age/height without new geometry)
 * @returns {{ group: THREE.Group, bones: Object, totalHeight: number }}
 */
// Bridges the (now narrow-collared) torso top to the actual shoulder/arm
// socket with an angled capsule — the trapezius/deltoid slope real
// shoulders have, instead of a flat lathe disc meeting the arm at a hard
// 90°. Runs from near the base of the neck diagonally out (and slightly
// down) to the exact same (shoulderX, shoulderY) the arm socket uses, so
// there's no visible seam between this and the shoulderCap sphere there.
function addShoulderSlope(torsoGroup, { side, scale, material, collarX, collarY, shoulderX, shoulderY }) {
  const dx = shoulderX - collarX;
  const dy = shoulderY - collarY;
  const length = Math.hypot(dx, dy);
  const { pivot } = limbSegment({ radius: 0.07 * scale, length, material, radialSegments: 10 });
  pivot.position.set(collarX, collarY, 0);
  // limbSegment's capsule extends along local -Y by `length` by
  // construction — rotate around Z so that -Y instead points from the
  // collar toward the shoulder socket (dx, dy).
  pivot.rotation.z = Math.atan2(dx, -dy);
  torsoGroup.add(pivot);
}

export function buildCharacter(appearance = {}) {
  const {
    gender = 'male',
    skinTone = '#c68863',
    outfitColor = '#3b82f6',
    hairColor = '#2b2b2b',
    hairStyle,
    pantsColor = '#232842',
    shoeColor = '#171a26',
    eyeColor = '#3c2a1e',
    buildScale = 1,
  } = appearance;

  const isFemale = gender === 'female';
  const scale = (isFemale ? 0.95 : 1.0) * buildScale;
  // Shoulder width relative to head size is what makes a figure read as
  // "human" vs. "bobblehead" — real adult shoulder span is roughly
  // 2.5-3x head width, not the ~3.4x (male) this rig used to work out to
  // once the head-swallowing neck bug and undersized head are accounted
  // for. Combined with BASE_HEAD_RADIUS's increase above, these land
  // right in that realistic range.
  const shoulderWidth = (isFemale ? 0.32 : 0.35) * scale;
  const hipWidth = (isFemale ? 0.29 : 0.22) * scale;

  // Resolve this character's facial genetics once up front — head shape,
  // brow/eye/nose/mouth/ear proportions all derive from this, and it's
  // deterministic per appearance so the same character always looks the
  // same across sessions/clients.
  const genes = resolveFaceGenes(appearance);

  const skinMat = new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.72, metalness: 0.02 });
  const skinMatDark = new THREE.MeshStandardMaterial({ color: shade(skinTone, -0.06), roughness: 0.72 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: outfitColor, roughness: 0.8 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.78 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.5, metalness: 0.05 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.55 });

  const root = new THREE.Group();
  root.name = 'characterRoot';

  const legLength = 0.46 * scale;
  const shinLength = 0.42 * scale;
  const legTopY = legLength + shinLength;

  const hips = new THREE.Group();
  hips.position.y = legTopY;
  // Baseline Y for the hip bone — animateCharacter()/applyCrimePose()
  // read this and always set an ABSOLUTE offset from it each frame
  // (never a running `+=`/`-=`), so the walk bob/crouch pose can never
  // accumulate into the character drifting upward or sinking the longer
  // you hold a movement key.
  hips.userData.baseY = legTopY;
  root.add(hips);

  const legRefs = {};
  [-1, 1].forEach((side) => {
    const label = side === -1 ? 'Left' : 'Right';
    const upperLeg = limbSegment({ radius: 0.068 * scale, length: legLength, material: pantsMat, radialSegments: 10 });
    upperLeg.pivot.position.set(side * hipWidth * 0.62, -0.03 * scale, 0);
    hips.add(upperLeg.pivot);

    // Small hip-joint blend sphere — sized close to the leg's own radius
    // (NOT a giant pelvis ball) so it smooths the join without engulfing
    // the leg attachment, which was the previous "hips and legs mixed
    // into one blob" bug.
    const hipBlend = new THREE.Mesh(new THREE.SphereGeometry(0.074 * scale, 10, 8), pantsMat);
    upperLeg.pivot.add(hipBlend);

    const lowerLeg = limbSegment({ radius: 0.05 * scale, length: shinLength, material: skinMatDark, radialSegments: 10 });
    lowerLeg.pivot.position.y = -legLength;
    upperLeg.pivot.add(lowerLeg.pivot);

    // Knee blend sphere — the upper/lower leg capsules have different
    // radii (thigh thicker than shin), so without this the joint shows a
    // visible step; sized as the average of the two.
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.059 * scale, 10, 8), skinMatDark);
    lowerLeg.pivot.add(knee);

    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.052 * scale, 0.052 * scale, 0.06 * scale, 10), shoeMat);
    cuff.position.y = -shinLength + 0.03 * scale;
    lowerLeg.pivot.add(cuff);

    // Ankle joint — a real pivot bone (not the foot glued rigidly to the
    // shin) so the foot can dorsiflex/plantarflex through the gait cycle
    // (toe lifts on the forward swing, toe pushes off behind) instead of
    // staying perpendicular to the leg like a peg-leg the whole time.
    const ankle = new THREE.Group();
    ankle.position.y = -shinLength;
    ankle.userData.baseRotX = 0;
    lowerLeg.pivot.add(ankle);

    const ankleBlend = new THREE.Mesh(new THREE.SphereGeometry(0.046 * scale, 8, 7), skinMatDark);
    ankle.add(ankleBlend);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.088 * scale, 0.055 * scale, 0.15 * scale, 1, 1, 2), shoeMat);
    foot.position.set(0, -0.008 * scale, 0.05 * scale);
    foot.castShadow = true;
    ankle.add(foot);

    // Rounded toe cap — softens the front of what would otherwise be a
    // hard box corner and reads as an actual shoe toe box.
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.05 * scale, 10, 8), shoeMat);
    toe.scale.set(1, 0.62, 0.75);
    toe.position.set(0, -0.008 * scale, 0.125 * scale);
    toe.castShadow = true;
    ankle.add(toe);

    // Heel counter — a small block at the back of the ankle, the other
    // half of what makes a box read as "shoe" instead of "brick".
    const heel = new THREE.Mesh(new THREE.BoxGeometry(0.07 * scale, 0.05 * scale, 0.05 * scale), shoeMat);
    heel.position.set(0, -0.006 * scale, -0.05 * scale);
    ankle.add(heel);

    const sole = new THREE.Mesh(
      new THREE.BoxGeometry(0.092 * scale, 0.02 * scale, 0.22 * scale),
      new THREE.MeshStandardMaterial({ color: '#0d0f16', roughness: 0.9 })
    );
    sole.position.set(0, -0.033 * scale, 0.03 * scale);
    ankle.add(sole);

    legRefs[`upperLeg${label}`] = upperLeg.pivot;
    legRefs[`lowerLeg${label}`] = lowerLeg.pivot;
    legRefs[`ankle${label}`] = ankle;
  });

  // ---- Torso: one continuous lathed silhouette from hip to shoulder ----
  const chestHeight = 0.34 * scale;
  const shoulderY = 0.16 * scale + chestHeight;
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.05 * scale;
  hips.add(torsoGroup);
  torsoGroup.userData.baseScaleY = 1;

  // Profile now stops at a modest hip radius right above where the legs
  // attach (hips-local y ≈ -0.03), instead of the old separate oversized
  // pelvis sphere that visually swallowed the top of both legs.
  //
  // The torso profile ends at a NARROW collar width (not the full
  // shoulder width) — a lathe can only produce a flat circular disc at
  // whatever radius it ends on, so ending it at full shoulder width is
  // what made the shoulder read as a flat "table top" meeting the arm at
  // a hard 90°. Real shoulders get their width from the trapezius/
  // deltoid muscle sloping UP AND OUT from the base of the neck to the
  // point of the shoulder — that slope is added as separate angled
  // geometry below (addShoulderSlope), bridging this narrow collar to
  // the actual arm socket position.
  const collarWidth = shoulderWidth * 0.42;
  const profile = isFemale
    ? [
        [-0.06 * scale, hipWidth * 0.88],
        [0.0 * scale, hipWidth * 1.05],
        [0.06 * scale, shoulderWidth * 0.6],
        [0.13 * scale, shoulderWidth * 0.78],
        [shoulderY * 0.78, shoulderWidth * 0.62],
        [shoulderY * 0.92, collarWidth],
      ]
    : [
        [-0.06 * scale, hipWidth * 0.78],
        [0.02 * scale, shoulderWidth * 0.72],
        [0.13 * scale, shoulderWidth * 0.84],
        [shoulderY * 0.78, shoulderWidth * 0.68],
        [shoulderY * 0.92, collarWidth],
      ];

  const torso = buildTorsoLathe({ points: profile, material: shirtMat, segments: 22 });
  // A lathe is inherently radially symmetric — its front and back are
  // mathematically IDENTICAL at every height, which is why the torso
  // used to look the same from behind as from the front no matter the
  // body type. The fix has two parts, and BOTH matter: squashing the
  // lathe itself flatter front-to-back (0.62, well below its own widest
  // profile radius) so it stops being the dominant silhouette, and THEN
  // adding front-only volume (chest/belly) and back-only volume
  // (shoulder blades) that actually protrudes past that flattened base
  // — an asymmetric bulge added on top of an unchanged, still-wide
  // circular cross-section would just sit flush with the surface and be
  // invisible, which is what a smaller first attempt at this ran into.
  torso.scale.z = 0.62;
  torsoGroup.add(torso);

  const chestBulge = new THREE.Mesh(new THREE.SphereGeometry(shoulderWidth * (isFemale ? 0.54 : 0.6), 12, 10), shirtMat);
  chestBulge.scale.set(1, isFemale ? 0.6 : 0.78, 0.62);
  chestBulge.position.set(0, chestHeight * (isFemale ? 0.95 : 0.7), shoulderWidth * 0.42);
  chestBulge.castShadow = true;
  torsoGroup.add(chestBulge);

  const bellyBulge = new THREE.Mesh(new THREE.SphereGeometry(shoulderWidth * 0.52, 10, 8), shirtMat);
  bellyBulge.scale.set(0.95, 0.72, 0.58);
  bellyBulge.position.set(0, 0.02 * scale, shoulderWidth * 0.34);
  torsoGroup.add(bellyBulge);

  // Shoulder blades — subtle, but enough that the back reads as a back
  // (with the spine's natural inward curve between them) instead of a
  // mirror of the chest.
  [-1, 1].forEach((side) => {
    const blade = new THREE.Mesh(new THREE.SphereGeometry(shoulderWidth * 0.26, 8, 6), shirtMat);
    blade.scale.set(1, 1.25, 0.4);
    blade.position.set(side * shoulderWidth * 0.34, shoulderY * 0.58, -shoulderWidth * 0.4);
    torsoGroup.add(blade);
  });

  // Neck — long enough to actually be visible below the jaw instead of
  // being entirely swallowed by the head sphere sitting right on top of
  // it (the old neck was only 0.1*scale tall, SHORTER than the head's
  // own radius of 0.11*scale, so the head completely hid it).
  const neckLength = 0.17 * scale;
  const neck = new THREE.Group();
  neck.position.y = shoulderY;
  torsoGroup.add(neck);
  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.056 * scale, 0.068 * scale, neckLength, 10), skinMat);
  neckMesh.position.y = neckLength / 2;
  neck.add(neckMesh);

  const head = new THREE.Group();
  // Head sits on TOP of the neck with only a small overlap (for a
  // natural jaw/neck blend) rather than swallowing the whole neck.
  head.position.y = neckLength + 0.028 * scale;
  head.userData.baseY = head.position.y;
  neck.add(head);
  // The whole head — sphere, face, hair — is built facing local +Z, but
  // this rig's own convention (see CameraRig.js: `rotation.y = yaw +
  // Math.PI` is what makes the BODY face the direction of travel) needs
  // the head's front to be -Z for the two to agree. Rather than mirror
  // every individual coordinate inside buildFace/buildHair (error-prone
  // across ~40 Z-offset lines), everything is built the "natural" way
  // and this single 180° turn corrects it — safe to do as one rigid
  // flip because every feature in buildFace is already constructed as a
  // left/right MIRRORED pair (eyes, ears, brows, jaw wedges via the
  // `[-1,1].forEach(side => ...)` pattern), so flipping X along with Z
  // here just swaps which physical side gets which mirrored value,
  // which looks identical for a bilaterally mirrored face.
  const headOrientation = new THREE.Group();
  headOrientation.rotation.y = Math.PI;
  head.add(headOrientation);

  const headGeo = new THREE.SphereGeometry(BASE_HEAD_RADIUS * scale, 18, 14);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  // Head silhouette comes from the resolved face archetype (oval / round
  // / square / heart / long) instead of one fixed proportion for every
  // character — this is the single biggest driver of "this NPC's face
  // actually looks different from that one".
  headMesh.scale.set(genes.headScale[0], genes.headScale[1], genes.headScale[2]);
  headMesh.castShadow = true;
  headOrientation.add(headMesh);

  buildFace(headOrientation, { skinMat, skinTone, eyeColor, scale, gender, genes });
  buildHair(headOrientation, { hairMat, hairStyle, scale, gender, genes });

  const upperArmLength = 0.27 * scale;
  const forearmLength = 0.25 * scale;
  const armRefs = {};
  [-1, 1].forEach((side) => {
    const label = side === -1 ? 'Left' : 'Right';
    const shoulder = new THREE.Group();
    shoulder.position.set(side * shoulderWidth * 0.88, shoulderY * 0.94, 0);
    torsoGroup.add(shoulder);

    // The sloped trapezius/deltoid bridge from the narrow collar (where
    // the torso lathe now actually ends) out to this exact shoulder
    // socket — see addShoulderSlope's own comment for why the lathe
    // alone can't produce this slope. The collar point sits ABOVE
    // shoulderY (partway up the side of the neck) and further inward,
    // so there's a real vertical drop as well as horizontal reach out to
    // the arm socket — a shallow height difference here is exactly what
    // read as "flat / 90°" before, even though a slope technically
    // existed.
    addShoulderSlope(torsoGroup, {
      side,
      scale,
      material: shirtMat,
      collarX: side * collarWidth * 0.6,
      collarY: shoulderY * 1.15,
      shoulderX: shoulder.position.x,
      shoulderY: shoulder.position.y,
    });

    const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.072 * scale, 12, 10), shirtMat);
    shoulder.add(shoulderCap);

    const upperArm = limbSegment({ radius: 0.058 * scale, length: upperArmLength, material: shirtMat, radialSegments: 10 });
    shoulder.add(upperArm.pivot);
    upperArm.pivot.rotation.z = side * -0.12;

    const forearm = limbSegment({ radius: 0.045 * scale, length: forearmLength, material: skinMat, radialSegments: 10 });
    forearm.pivot.position.y = -upperArmLength;
    forearm.pivot.rotation.x = 0.08;
    upperArm.pivot.add(forearm.pivot);

    // Elbow blend sphere, same reasoning as the knee: the upper arm and
    // forearm capsules have different radii, so this smooths the step.
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.05 * scale, 10, 8), skinMat);
    forearm.pivot.add(elbow);

    const cuff = new THREE.Mesh(
      new THREE.TorusGeometry(0.05 * scale, 0.012 * scale, 6, 12),
      new THREE.MeshStandardMaterial({ color: shade(outfitColor, -0.1), roughness: 0.8 })
    );
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -upperArmLength * 0.92;
    upperArm.pivot.add(cuff);

    const { hand, grip, fingers, thumb } = buildHand({ skinMat, scale, gender });
    hand.position.y = -forearmLength;
    forearm.pivot.add(hand);

    let phoneProp = null;
    if (label === 'Right') {
      phoneProp = buildPhoneProp(scale);
      phoneProp.rotation.x = Math.PI / 2.2;
      phoneProp.position.y = -0.03 * scale;
      grip.add(phoneProp);
    }

    armRefs[`shoulder${label}`] = shoulder;
    armRefs[`upperArm${label}`] = upperArm.pivot;
    armRefs[`forearm${label}`] = forearm.pivot;
    armRefs[`hand${label}`] = hand;
    armRefs[`grip${label}`] = grip;
    armRefs[`fingers${label}`] = fingers;
    armRefs[`thumb${label}`] = thumb;
    if (phoneProp) armRefs.phoneRight = phoneProp;
  });

  root.traverse((obj) => {
    if (obj.isMesh) {
      // Same reasoning as VehicleModel's equivalent pass: only meshes
      // above a small-size threshold cast shadows — a character has
      // ~20 tiny finger/thumb segments alone, and this blanket pass was
      // overriding the castShadow:false already set on them above.
      // Everything still receives shadows normally.
      obj.geometry.computeBoundingSphere();
      const isTiny = obj.geometry.boundingSphere.radius < 0.025 * scale;
      obj.castShadow = !isTiny;
      obj.receiveShadow = true;
    }
  });

  const totalHeight = legTopY + 0.05 * scale + shoulderY + 0.1 * scale + 0.22 * scale;

  return {
    group: root,
    totalHeight,
    // Distance from this rig's root (which represents ground/feet level
    // — see how on-foot movement places the root directly at
    // physics.position.y) up to the hip pivot. Anything that wants to
    // seat this character somewhere OTHER than standing on the ground —
    // a car seat, a bike saddle — needs to place the root at
    // (desired hip height − hipOffset), not at the desired hip height
    // directly, or the character ends up floating a hip-height too high
    // (exactly the "sitting on the car roof" bug this fixes).
    hipOffset: legTopY,
    scale,
    faceType: genes.faceType,
    bones: {
      hips,
      torso: torsoGroup,
      neck,
      head,
      ...legRefs,
      ...armRefs,
    },
  };
}

/**
 * Procedurally animates a built rig each frame — walk cycle, idle
 * breathing, and head look. `speedFactor` is 0 (idle) to 1 (full run).
 */
export function animateCharacter(bones, { time, speedFactor = 0, headPitch = 0, isGrounded = true, jumpT = 0, onRamp = false }) {
  const swing = Math.min(1, speedFactor);
  const freq = 7 + speedFactor * 4;
  // Climbing/descending a staircase gets a noticeably higher knee-lift
  // and a slower cadence than flat-ground walking — same idea as a real
  // person visibly stepping UP onto something rather than striding, and
  // it only ever applies while PhysicsController reports the player is
  // actually within a registered stair/ramp footprint (onRamp), so
  // normal flat-ground walking/running is completely unaffected.
  const stepLift = onRamp ? 1.55 : 1;
  const amp = 0.55 * swing * stepLift;
  const t = time * (onRamp ? freq * 0.8 : freq);

  // Every position/scale value below is computed as an ABSOLUTE offset
  // from the bone's stored baseline (`userData.baseY`/`baseScaleY`) each
  // frame, never accumulated with `+=`/`-=` across frames. The walk-bob
  // used to add to hips.position.y every single frame while moving and
  // never subtracted it back out, so the character (and every NPC, since
  // they run through this same function) drifted continuously upward the
  // longer a movement key was held — this is the fix for that.
  const hipBaseY = bones.hips.userData.baseY ?? bones.hips.position.y;

  if (swing > 0.01) {
    bones.upperLegLeft.rotation.x = Math.sin(t) * amp;
    bones.upperLegRight.rotation.x = -Math.sin(t) * amp;
    // On stairs, the trailing knee also bends further (not just the
    // lifting one) — a real stair-climbing stride keeps both knees more
    // bent than a flat-ground stride does.
    const lowerLegBase = onRamp ? amp * 0.35 : 0;
    bones.lowerLegLeft.rotation.x = Math.max(lowerLegBase, -Math.sin(t + 0.6) * amp * 1.1);
    bones.lowerLegRight.rotation.x = Math.max(lowerLegBase, Math.sin(t + 0.6) * amp * 1.1);

    bones.upperArmLeft.rotation.x = -Math.sin(t) * amp * 0.8;
    bones.upperArmRight.rotation.x = Math.sin(t) * amp * 0.8;
    bones.forearmLeft.rotation.x = 0.15 + Math.max(0, Math.sin(t) * amp * 0.6);
    bones.forearmRight.rotation.x = 0.15 + Math.max(0, -Math.sin(t) * amp * 0.6);
    // Ankles flex through the stride instead of staying rigidly
    // perpendicular to the shin — toes lift on the forward swing
    // (dorsiflex) and the foot rolls through toe-off (plantarflex) just
    // behind it, which is what actually reads as "walking" rather than
    // "shins with blocks glued to the end sliding across the ground".
    if (bones.ankleLeft && bones.ankleRight) {
      bones.ankleLeft.rotation.x = Math.sin(t + 1.0) * amp * 0.55;
      bones.ankleRight.rotation.x = -Math.sin(t + 1.0) * amp * 0.55;
    }
    // A touch of shoulder sway opposite the hip sway — a real gait
    // counter-rotates the upper body against the lower body rather than
    // turning as one rigid block.
    if (bones.shoulderLeft && bones.shoulderRight) {
      const shoulderTwist = -Math.sin(t) * 0.035 * swing;
      bones.shoulderLeft.rotation.y = shoulderTwist;
      bones.shoulderRight.rotation.y = shoulderTwist;
    }

    bones.hips.position.y = hipBaseY + Math.abs(Math.sin(t)) * 0.015;
    bones.hips.rotation.y = Math.sin(t) * 0.06 * swing;

    // A light forward lean through the torso that grows with speed —
    // reads as "running" rather than "walking with the legs turned up".
    if (bones.torso) bones.torso.rotation.x = -swing * 0.12;
  } else {
    const breathe = Math.sin(time * 1.6) * 0.015;
    bones.upperLegLeft.rotation.x = 0;
    bones.upperLegRight.rotation.x = 0;
    bones.lowerLegLeft.rotation.x = 0;
    bones.lowerLegRight.rotation.x = 0;
    bones.upperArmLeft.rotation.x = breathe * 0.4;
    bones.upperArmRight.rotation.x = -breathe * 0.4;
    bones.forearmLeft.rotation.x = 0.12;
    bones.forearmRight.rotation.x = 0.12;
    bones.hips.rotation.y *= 0.9;
    bones.hips.position.y = hipBaseY;
    if (bones.ankleLeft && bones.ankleRight) {
      bones.ankleLeft.rotation.x = 0;
      bones.ankleRight.rotation.x = 0;
    }
    if (bones.shoulderLeft && bones.shoulderRight) {
      bones.shoulderLeft.rotation.y *= 0.85;
      bones.shoulderRight.rotation.y *= 0.85;
    }
    if (bones.torso) {
      bones.torso.rotation.x *= 0.85;
      // Idle breathing shows up as a very small chest-rise, applied as an
      // absolute scale (safe — scale doesn't accumulate the way a `+=`
      // on position would) rather than a fixed pose.
      bones.torso.scale.y = 1 + breathe * 0.02;
    }
  }

  if (!isGrounded) {
    bones.upperLegLeft.rotation.x = 0.4 + jumpT * 0.2;
    bones.upperLegRight.rotation.x = 0.4 + jumpT * 0.2;
    bones.lowerLegLeft.rotation.x = 0.5;
    bones.lowerLegRight.rotation.x = 0.5;
    bones.hips.position.y = hipBaseY;
    // Toes point down in the air, like a real jump/fall — a rigid flat
    // foot mid-air is one of the more obvious "not human" tells.
    if (bones.ankleLeft && bones.ankleRight) {
      bones.ankleLeft.rotation.x = 0.35;
      bones.ankleRight.rotation.x = 0.35;
    }
  }

  bones.head.rotation.x = headPitch * 0.6;
  bones.neck.rotation.x = headPitch * 0.4;
  // Subtle head bob synced to the stride, absolute offset from the
  // head's own stored baseline for the same reason as the hips above.
  if (bones.head.userData && typeof bones.head.userData.baseY === 'number') {
    bones.head.position.y = bones.head.userData.baseY + (swing > 0.01 ? Math.abs(Math.sin(t)) * 0.008 : 0);
  }
}

export const HAIR_STYLES = ['short', 'buzz', 'long', 'ponytail', 'bald'];
export const SKIN_TONES = ['#f1c39a', '#e0ac69', '#c68863', '#8d5524', '#5a3825'];
export const OUTFIT_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#111827'];
export const HAIR_COLORS = ['#2b2b2b', '#5a3825', '#7a4a1e', '#c9c9c9', '#8b1e1e', '#e8c15a'];

/** A simple skateboard prop — deck + 4 small wheels — parented under the
 * character root while skateboard mode is active. */
export function buildSkateboard() {
  const g = new THREE.Group();
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.025, 0.62),
    new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.7 })
  );
  deck.castShadow = true;
  g.add(deck);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.005, 0.6), new THREE.MeshStandardMaterial({ color: '#333', roughness: 0.9 }));
  grip.position.y = 0.015;
  g.add(grip);

  const wheelMat = new THREE.MeshStandardMaterial({ color: '#e8e8e8', roughness: 0.4 });
  [-1, 1].forEach((zSide) => {
    [-1, 1].forEach((xSide) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 10), wheelMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(xSide * 0.09, -0.03, zSide * 0.22);
      g.add(wheel);
    });
  });

  return g;
}

/** A simple riding stance — feet planted shoulder-width, slight crouch,
 * arms out for balance — used instead of the walk cycle while
 * skateboarding, with a light procedural bob/lean for feel. */
export function applySkateboardPose(bones, { time, speedFactor = 0 }) {
  const bob = Math.sin(time * 9) * 0.05 * Math.min(1, speedFactor);
  const lean = Math.sin(time * 2.2) * 0.08;

  bones.upperLegLeft.rotation.x = 0.5 + bob;
  bones.upperLegRight.rotation.x = 0.35 - bob;
  bones.lowerLegLeft.rotation.x = -0.4;
  bones.lowerLegRight.rotation.x = -0.3;
  bones.upperArmLeft.rotation.x = -0.3;
  bones.upperArmRight.rotation.x = -0.3;
  bones.upperArmLeft.rotation.z = 0.9;
  bones.upperArmRight.rotation.z = -0.9;
  bones.forearmLeft.rotation.x = 0.1;
  bones.forearmRight.rotation.x = 0.1;
  bones.hips.rotation.z = lean * 0.3;
  bones.hips.rotation.y = lean;
  // Feet stay flat and level on the deck rather than inheriting whatever
  // walking-flex angle they last had.
  if (bones.ankleLeft && bones.ankleRight) {
    bones.ankleLeft.rotation.x = -0.1;
    bones.ankleRight.rotation.x = -0.05;
  }
}

/**
 * A crouched, reaching pose used while a crime attempt's timing mini-game
 * is active — this is what turns the crime system from "a UI bar
 * resolves and nothing visibly happens" into the character actually
 * looking like they're doing something covert (crouched at a door/shop
 * window/someone's pocket) for the duration of the attempt.
 * `progress` 0..1 eases into the crouch and holds it.
 */
export function applyCrimePose(bones, progress) {
  const ease = Math.min(1, progress * 4); // quick ease-in, then hold
  const jitter = Math.sin(progress * 26) * 0.05 * ease;

  // Absolute offset from the stored baseline, not a running `-=` — the
  // previous version subtracted a fixed amount from hips.position.y
  // EVERY FRAME for the whole crime-attempt duration (this function is
  // called once per frame while it's active), so the character sank
  // through the floor at roughly 0.14 units per frame instead of holding
  // a single crouched offset. Same bug class as the walk-bob fix above.
  const hipBaseY = bones.hips.userData.baseY ?? bones.hips.position.y;
  bones.hips.position.y = hipBaseY - 0.14 * ease;
  bones.upperLegLeft.rotation.x = 0.9 * ease;
  bones.upperLegRight.rotation.x = 0.7 * ease;
  bones.lowerLegLeft.rotation.x = -1.1 * ease;
  bones.lowerLegRight.rotation.x = -0.9 * ease;
  if (bones.ankleLeft && bones.ankleRight) {
    bones.ankleLeft.rotation.x = 0.3 * ease;
    bones.ankleRight.rotation.x = 0.3 * ease;
  }

  bones.upperArmRight.rotation.x = -(1.0 * ease) + jitter;
  bones.forearmRight.rotation.x = 0.6 * ease + jitter * 0.6;
  bones.upperArmLeft.rotation.x = -0.3 * ease;
  bones.forearmLeft.rotation.x = 0.2 * ease;

  bones.head.rotation.x = 0.35 * ease;
  bones.hips.rotation.y = Math.sin(progress * 3) * 0.08 * ease;
}

/** Holding a phone up to look at it — used for both the player (toggled
 * by PhoneSystem) and idle NPCs' occasional "checking their phone" beat. */
/**
 * Curls a hand's fingers and thumb inward, from fully open/relaxed
 * (curl=0) to a full wraparound grip (curl=1). Used any time a
 * character is holding something — a weapon grip, a phone, a steering
 * wheel or motorbike handlebar — so the hand actually reads as "holding
 * that object" instead of always showing the same flat relaxed hand no
 * matter what's parented to its grip anchor.
 *
 * @param {Object} bones rig bones (must include `fingers${label}` /
 *   `thumb${label}` produced by buildCharacter)
 * @param {'Left'|'Right'} label which hand
 * @param {number} [curl] 0 (open) .. 1 (full grip)
 */
export function applyGripPose(bones, label, curl = 1) {
  const c = Math.max(0, Math.min(1, curl));
  const fingers = bones[`fingers${label}`];
  const thumb = bones[`thumb${label}`];
  if (fingers) {
    fingers.forEach(({ base, tip }) => {
      base.rotation.x = 0.42 + c * 0.85;
      tip.rotation.x = 0.35 + c * 1.05;
    });
  }
  if (thumb) {
    thumb.base.rotation.x = 0.22 + c * 0.5;
    thumb.base.rotation.z = -0.85 - c * 0.1;
    thumb.tip.rotation.x = 0.2 + c * 0.55;
  }
}

/** Relaxes a hand back to its neutral resting curl (the pose it's built
 * with) — call when a character empties their hands (unequips a weapon,
 * lets go of the wheel, etc). */
export function clearGripPose(bones, label) {
  applyGripPose(bones, label, 0);
}

export function applyPhonePose(bones) {
  bones.upperArmRight.rotation.x = -1.7;
  bones.forearmRight.rotation.x = 1.3;
  bones.upperArmRight.rotation.z = 0.15;
  bones.head.rotation.x = 0.25;
  if (bones.phoneRight) bones.phoneRight.visible = true;
  // Fingers wrap around the phone rather than floating open beside it.
  applyGripPose(bones, 'Right', 0.65);
}

export function clearPhonePose(bones) {
  if (bones.phoneRight) bones.phoneRight.visible = false;
  applyGripPose(bones, 'Right', 0);
}
