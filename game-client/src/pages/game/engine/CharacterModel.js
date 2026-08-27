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

function shade(hex, amt) {
  const c = new THREE.Color(hex);
  if (amt >= 0) c.lerp(new THREE.Color('#ffffff'), amt);
  else c.lerp(new THREE.Color('#000000'), -amt);
  return c;
}

// A capsule "bone" whose pivot (the Group's origin) sits at the TOP of the
// segment (the joint), extending downward by `length` — rotating the
// pivot rotates it exactly like a real limb joint would. Using a capsule
// (rounded ends) instead of a flat-ended cylinder means adjacent segments
// blend together at the joint instead of showing a hard seam.
function limbSegment({ radius, length, material, radialSegments = 8, capSegments = 4 }) {
  const cylLength = Math.max(0.001, length - radius * 2);
  const geo = new THREE.CapsuleGeometry(radius, cylLength, capSegments, radialSegments);
  geo.translate(0, -length / 2, 0);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const pivot = new THREE.Group();
  pivot.add(mesh);
  pivot.userData.length = length;
  return { pivot, mesh };
}

// A single smooth body-of-revolution torso: no seam between hip/waist/
// chest because it's one continuous lathed surface, and the profile
// curve itself carries the gendered silhouette (hourglass vs. straight)
// instead of relying on separately-sized stacked cylinders.
function buildTorsoLathe({ points, material, segments = 16 }) {
  const vec2s = points.map(([y, r]) => new THREE.Vector2(Math.max(0.001, r), y));
  const geo = new THREE.LatheGeometry(vec2s, segments);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function buildHand({ skinMat, scale, gender }) {
  const hand = new THREE.Group();

  const palmGeo = new THREE.BoxGeometry(0.095 * scale, 0.1 * scale, 0.032 * scale, 2, 2, 1);
  const palm = new THREE.Mesh(palmGeo, skinMat);
  palm.position.y = -0.055 * scale;
  palm.castShadow = true;
  hand.add(palm);

  // Four fingers: elongated (length notably bigger than radius, unlike a
  // rounded blob) and spaced so adjacent capsules never intersect —
  // spacing between finger centers is kept comfortably above 2x radius.
  const fingerLength = 0.062 * scale;
  const fingerRadius = 0.0095 * scale;
  const fingerOffsets = [-0.0345, -0.0115, 0.0115, 0.0345].map((v) => v * scale);
  fingerOffsets.forEach((offsetX, i) => {
    const { pivot } = limbSegment({
      radius: fingerRadius * (i === 1 || i === 2 ? 1 : 0.92),
      length: fingerLength * (i === 1 || i === 2 ? 1 : 0.88),
      material: skinMat,
      radialSegments: 6,
      capSegments: 2,
    });
    pivot.position.set(offsetX, -0.1 * scale, 0);
    pivot.rotation.x = 0.5 + (i === 0 || i === 3 ? 0.12 : 0);
    hand.add(pivot);
  });

  // Thumb, angled out to the side.
  const thumb = limbSegment({
    radius: fingerRadius * 1.1,
    length: fingerLength * 0.75,
    material: skinMat,
    radialSegments: 6,
    capSegments: 2,
  });
  thumb.pivot.position.set(0.052 * scale * (gender === 'female' ? 0.95 : 1), -0.04 * scale, 0.018 * scale);
  thumb.pivot.rotation.z = -0.85;
  thumb.pivot.rotation.x = 0.3;
  hand.add(thumb.pivot);

  // A grip anchor at the front of the palm, oriented so anything parented
  // to it (a tool/weapon) sits naturally "held" rather than floating
  // beside the hand — WeaponSystem attaches equipped items here.
  const grip = new THREE.Group();
  grip.name = 'grip';
  grip.position.set(0, -0.07 * scale, 0.03 * scale);
  grip.rotation.x = -Math.PI / 2.1;
  hand.add(grip);

  return { hand, grip };
}

function buildFace(headGroup, { skinMat, eyeColor, scale, gender }) {
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.5 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f2ea, roughness: 0.4 });
  const irisMat = new THREE.MeshStandardMaterial({ color: eyeColor, roughness: 0.3 });
  const lipMat = new THREE.MeshStandardMaterial({
    color: gender === 'female' ? 0xb5605f : 0x9a6b5c,
    roughness: 0.5,
  });

  const headR = 0.11 * scale;

  [-1, 1].forEach((side) => {
    const eyeX = side * headR * 0.42;
    const eyeY = headR * 0.06;
    const eyeZ = headR * 0.86;

    const white = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.155, 10, 8), whiteMat);
    white.scale.set(1, 0.72, 0.6);
    white.position.set(eyeX, eyeY, eyeZ);
    headGroup.add(white);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.085, 10, 8), irisMat);
    iris.position.set(eyeX, eyeY, eyeZ + headR * 0.05);
    headGroup.add(iris);

    const pupil = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.04, 8, 6), darkMat);
    pupil.position.set(eyeX, eyeY, eyeZ + headR * 0.09);
    headGroup.add(pupil);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.34, headR * 0.05, headR * 0.06), darkMat);
    brow.position.set(eyeX, eyeY + headR * 0.22, eyeZ - headR * 0.02);
    brow.rotation.z = side * -0.12;
    headGroup.add(brow);

    const ear = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.16, 8, 8), skinMat);
    ear.scale.set(0.5, 1, 0.8);
    ear.position.set(side * headR * 0.98, -headR * 0.02, 0);
    headGroup.add(ear);
  });

  const noseGeo = new THREE.ConeGeometry(headR * 0.11, headR * 0.32, 6);
  const nose = new THREE.Mesh(noseGeo, skinMat);
  nose.rotation.x = Math.PI / 2.15;
  nose.position.set(0, -headR * 0.05, headR * 0.95);
  headGroup.add(nose);

  const mouth = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.32, headR * 0.045, headR * 0.05), lipMat);
  mouth.position.set(0, -headR * 0.42, headR * 0.92);
  headGroup.add(mouth);

  const chin = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.22, 10, 8), skinMat);
  chin.position.set(0, -headR * 0.62, headR * 0.55);
  chin.scale.set(1, 0.7, 0.85);
  headGroup.add(chin);
}

