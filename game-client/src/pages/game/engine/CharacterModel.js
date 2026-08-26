import * as THREE from 'three';

/**
 * Procedural stylized humanoid builder.
 *
 * This replaces the old "blurry overlapping circles" avatar with a real,
 * proportioned, jointed 3D character: a head with a face (eyes, brows,
 * nose, mouth, ears), a neck, a chest/waist/hip torso that differs by
 * gender, two arms with shoulders/elbows/wrists AND actual hands (palm +
 * five fingers, not a mitt), two legs with knees and shoes, and a hair
 * system with several selectable styles.
 *
 * It's built from primitive geometry (no external character asset files
 * to download), but every segment is a real jointed Object3D — so it can
 * be walked, run, and looked-around with genuine procedural animation
 * instead of a static sprite.
 *
 * Style target: clean stylized/low-poly (think modern low-poly indie
 * games), not photoreal — that's a deliberate, honest scope choice: a
 * believable jointed body with correct proportions reads as a "real
 * character" far better than a flat sprite, without requiring hand-sculpted
 * or AI-generated face/skin textures.
 */

const clamp01 = (v) => Math.max(0, Math.min(1, v));

function shade(hex, amt) {
  // amt in [-1, 1]; negative darkens, positive lightens
  const c = new THREE.Color(hex);
  if (amt >= 0) {
    c.lerp(new THREE.Color('#ffffff'), amt);
  } else {
    c.lerp(new THREE.Color('#000000'), -amt);
  }
  return c;
}

// A tapered cylinder "bone" whose pivot (the Group's origin) sits at the
// TOP of the segment (the joint), extending downward — so rotating the
// returned group rotates it exactly like a real limb joint would.
function limbSegment({ topRadius, bottomRadius, length, material, radialSegments = 10 }) {
  const geo = new THREE.CylinderGeometry(topRadius, bottomRadius, length, radialSegments, 1, false);
  geo.translate(0, -length / 2, 0);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const pivot = new THREE.Group();
  pivot.add(mesh);
  pivot.userData.length = length;
  return { pivot, mesh };
}

function buildHand({ skinMat, scale, gender }) {
  const hand = new THREE.Group();

  const palmGeo = new THREE.BoxGeometry(0.09 * scale, 0.11 * scale, 0.035 * scale);
  roundBoxUVs(palmGeo);
  const palm = new THREE.Mesh(palmGeo, skinMat);
  palm.position.y = -0.06 * scale;
  palm.castShadow = true;
  hand.add(palm);

  // Four fingers, slightly curled (a relaxed hand reads far better than a
  // flat block), fanned out a touch so they're individually visible.
  const fingerLength = 0.05 * scale;
  const fingerRadius = 0.011 * scale;
  const fingerOffsets = [-0.032, -0.011, 0.011, 0.032].map((v) => v * scale);
  fingerOffsets.forEach((offsetX, i) => {
    const { pivot } = limbSegment({
      topRadius: fingerRadius,
      bottomRadius: fingerRadius * 0.75,
      length: fingerLength,
      material: skinMat,
      radialSegments: 6,
    });
    pivot.position.set(offsetX, -0.115 * scale, 0);
    // relaxed curl
    pivot.rotation.x = 0.55 + (i === 0 || i === 3 ? 0.1 : 0);
    hand.add(pivot);
  });

  // Thumb, angled out to the side.
  const thumb = limbSegment({
    topRadius: fingerRadius * 1.05,
    bottomRadius: fingerRadius * 0.8,
    length: fingerLength * 0.8,
    material: skinMat,
    radialSegments: 6,
  });
  thumb.pivot.position.set(0.05 * scale * (gender === 'female' ? 0.95 : 1), -0.05 * scale, 0.02 * scale);
  thumb.pivot.rotation.z = -0.9;
  thumb.pivot.rotation.x = 0.35;
  hand.add(thumb.pivot);

  return hand;
}

function roundBoxUVs() {
  /* placeholder hook kept for readability/extension; BoxGeometry UVs are fine as-is */
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

  // Eyes: white + iris + pupil, recessed slightly into a shallow brow.
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

    // Brow
    const brow = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.34, headR * 0.05, headR * 0.06), darkMat);
    brow.position.set(eyeX, eyeY + headR * 0.22, eyeZ - headR * 0.02);
    brow.rotation.z = side * -0.12;
    headGroup.add(brow);

    // Ear
    const ear = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.16, 8, 8), skinMat);
    ear.scale.set(0.5, 1, 0.8);
    ear.position.set(side * headR * 0.98, -headR * 0.02, 0);
    headGroup.add(ear);
  });

  // Nose: small wedge.
  const noseGeo = new THREE.ConeGeometry(headR * 0.11, headR * 0.32, 5);
  const nose = new THREE.Mesh(noseGeo, skinMat);
  nose.rotation.x = Math.PI / 2.15;
  nose.position.set(0, -headR * 0.05, headR * 0.95);
  headGroup.add(nose);

  // Mouth
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.32, headR * 0.045, headR * 0.05), lipMat);
  mouth.position.set(0, -headR * 0.42, headR * 0.92);
  headGroup.add(mouth);

  // Jaw/chin taper hint (subtle box under mouth blended into skin)
  const chin = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.22, 8, 6), skinMat);
  chin.position.set(0, -headR * 0.62, headR * 0.55);
  chin.scale.set(1, 0.7, 0.85);
  headGroup.add(chin);
}

