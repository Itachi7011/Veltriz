import * as THREE from 'three';

/**
 * Procedural vehicle models. Mirrors the LAND entries of the existing
 * `game-world-service/src/data/vehicleTypes.js` catalog (same keys/names/
 * speedMultiplier/price) so the world's parked traffic and the Marina's
 * purchase catalog are the same vehicles, not two disconnected lists.
 *
 * Water vehicles from that catalog (jet ski, yacht, freighter, etc.) are
 * NOT drivable here — a boat needs buoyancy/water-surface physics, which
 * is a different simulation than "drive around on the road network" and
 * is out of scope for this pass. Worth calling out explicitly rather than
 * silently only doing half the catalog.
 */

export const VEHICLE_CATALOG = [
  { key: 'harbor_bicycle', name: 'Harbor Bicycle', kind: 'bike', frame: 'bicycle', speedMultiplier: 1.15, price: 220 },
  { key: 'cargo_scooter', name: 'Cargo Scooter', kind: 'bike', frame: 'stepthrough', speedMultiplier: 1.3, price: 480 },
  { key: 'dockside_moped', name: 'Dockside Moped', kind: 'bike', frame: 'stepthrough', speedMultiplier: 1.4, price: 750 },
  { key: 'customs_motorbike', name: 'Customs Motorbike', kind: 'motorbike', frame: 'motorbike', speedMultiplier: 1.6, price: 1400 },
  { key: 'flatbed_pickup', name: 'Flatbed Pickup', kind: 'truck', speedMultiplier: 1.55, price: 2600 },
  { key: 'port_sedan', name: 'Port Sedan', kind: 'car', speedMultiplier: 1.7, price: 4200 },
  { key: 'armored_cash_van', name: 'Armored Cash Van', kind: 'van', speedMultiplier: 1.5, price: 6800 },
  { key: 'harbor_master_suv', name: "Harbor Master's SUV", kind: 'suv', speedMultiplier: 1.85, price: 9200 },
];

const BODY_COLORS = ['#c62828', '#1565c0', '#2e7d32', '#f9a825', '#616161', '#4a148c', '#eceff1', '#212121', '#00838f'];
// Two-tone accent used for the roof/mirrors/stripe on each vehicle — a
// contrasting shade of the same body color rather than a second random
// color, so it always reads as "one vehicle's paint job" instead of
// clashing.
function accentOf(color) {
  return shade(color, 0.35);
}
function shade(hex, amt) {
  const c = new THREE.Color(hex);
  if (amt >= 0) c.lerp(new THREE.Color('#ffffff'), amt);
  else c.lerp(new THREE.Color('#000000'), -amt);
  return `#${c.getHexString()}`;
}

function wheel(radius, width) {
  const mat = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.7 });
  const geo = new THREE.CylinderGeometry(radius, radius, width, 14);
  // Every chassis in this file is built with LENGTH along local X and
  // WIDTH along local Z (see e.g. buildCarLike's `new THREE.BoxGeometry(
  // dims.len, dims.h, dims.w)` — len→X, w→Z). A wheel's axle has to run
  // along that same width axis (Z) — sideways through the car, the way a
  // real axle connects the left and right wheels — so the tire's flat
  // circular face ends up in the X-Y plane, visible from the side.
  // CylinderGeometry's axis defaults to Y, so it needs a 90° rotation
  // around X (Y→Z) to land on that axle axis — NOT around Z (which
  // would send it to X, the LENGTH axis instead, laying the wheel down
  // face-first toward the front/back of the vehicle: nearly invisible
  // edge-on from the side, and rolling around the wrong axis entirely).
  geo.rotateX(Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  const hubGeo = new THREE.CylinderGeometry(radius * 0.45, radius * 0.45, width * 1.02, 8);
  hubGeo.rotateX(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, new THREE.MeshStandardMaterial({ color: '#9aa0ab', roughness: 0.4, metalness: 0.5 }));
  // A few spokes so the wheel doesn't read as a flat gray disc — long
  // (radial) dimension along Y so they start out pointing "up" from the
  // hub, thin along X, and exactly as thick as the hub along Z (the
  // axle axis) — then rotating each one around Z sweeps it to its own
  // angle around the wheel face.
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.14, radius * 0.9, width * 1.04), new THREE.MeshStandardMaterial({ color: '#5b6270', roughness: 0.5, metalness: 0.5 }));
    spoke.rotation.z = (i / 5) * Math.PI * 2;
    hub.add(spoke);
  }
  mesh.add(hub);
  return mesh;
}