function buildHair(headGroup, { hairMat, hairStyle, scale, gender }) {
  const headR = 0.11 * scale;
  const style = hairStyle || (gender === 'female' ? 'long' : 'short');

  if (style === 'bald') return;

  if (style === 'buzz' || style === 'short' || style === 'ponytail' || style === 'long') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.04, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
    cap.position.y = headR * 0.12;
    cap.castShadow = true;
    headGroup.add(cap);
  }

  if (style === 'short' || style === 'buzz') {
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.5, headR * 0.22, headR * 0.5), hairMat);
    fringe.position.set(0, headR * 0.42, headR * 0.75);
    headGroup.add(fringe);
  }

  if (style === 'ponytail') {
    const { pivot: tail } = limbSegment({ radius: headR * 0.12, length: headR * 1.7, material: hairMat, radialSegments: 8 });
    tail.position.set(0, headR * 0.15, -headR * 0.95);
    tail.rotation.x = 2.1;
    headGroup.add(tail);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.15, headR * 0.035, 6, 10), hairMat);
    tie.position.set(0, headR * 0.05, -headR * 0.98);
    tie.rotation.x = Math.PI / 2;
    headGroup.add(tie);
  }

  if (style === 'long') {
    const drape = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.95, headR * 2.1, 12, 1, true), hairMat);
    drape.position.set(0, -headR * 1.1, -headR * 0.1);
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
  const shoulderWidth = (isFemale ? 0.3 : 0.38) * scale;
  const hipWidth = (isFemale ? 0.27 : 0.24) * scale;

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
  // Small clearance above the feet's true zero point: the shoe/sole
  // meshes extend a few cm below the leg chain's local origin (see the
  // `sole` mesh below), so without this the feet sit slightly under the
  // ground plane and the shoes read as "buried". Raising the whole body
  // (hips and everything above) by this amount, instead of shortening
  // the legs, keeps leg proportions untouched.
  const footClearance = 0.06 * scale;
  hips.position.y = legTopY + footClearance;
  hips.userData.baseY = hips.position.y; // standing height, so the walk-bob offsets from this instead of drifting
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

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09 * scale, 0.06 * scale, 0.2 * scale, 1, 1, 2), shoeMat);
    foot.position.set(0, -shinLength - 0.005 * scale, 0.06 * scale);
    foot.castShadow = true;
    lowerLeg.pivot.add(foot);

    const sole = new THREE.Mesh(
      new THREE.BoxGeometry(0.095 * scale, 0.02 * scale, 0.21 * scale),
      new THREE.MeshStandardMaterial({ color: '#0d0f16', roughness: 0.9 })
    );
    sole.position.set(0, -shinLength - 0.035 * scale, 0.06 * scale);
    lowerLeg.pivot.add(sole);

    legRefs[`upperLeg${label}`] = upperLeg.pivot;
    legRefs[`lowerLeg${label}`] = lowerLeg.pivot;
  });

  // ---- Torso: one continuous lathed silhouette from hip to shoulder ----
  const chestHeight = 0.34 * scale;
  const shoulderY = 0.16 * scale + chestHeight;
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = 0.05 * scale;
  hips.add(torsoGroup);

  // Profile now stops at a modest hip radius right above where the legs
  // attach (hips-local y ≈ -0.03), instead of the old separate oversized
  // pelvis sphere that visually swallowed the top of both legs.
  const profile = isFemale
    ? [
        [-0.06 * scale, hipWidth * 0.88],
        [0.0 * scale, hipWidth * 1.05],
        [0.06 * scale, shoulderWidth * 0.6],
        [0.13 * scale, shoulderWidth * 0.82],
        [shoulderY * 0.82, shoulderWidth * 0.98],
        [shoulderY, shoulderWidth * 0.86],
      ]
    : [
        [-0.06 * scale, hipWidth * 0.78],
        [0.02 * scale, shoulderWidth * 0.72],
        [0.13 * scale, shoulderWidth * 0.86],
        [shoulderY * 0.85, shoulderWidth],
        [shoulderY, shoulderWidth * 0.92],
      ];

  const torso = buildTorsoLathe({ points: profile, material: shirtMat, segments: 18 });
  torsoGroup.add(torso);

  const neck = new THREE.Group();
  neck.position.y = shoulderY;
  torsoGroup.add(neck);
  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.06 * scale, 0.1 * scale, 10), skinMat);
  neckMesh.position.y = 0.05 * scale;
  neck.add(neckMesh);

  const head = new THREE.Group();
  head.position.y = 0.1 * scale;
  neck.add(head);

  const headGeo = new THREE.SphereGeometry(0.11 * scale, 18, 14);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.scale.set(0.92, 1.08, 0.98);
  headMesh.castShadow = true;
  head.add(headMesh);

  buildFace(head, { skinMat, eyeColor, scale, gender });
  buildHair(head, { hairMat, hairStyle, scale, gender });

  const upperArmLength = 0.27 * scale;
  const forearmLength = 0.25 * scale;
  const armRefs = {};
  [-1, 1].forEach((side) => {
    const label = side === -1 ? 'Left' : 'Right';
    const shoulder = new THREE.Group();
    shoulder.position.set(side * shoulderWidth * 0.88, shoulderY * 0.94, 0);
    torsoGroup.add(shoulder);

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

    const cuffMat = new THREE.MeshStandardMaterial({ color: shade(outfitColor, -0.1), roughness: 0.7 });
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.05 * scale, 0.012 * scale, 6, 12), cuffMat);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -upperArmLength * 0.92;
    upperArm.pivot.add(cuff);

    const { hand, grip } = buildHand({ skinMat, scale, gender });
    hand.position.y = -forearmLength;
    forearm.pivot.add(hand);

    armRefs[`shoulder${label}`] = shoulder;
    armRefs[`upperArm${label}`] = upperArm.pivot;
    armRefs[`forearm${label}`] = forearm.pivot;
    armRefs[`hand${label}`] = hand;
    armRefs[`grip${label}`] = grip;
  });

  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  const totalHeight = legTopY + 0.05 * scale + shoulderY + 0.1 * scale + 0.22 * scale;

  return {
    group: root,
    totalHeight,
    scale,
    bones: {
      hips,
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
export function animateCharacter(bones, { time, speedFactor = 0, headPitch = 0, isGrounded = true, jumpT = 0 }) {
  const swing = Math.min(1, speedFactor);
  const freq = 7 + speedFactor * 4;
  const amp = 0.55 * swing;
  const t = time * freq;

  if (swing > 0.01) {
    bones.upperLegLeft.rotation.x = Math.sin(t) * amp;
    bones.upperLegRight.rotation.x = -Math.sin(t) * amp;
    bones.lowerLegLeft.rotation.x = Math.max(0, -Math.sin(t + 0.6) * amp * 1.1);
    bones.lowerLegRight.rotation.x = Math.max(0, Math.sin(t + 0.6) * amp * 1.1);

    bones.upperArmLeft.rotation.x = -Math.sin(t) * amp * 0.8;
    bones.upperArmRight.rotation.x = Math.sin(t) * amp * 0.8;
    bones.forearmLeft.rotation.x = 0.15 + Math.max(0, Math.sin(t) * amp * 0.6);
    bones.forearmRight.rotation.x = 0.15 + Math.max(0, -Math.sin(t) * amp * 0.6);

    const hipBase = bones.hips.userData.baseY ?? bones.hips.position.y;
    bones.hips.position.y = hipBase + Math.abs(Math.sin(t)) * 0.015;
    bones.hips.rotation.y = Math.sin(t) * 0.06 * swing;
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
    // Settle back to standing height when idle, instead of staying wherever the walk-bob last left it.
    const hipBase = bones.hips.userData.baseY ?? bones.hips.position.y;
    bones.hips.position.y = hipBase;
  }

  if (!isGrounded) {
    bones.upperLegLeft.rotation.x = 0.4 + jumpT * 0.2;
    bones.upperLegRight.rotation.x = 0.4 + jumpT * 0.2;
    bones.lowerLegLeft.rotation.x = 0.5;
    bones.lowerLegRight.rotation.x = 0.5;
  }

  bones.head.rotation.x = headPitch * 0.6;
  bones.neck.rotation.x = headPitch * 0.4;
}

export const HAIR_STYLES = ['short', 'buzz', 'long', 'ponytail', 'bald'];
export const SKIN_TONES = ['#f1c39a', '#e0ac69', '#c68863', '#8d5524', '#5a3825'];
export const OUTFIT_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#111827'];
export const HAIR_COLORS = ['#2b2b2b', '#5a3825', '#7a4a1e', '#c9c9c9', '#8b1e1e', '#e8c15a'];