function buildHair(headGroup, { hairMat, hairStyle, scale, gender }) {
  const headR = 0.11 * scale;
  const style = hairStyle || (gender === 'female' ? 'long' : 'short');

  if (style === 'bald') return;

  if (style === 'buzz' || style === 'short' || style === 'ponytail' || style === 'long') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.04, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
    cap.position.y = headR * 0.12;
    cap.castShadow = true;
    headGroup.add(cap);
  }

  if (style === 'short' || style === 'buzz') {
    // fringe strip over the forehead
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.5, headR * 0.22, headR * 0.5), hairMat);
    fringe.position.set(0, headR * 0.42, headR * 0.75);
    headGroup.add(fringe);
  }

  if (style === 'ponytail') {
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(headR * 0.18, headR * 0.06, headR * 1.7, 8), hairMat);
    tail.position.set(0, -headR * 0.5, -headR * 0.95);
    tail.rotation.x = 0.55;
    tail.castShadow = true;
    headGroup.add(tail);
    const tie = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.15, headR * 0.035, 6, 10), hairMat);
    tie.position.set(0, headR * 0.05, -headR * 0.98);
    tie.rotation.x = Math.PI / 2;
    headGroup.add(tie);
  }

  if (style === 'long') {
    const drape = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.95, headR * 2.1, 10, 1, true), hairMat);
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
  } = appearance;

  const isFemale = gender === 'female';
  const scale = isFemale ? 0.95 : 1.0;
  const shoulderWidth = (isFemale ? 0.30 : 0.38) * scale;
  const hipWidth = (isFemale ? 0.27 : 0.24) * scale;

  const skinMat = new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.75, metalness: 0.02 });
  const skinMatDark = new THREE.MeshStandardMaterial({ color: shade(skinTone, -0.06), roughness: 0.75 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: outfitColor, roughness: 0.85 });
  const shirtMatDark = new THREE.MeshStandardMaterial({ color: shade(outfitColor, -0.18), roughness: 0.85 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.8 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: shoeColor, roughness: 0.55, metalness: 0.05 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hairColor, roughness: 0.6 });

  const root = new THREE.Group();
  root.name = 'characterRoot';

  // ---- Legs ----
  const legLength = 0.46 * scale;
  const shinLength = 0.42 * scale;
  const legTopY = legLength + shinLength; // hip joint height above ground

  const hips = new THREE.Group();
  hips.position.y = legTopY;
  root.add(hips);

  // Pelvis block (gives the hourglass/hip read instead of a floating joint)
  const pelvisGeo = new THREE.BoxGeometry(hipWidth * 2.1, 0.16 * scale, 0.14 * scale);
  const pelvis = new THREE.Mesh(pelvisGeo, pantsMat);
  pelvis.position.y = -0.02 * scale;
  pelvis.castShadow = true;
  hips.add(pelvis);

  const legRefs = {};
  [-1, 1].forEach((side) => {
    const label = side === -1 ? 'Left' : 'Right';
    const upperLeg = limbSegment({
      topRadius: 0.075 * scale,
      bottomRadius: 0.06 * scale,
      length: legLength,
      material: pantsMat,
    });
    upperLeg.pivot.position.set(side * hipWidth * 0.55, -0.06 * scale, 0);
    hips.add(upperLeg.pivot);

    const lowerLeg = limbSegment({
      topRadius: 0.058 * scale,
      bottomRadius: 0.042 * scale,
      length: shinLength,
      material: skinMatDark,
    });
    lowerLeg.pivot.position.y = -legLength;
    upperLeg.pivot.add(lowerLeg.pivot);

    // Sock/shoe cuff
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.05 * scale, 0.06 * scale, 8), shoeMat);
    cuff.position.y = -shinLength + 0.03 * scale;
    lowerLeg.pivot.add(cuff);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09 * scale, 0.06 * scale, 0.2 * scale), shoeMat);
    foot.position.set(0, -shinLength - 0.005 * scale, 0.06 * scale);
    foot.castShadow = true;
    lowerLeg.pivot.add(foot);

    legRefs[`upperLeg${label}`] = upperLeg.pivot;
    legRefs[`lowerLeg${label}`] = lowerLeg.pivot;
  });

  // ---- Torso ----
  const waistY = 0.02 * scale;
  const chestHeight = 0.34 * scale;
  const torsoGroup = new THREE.Group();
  torsoGroup.position.y = waistY;
  hips.add(torsoGroup);

  const waistWidth = isFemale ? hipWidth * 1.55 : shoulderWidth * 1.5;
  const waistGeo = new THREE.CylinderGeometry(waistWidth * 0.5, waistWidth * 0.55, 0.16 * scale, 10);
  const waist = new THREE.Mesh(waistGeo, isFemale ? shirtMatDark : pantsMat);
  waist.position.y = 0.08 * scale;
  torsoGroup.add(waist);

  const chestGeo = new THREE.CylinderGeometry(shoulderWidth * 0.95, waistWidth * 0.62, chestHeight, 10);
  const chest = new THREE.Mesh(chestGeo, shirtMat);
  chest.position.y = 0.16 * scale + chestHeight / 2;
  chest.castShadow = true;
  chest.receiveShadow = true;
  torsoGroup.add(chest);

  if (isFemale) {
    // Subtle bust definition — two shallow lobes on the upper chest.
    [-1, 1].forEach((side) => {
      const bust = new THREE.Mesh(new THREE.SphereGeometry(0.075 * scale, 8, 6), shirtMat);
      bust.scale.set(1, 0.8, 0.7);
      bust.position.set(side * shoulderWidth * 0.32, 0.16 * scale + chestHeight * 0.72, shoulderWidth * 0.42);
      torsoGroup.add(bust);
    });
  } else {
    // A slightly broader upper-chest block for a masculine silhouette.
    const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(shoulderWidth * 1.7, chestHeight * 0.55, 0.05 * scale), shirtMatDark);
    chestPlate.position.set(0, 0.16 * scale + chestHeight * 0.62, shoulderWidth * 0.62);
    torsoGroup.add(chestPlate);
  }

  const neckY = 0.16 * scale + chestHeight;
  const neck = new THREE.Group();
  neck.position.y = neckY;
  torsoGroup.add(neck);
  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.06 * scale, 0.1 * scale, 8), skinMat);
  neckMesh.position.y = 0.05 * scale;
  neck.add(neckMesh);

  // ---- Head ----
  const head = new THREE.Group();
  head.position.y = 0.1 * scale;
  neck.add(head);

  const headGeo = new THREE.SphereGeometry(0.11 * scale, 16, 14);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.scale.set(0.92, 1.08, 0.98);
  headMesh.castShadow = true;
  head.add(headMesh);

  buildFace(head, { skinMat, eyeColor, scale, gender });
  buildHair(head, { hairMat, hairStyle, scale, gender });

  // ---- Arms ----
  const upperArmLength = 0.27 * scale;
  const forearmLength = 0.25 * scale;
  const armRefs = {};
  [-1, 1].forEach((side) => {
    const label = side === -1 ? 'Left' : 'Right';
    const shoulder = new THREE.Group();
    shoulder.position.set(side * shoulderWidth, 0.16 * scale + chestHeight * 0.92, 0);
    torsoGroup.add(shoulder);

    const shoulderCap = new THREE.Mesh(new THREE.SphereGeometry(0.075 * scale, 10, 8), shirtMat);
    shoulder.add(shoulderCap);

    const upperArm = limbSegment({
      topRadius: 0.065 * scale,
      bottomRadius: 0.05 * scale,
      length: upperArmLength,
      material: shirtMat,
    });
    shoulder.add(upperArm.pivot);
    // slight relaxed outward angle so arms aren't glued to the torso
    upperArm.pivot.rotation.z = side * -0.12;

    const forearm = limbSegment({
      topRadius: 0.047 * scale,
      bottomRadius: 0.04 * scale,
      length: forearmLength,
      material: skinMat,
    });
    forearm.pivot.position.y = -upperArmLength;
    forearm.pivot.rotation.x = 0.08;
    upperArm.pivot.add(forearm.pivot);

    const hand = buildHand({ skinMat, scale, gender });
    hand.position.y = -forearmLength;
    forearm.pivot.add(hand);

    armRefs[`shoulder${label}`] = shoulder;
    armRefs[`upperArm${label}`] = upperArm.pivot;
    armRefs[`forearm${label}`] = forearm.pivot;
    armRefs[`hand${label}`] = hand;
  });

  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  const totalHeight = legTopY + waistY + 0.16 * scale + chestHeight + 0.1 * scale + 0.22 * scale;

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
  const swing = Math.min(1, speedFactor) ;
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

    bones.hips.position.y += Math.abs(Math.sin(t)) * 0.015;
    bones.hips.rotation.y = Math.sin(t) * 0.06 * swing;
  } else {
    // idle breathing
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
  }

  if (!isGrounded) {
    // tuck slightly for a jump/fall pose
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