function glassMat() {
  return new THREE.MeshStandardMaterial({ color: '#bfe9ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.32, side: THREE.DoubleSide });
}

function lightMat(color) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.4 });
}

/**
 * 4-wheeled car/truck/van/suv chassis — proportions vary per `kind`.
 *
 * Sized close to real-world car dimensions (a sedan is roughly 4.5m long
 * / 1.8m wide / 1.45m tall at the roof) rather than the previous ~2m toy-
 * scale — the whole point being that PLAYER_HEIGHT (1.75) actually fits
 * inside the cabin with headroom, instead of poking out through the roof.
 *
 * The cabin itself is a real "greenhouse" — a roof panel, a lower sill,
 * and pillars at the corners — with genuine transparent glass panes
 * filling the front/rear/left/right gaps, instead of a solid opaque box
 * with a same-sized translucent box awkwardly co-located inside it (which
 * is why the driver used to be invisible/hidden while "inside" a car).
 */
function buildCarLike(kind, color) {
  const g = new THREE.Group();
  const accent = accentOf(color);
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.45 });
  const accentMat = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.35, metalness: 0.45 });
  const trimMat = new THREE.MeshStandardMaterial({ color: '#161a20', roughness: 0.6, metalness: 0.3 });

  const dims = {
    car: { len: 4.4, w: 1.82, h: 0.62, cabinLen: 2.15, cabinH: 1.05, cabinOffset: -0.15, wheelR: 0.34, trunk: true },
    suv: { len: 4.75, w: 1.95, h: 0.85, cabinLen: 2.7, cabinH: 1.15, cabinOffset: -0.05, wheelR: 0.4, trunk: true },
    truck: { len: 5.3, w: 1.9, h: 0.62, cabinLen: 1.75, cabinH: 1.08, cabinOffset: -0.85, wheelR: 0.38, trunk: false },
    van: { len: 5.0, w: 1.98, h: 1.15, cabinLen: 3.9, cabinH: 1.4, cabinOffset: 0.2, wheelR: 0.36, trunk: true },
  }[kind];

  const chassisY = dims.wheelR + dims.h / 2;
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(dims.len, dims.h, dims.w), bodyMat);
  chassis.position.y = chassisY;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  g.add(chassis);

  // A lower rocker-panel band + a contrasting roof, so the paint job
  // reads as an actual two-tone design instead of one flat color.
  const rocker = new THREE.Mesh(new THREE.BoxGeometry(dims.len * 0.98, dims.h * 0.22, dims.w * 1.01), trimMat);
  rocker.position.set(0, chassisY - dims.h * 0.42, 0);
  g.add(rocker);

  const cabinCenterX = kind === 'truck' ? -dims.len * 0.22 : dims.len * dims.cabinOffset * 0.1;
  const cabinFloorY = chassisY + dims.h / 2;
  const cabinRoofY = cabinFloorY + dims.cabinH;
  const cabinHalfLen = dims.cabinLen / 2;
  const cabinHalfW = (dims.w * 0.94) / 2;
  const pillarT = 0.05;

  // Roof panel
  const roof = new THREE.Mesh(new THREE.BoxGeometry(dims.cabinLen, 0.06, dims.w * 0.96), accentMat);
  roof.position.set(cabinCenterX, cabinRoofY + 0.03, 0);
  roof.castShadow = true;
  g.add(roof);

  // Sill (the solid lower door band the glass sits on top of)
  const sill = new THREE.Mesh(new THREE.BoxGeometry(dims.cabinLen, 0.14, dims.w * 0.98), bodyMat);
  sill.position.set(cabinCenterX, cabinFloorY + 0.07, 0);
  g.add(sill);

  // 4 corner pillars connecting sill to roof
  [-1, 1].forEach((lenSide) => {
    [-1, 1].forEach((wSide) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(pillarT, dims.cabinH - 0.14, pillarT), trimMat);
      pillar.position.set(cabinCenterX + lenSide * (cabinHalfLen - pillarT), cabinFloorY + 0.07 + (dims.cabinH - 0.14) / 2, wSide * (cabinHalfW - pillarT / 2));
      g.add(pillar);
    });
  });
  // A B-pillar (mid pillar) on cars/suv/van for a realistic 2-window-per-
  // side look instead of one huge unbroken pane.
  if (kind !== 'truck') {
    [-1, 1].forEach((wSide) => {
      const bPillar = new THREE.Mesh(new THREE.BoxGeometry(pillarT * 0.8, dims.cabinH - 0.14, pillarT * 0.8), trimMat);
      bPillar.position.set(cabinCenterX, cabinFloorY + 0.07 + (dims.cabinH - 0.14) / 2, wSide * (cabinHalfW - pillarT / 2));
      g.add(bPillar);
    });
  }

  // Real glass: front windshield, rear window, and left/right side
  // windows as separate transparent panes filling the gaps between the
  // pillars/sill/roof — this is what actually lets you see the driver.
  const glassInsetY = cabinFloorY + 0.16 + (dims.cabinH - 0.3) / 2;
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.03, dims.cabinH - 0.3, dims.w * 0.9), glassMat());
  windshield.position.set(cabinCenterX + cabinHalfLen - 0.02, glassInsetY, 0);
  g.add(windshield);
  const rearWindow = windshield.clone();
  rearWindow.position.x = cabinCenterX - cabinHalfLen + 0.02;
  g.add(rearWindow);
  [-1, 1].forEach((wSide) => {
    const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(dims.cabinLen - pillarT * 2.4, dims.cabinH - 0.3, 0.03), glassMat());
    sideGlass.position.set(cabinCenterX, glassInsetY, wSide * (cabinHalfW - 0.015));
    g.add(sideGlass);
  });

  // Side mirrors — small but a big part of "this is a real car" silhouette.
  [-1, 1].forEach((wSide) => {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.05), trimMat);
    mirror.position.set(cabinCenterX + cabinHalfLen - 0.3, cabinFloorY + dims.cabinH * 0.75, wSide * (dims.w / 2 + 0.06));
    g.add(mirror);
  });

  if (kind === 'truck') {
    const bedWalls = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 });
    const bed = new THREE.Mesh(new THREE.BoxGeometry(dims.len * 0.48, 0.32, dims.w), bedWalls);
    bed.position.set(dims.len * 0.24, chassisY + dims.h / 2 + 0.16, 0);
    bed.castShadow = true;
    g.add(bed);
    // Bed floor slats (the corrugated-look pickup bed floor).
    for (let i = 0; i < 5; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, dims.w * 0.94), trimMat);
      slat.position.set(dims.len * 0.05 + i * (dims.len * 0.4) / 5, chassisY + dims.h / 2 + 0.33, 0);
      g.add(slat);
    }
  }

  // Trunk — a separate hinged panel at the rear on cars/SUVs/vans, opened
  // by GameEngine like a door/gate (see WeaponSystem/BuildingBuilder's
  // hinge pattern). Sedans/SUVs: a rear trunk lid. Vans: rear doors.
  let trunkHinge = null;
  if (dims.trunk) {
    trunkHinge = new THREE.Group();
    trunkHinge.position.set(-dims.len / 2 + 0.02, chassisY + dims.h * 0.35, 0);
    trunkHinge.userData.isTrunk = true;
    g.add(trunkHinge);
    const trunkLid = new THREE.Mesh(new THREE.BoxGeometry(0.05, dims.h * 0.65, dims.w * 0.92), bodyMat);
    trunkLid.position.set(0, dims.h * 0.02, 0);
    trunkLid.castShadow = true;
    trunkHinge.add(trunkLid);
  }

  const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 0.2), lightMat('#fff6d0'));
  hl1.position.set(dims.len / 2 - 0.02, chassisY, dims.w * 0.32);
  g.add(hl1);
  const hl2 = hl1.clone();
  hl2.position.z = -dims.w * 0.32;
  g.add(hl2);
  const tl1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 0.17), lightMat('#dc2626'));
  tl1.position.set(-dims.len / 2 + 0.02, chassisY, dims.w * 0.32);
  g.add(tl1);
  const tl2 = tl1.clone();
  tl2.position.z = -dims.w * 0.32;
  g.add(tl2);

  // A door-seam line on each flank — purely cosmetic, but it's the
  // difference between "one smooth block" and "a car with actual doors".
  [-1, 1].forEach((wSide) => {
    [0.18, -0.02].forEach((seamX) => {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.015, dims.h * 0.7, 0.015), trimMat);
      seam.position.set(dims.len * seamX, chassisY, wSide * (dims.w / 2 + 0.006));
      g.add(seam);
    });
  });

  // A racing stripe on roughly half of all vehicles (per-instance, not
  // per-kind) — two parked "Port Sedans" next to each other shouldn't
  // look like the exact same car just because they share a body shape.
  if (Math.random() < 0.5) {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(dims.len * 0.97, 0.012, dims.w * 0.16), accentMat);
    stripe.position.set(0, chassisY + dims.h / 2 + 0.007, 0);
    g.add(stripe);
  }

  const wheels = { frontLeft: null, frontRight: null, rearLeft: null, rearRight: null };
  const wheelW = dims.w * 0.16;
  const axleX = dims.len * 0.36;
  const axleZ = dims.w * 0.52;
  [
    ['frontLeft', axleX, axleZ],
    ['frontRight', axleX, -axleZ],
    ['rearLeft', -axleX, axleZ],
    ['rearRight', -axleX, -axleZ],
  ].forEach(([name, x, z]) => {
    const w = wheel(dims.wheelR, wheelW);
    const pivot = new THREE.Group();
    pivot.position.set(x, dims.wheelR, z);
    w.position.set(0, 0, 0);
    pivot.add(w);
    g.add(pivot);
    wheels[name] = { pivot, mesh: w };
  });

  return {
    group: g,
    wheels,
    kind,
    length: dims.len,
    width: dims.w,
    height: dims.h + dims.wheelR * 2,
    // Driver hip position: on the sill floor, centered in the cabin
    // (slightly toward the front for trucks/vans whose cabin isn't
    // centered on the chassis), with a small margin above the floor.
    seatY: cabinFloorY + 0.08,
    seatX: cabinCenterX,
    trunkHinge,
  };
}

