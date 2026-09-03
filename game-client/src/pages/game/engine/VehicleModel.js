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

function wheel(radius, width) {
  const mat = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.7 });
  const geo = new THREE.CylinderGeometry(radius, radius, width, 14);
  // Bake the "lay the cylinder on its side" rotation into the geometry
  // itself (not mesh.rotation) so mesh.rotation.z is left free to use as
  // the pure rolling-spin axis each frame, uncoupled from orientation.
  geo.rotateZ(Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  const hubGeo = new THREE.CylinderGeometry(radius * 0.45, radius * 0.45, width * 1.02, 8);
  hubGeo.rotateZ(Math.PI / 2);
  const hub = new THREE.Mesh(hubGeo, new THREE.MeshStandardMaterial({ color: '#9aa0ab', roughness: 0.4, metalness: 0.5 }));
  mesh.add(hub);
  return mesh;
}

function glassMat() {
  return new THREE.MeshStandardMaterial({ color: '#8fd3ff', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.55 });
}

function lightMat(color) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.4 });
}

/** 4-wheeled car/truck/van/suv chassis — proportions vary per `kind`. */
function buildCarLike(kind, color) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.35 });

  const dims = {
    car: { len: 2.1, w: 0.95, h: 0.55, cabinLen: 1.1, cabinH: 0.42, wheelR: 0.26 },
    suv: { len: 2.3, w: 1.05, h: 0.72, cabinLen: 1.5, cabinH: 0.5, wheelR: 0.32 },
    truck: { len: 2.5, w: 1.0, h: 0.55, cabinLen: 0.85, cabinH: 0.45, wheelR: 0.3 },
    van: { len: 2.4, w: 1.05, h: 0.85, cabinLen: 2.0, cabinH: 0.7, wheelR: 0.3 },
  }[kind];

  const chassisY = dims.wheelR + dims.h / 2;
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(dims.len, dims.h, dims.w), bodyMat);
  chassis.position.y = chassisY;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  g.add(chassis);

  if (kind !== 'truck') {
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(dims.cabinLen, dims.cabinH, dims.w * 0.94), bodyMat);
    cabin.position.set(kind === 'van' ? 0 : -dims.len * 0.08, chassisY + dims.h / 2 + dims.cabinH / 2, 0);
    cabin.castShadow = true;
    g.add(cabin);

    const glass = new THREE.Mesh(new THREE.BoxGeometry(dims.cabinLen * 0.92, dims.cabinH * 0.6, dims.w * 0.98), glassMat());
    glass.position.copy(cabin.position);
    glass.position.y += dims.cabinH * 0.12;
    g.add(glass);
  } else {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(dims.cabinLen, dims.cabinH, dims.w * 0.94), bodyMat);
    cab.position.set(-dims.len * 0.22, chassisY + dims.h / 2 + dims.cabinH / 2, 0);
    g.add(cab);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(dims.cabinLen * 0.85, dims.cabinH * 0.6, dims.w * 0.98), glassMat());
    glass.position.copy(cab.position);
    g.add(glass);
    const bedWalls = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 });
    const bed = new THREE.Mesh(new THREE.BoxGeometry(dims.len * 0.48, 0.18, dims.w), bedWalls);
    bed.position.set(dims.len * 0.24, chassisY + dims.h / 2 + 0.09, 0);
    g.add(bed);
  }

  const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.16), lightMat('#fff6d0'));
  hl1.position.set(dims.len / 2 - 0.02, chassisY, dims.w * 0.32);
  g.add(hl1);
  const hl2 = hl1.clone();
  hl2.position.z = -dims.w * 0.32;
  g.add(hl2);
  const tl1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.14), lightMat('#dc2626'));
  tl1.position.set(-dims.len / 2 + 0.02, chassisY, dims.w * 0.32);
  g.add(tl1);
  const tl2 = tl1.clone();
  tl2.position.z = -dims.w * 0.32;
  g.add(tl2);

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

  return { group: g, wheels, kind, height: dims.h + dims.wheelR * 2, seatY: chassisY + dims.h * 0.4, seatX: -dims.len * 0.12 };
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
  const wheelR = isMotorbike ? 0.32 : frame === 'stepthrough' ? 0.26 : 0.33;
  const len = isMotorbike ? 1.85 : frame === 'stepthrough' ? 1.55 : 1.7;
  const seatH = wheelR + (isMotorbike ? 0.46 : 0.5);

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
    fender.rotation.z = Math.PI / 2;
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

  return { group: g, wheels, kind, height: seatH + 0.2, seatY: seatH };
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
    seatHeight: built.height * 0.58,
    def,
  };
}