/** 2-wheeled bike/scooter/motorbike frame — a distinct build per `frame`
 * style so a bicycle, a scooter, and a motorbike don't all look like the
 * same sparse skeleton with different wheel sizes. */
function buildBikeLike(kind, frame, color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.4 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.8 });
  const metalPipe = new THREE.MeshStandardMaterial({ color: '#3a3f47', roughness: 0.4, metalness: 0.6 });

  const isMotorbike = frame === 'motorbike';
  // Modest ~20% size-up to match the now much-larger cars — real bicycle/
  // scooter/motorbike wheel radii and lengths were already close to
  // realistic, so this is a proportion nudge, not a full redesign like
  // the car-like chassis above needed.
  const BIKE_SCALE = 1.2;
  const wheelR = (isMotorbike ? 0.32 : frame === 'stepthrough' ? 0.26 : 0.33) * BIKE_SCALE;
  const len = (isMotorbike ? 1.85 : frame === 'stepthrough' ? 1.55 : 1.7) * BIKE_SCALE;
  const seatH = wheelR + (isMotorbike ? 0.46 : 0.5) * BIKE_SCALE;

  const tube = (fromX, fromY, toX, toY, radius = 0.018) => {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.hypot(dx, dy);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), metalPipe);
    mesh.position.set((fromX + toX) / 2, (fromY + toY) / 2, 0);
    // Rotate the cylinder (default axis Y) to lie along the fromXY->toXY
    // direction, within the XY (side-view) plane.
    mesh.rotation.z = Math.PI / 2 - Math.atan2(dy, dx);
    mesh.castShadow = true;
    return mesh;
  };

  const frontAxleX = len * 0.44;
  const rearAxleX = -len * 0.44;
  const frontAxleY = wheelR;
  const rearAxleY = wheelR;
  const headTubeTopY = wheelR + (isMotorbike ? 0.62 : 0.72);
  const seatPostX = frame === 'bicycle' ? -len * 0.06 : -len * 0.18;

  if (frame === 'bicycle') {
    // Classic diamond frame: connected tubes, not floating boxes.
    g.add(tube(rearAxleX, rearAxleY, seatPostX, seatH + 0.06, 0.02));
    g.add(tube(seatPostX, seatH + 0.06, frontAxleX * 0.35, headTubeTopY, 0.02));
    g.add(tube(frontAxleX * 0.35, headTubeTopY, frontAxleX, frontAxleY, 0.022));
    g.add(tube(rearAxleX, rearAxleY, frontAxleX * 0.35, headTubeTopY, 0.02));
    g.add(tube(seatPostX, seatH + 0.06, rearAxleX + 0.15, rearAxleY + 0.02, 0.016));

    // Pedals + crank
    const crank = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 12), darkMat);
    crank.rotation.x = Math.PI / 2;
    crank.position.set(-len * 0.02, wheelR * 0.55, 0);
    g.add(crank);
    [0.11, -0.11].forEach((off) => {
      const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.015, 0.09), darkMat);
      pedal.position.set(-len * 0.02, wheelR * 0.55 + off, 0.09);
      g.add(pedal);
    });

    const seat = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 8), darkMat);
    seat.rotation.z = Math.PI / 2;
    seat.position.set(seatPostX - 0.05, seatH + 0.09, 0);
    g.add(seat);

    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 6), metalPipe);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(frontAxleX * 0.35, headTubeTopY + 0.04, 0);
    g.add(bar);
  } else if (frame === 'stepthrough') {
    // Scooter/moped: a solid step-through body panel + floorboard + a
    // rounded front shield, not a bare frame.
    const body = new THREE.Mesh(new THREE.BoxGeometry(len * 0.5, 0.22, 0.22), bodyMat);
    body.position.set(-len * 0.06, wheelR + 0.28, 0);
    body.castShadow = true;
    g.add(body);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(len * 0.32, 0.03, 0.26), darkMat);
    floor.position.set(len * 0.02, wheelR + 0.12, 0);
    g.add(floor);
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.34, 0.3), bodyMat);
    shield.position.set(frontAxleX * 0.55, headTubeTopY - 0.05, 0);
    shield.castShadow = true;
    g.add(shield);
    const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshStandardMaterial({ color: '#fff6d0', emissive: '#fff6d0', emissiveIntensity: 0.7 }));
    headlight.position.set(frontAxleX * 0.6, headTubeTopY + 0.05, 0);
    g.add(headlight);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.22), darkMat);
    seat.position.set(seatPostX + 0.1, seatH, 0);
    g.add(seat);
    g.add(tube(frontAxleX, frontAxleY, frontAxleX * 0.55, headTubeTopY, 0.03));
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 6), metalPipe);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(frontAxleX * 0.55, headTubeTopY + 0.16, 0);
    g.add(bar);
  } else {
    // Motorbike: tank + engine block + seat + exhaust, connected by a
    // visible backbone frame instead of floating in space.
    g.add(tube(rearAxleX, rearAxleY + 0.1, -len * 0.05, seatH + 0.02, 0.03));
    g.add(tube(-len * 0.05, seatH + 0.02, frontAxleX * 0.4, headTubeTopY, 0.028));
    g.add(tube(frontAxleX * 0.4, headTubeTopY, frontAxleX, frontAxleY, 0.03));

    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.28), bodyMat);
    tank.position.set(len * 0.02, seatH + 0.08, 0);
    tank.castShadow = true;
    g.add(tank);
    const engine = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.24), new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.4, metalness: 0.6 }));
    engine.position.set(-len * 0.02, wheelR + 0.2, 0);
    engine.castShadow = true;
    g.add(engine);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.07, 0.24), darkMat);
    seat.position.set(seatPostX - 0.05, seatH + 0.14, 0);
    g.add(seat);
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.5, 10), new THREE.MeshStandardMaterial({ color: '#c7ccd6', metalness: 0.8, roughness: 0.3 }));
    exhaust.rotation.z = Math.PI / 2;
    exhaust.position.set(-len * 0.18, wheelR + 0.06, wheelR * 0.5);
    g.add(exhaust);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.4, 6), metalPipe);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(frontAxleX * 0.42, headTubeTopY + 0.14, 0);
    g.add(bar);
    const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff6d0', emissive: '#fff6d0', emissiveIntensity: 0.7 }));
    headlight.position.set(frontAxleX, headTubeTopY + 0.02, 0);
    g.add(headlight);
  }

  // Fenders over each wheel — a big part of why a bare-wheeled frame
  // reads as "incomplete".
  const fenderMat = new THREE.MeshStandardMaterial({ color: '#20242c', roughness: 0.6 });
  [frontAxleX, rearAxleX].forEach((axleX) => {
    const fender = new THREE.Mesh(
      new THREE.CylinderGeometry(wheelR * 1.12, wheelR * 1.12, 0.05, 12, 1, false, Math.PI * 0.15, Math.PI * 0.7),
      fenderMat
    );
    fender.rotation.x = Math.PI / 2;
    fender.position.set(axleX, wheelR, 0);
    g.add(fender);
  });

  const wheels = {};
  const wFront = wheel(wheelR, 0.06);
  const frontPivot = new THREE.Group();
  frontPivot.position.set(frontAxleX, wheelR, 0);
  frontPivot.add(wFront);
  g.add(frontPivot);
  wheels.frontLeft = { pivot: frontPivot, mesh: wFront };
  wheels.frontRight = wheels.frontLeft;

  const wRear = wheel(wheelR, 0.06);
  const rearPivot = new THREE.Group();
  rearPivot.position.set(rearAxleX, wheelR, 0);
  rearPivot.add(wRear);
  g.add(rearPivot);
  wheels.rearLeft = { pivot: rearPivot, mesh: wRear };
  wheels.rearRight = wheels.rearLeft;

  return { group: g, wheels, kind, length: len, width: 0.5, height: seatH + 0.2, seatY: seatH, seatX: seatPostX };
}

export function buildVehicle(vehicleKey) {
  const def = VEHICLE_CATALOG.find((v) => v.key === vehicleKey) || VEHICLE_CATALOG[5];
  const color = BODY_COLORS[Math.floor(Math.random() * BODY_COLORS.length)];
  const built = ['bike', 'motorbike'].includes(def.kind) ? buildBikeLike(def.kind, def.frame, color) : buildCarLike(def.kind, color);
  built.group.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  // The chassis above is modeled with its length along local +X ("front"
  // = +X). The rest of the game's movement convention treats +Z as
  // forward (see PhysicsController/CameraRig: dx=sin(heading),
  // dz=cos(heading)) — so without this, every vehicle would visually
  // drive sideways relative to the direction it's actually traveling.
  // Wrapping in an outer group with a fixed +90° inner rotation converts
  // "front = local +X" into "front = outer's local +Z" once, so
  // VehicleSystem can just set the OUTER group's rotation.y = heading
  // each frame like everything else in the game already does.
  const outer = new THREE.Group();
  built.group.rotation.y = -Math.PI / 2;
  outer.add(built.group);
  outer.userData.vehicleKey = vehicleKey;

  return {
    group: outer,
    innerGroup: built.group,
    wheels: built.wheels,
    kind: built.kind,
    height: built.height,
    // seatY is already an absolute ground-relative height computed from
    // the actual cabin/seat geometry above (cabin floor + margin for
    // cars, top-of-seat for bikes) — not a crude fraction of overall
    // vehicle height, which is what used to leave the driver sitting
    // essentially on the roof.
    seatHeight: built.seatY,
    // seatX is an offset along the model's local "front" axis (inner
    // +X, before the -90° rotation below) — once rotated, that axis
    // becomes the OUTER group's local +Z, i.e. the same forward axis
    // `heading` already points along. Callers combine this with heading
    // via (sin(heading), cos(heading)) to place the driver correctly
    // fore/aft within the cabin, not just at the vehicle's origin.
    seatForwardOffset: built.seatX || 0,
    length: built.length || 2,
    width: built.width || 1,
    trunkHinge: built.trunkHinge || null,
    def,
  };
}
