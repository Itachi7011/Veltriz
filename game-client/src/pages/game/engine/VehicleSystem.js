import { buildVehicle, VEHICLE_CATALOG } from './VehicleModel';
import { VehicleController } from './VehicleController';
import { buildCharacter, animateCharacter, SKIN_TONES, HAIR_COLORS, HAIR_STYLES, applyGripPose } from './CharacterModel';

/**
 * Vehicles you can walk up to and drive — plus real NPC-driven traffic
 * that actually goes somewhere under its own vehicle physics, and
 * carjacking (forcing an occupied vehicle to stop and taking it, which
 * ejects the driver and draws police attention — as opposed to just
 * getting into an empty parked car, which is free, exactly like the
 * reference game's distinction).
 *
 * Same streaming philosophy as NpcSystem: only what's near the player
 * actually exists, so an arbitrarily large map stays cheap.
 */

const ACTIVE_TARGET = 40;
const AI_DRIVER_FRACTION = 0.45;
const SPAWN_RADIUS = [18, 110];
const DESPAWN_RADIUS = 160;
const RETRY_SPAWN_ATTEMPTS = 10;
const ENTER_DIST = 4.4; // was 2.6 — vehicles got real-world-sized (up to ~5m long), so the old distance made the far end of a van or truck unreachable
const JACK_DIST = 4.8;
const AI_WANDER_RADIUS = 70;

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDriverAppearance() {
  return {
    gender: Math.random() < 0.5 ? 'male' : 'female',
    skinTone: randomFrom(SKIN_TONES),
    hairColor: randomFrom(HAIR_COLORS),
    hairStyle: randomFrom(HAIR_STYLES),
    outfitColor: randomFrom(['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#94a3b8']),
    buildScale: 0.9 + Math.random() * 0.2,
    // Fresh seed per spawn so AI drivers don't clone faces when they
    // happen to roll matching palettes.
    faceSeed: Math.floor(Math.random() * 2 ** 31),
  };
}

function applyDrivingPose(bones) {
  bones.upperLegLeft.rotation.x = 1.35;
  bones.upperLegRight.rotation.x = 1.35;
  bones.lowerLegLeft.rotation.x = -1.15;
  bones.lowerLegRight.rotation.x = -1.15;
  bones.upperArmLeft.rotation.x = -0.95;
  bones.upperArmRight.rotation.x = -0.95;
  bones.forearmLeft.rotation.x = 0.35;
  bones.forearmRight.rotation.x = 0.35;
  // Feet rest toe-down on the pegs/pedals rather than staying flat as if
  // still standing on flat ground.
  if (bones.ankleLeft && bones.ankleRight) {
    bones.ankleLeft.rotation.x = 0.3;
    bones.ankleRight.rotation.x = 0.3;
  }
  // Both hands wrap around the wheel/handlebar grips instead of resting
  // open in mid-air next to them.
  applyGripPose(bones, 'Left', 0.9);
  applyGripPose(bones, 'Right', 0.9);
}

export class VehicleSystem {
  constructor({ scene, mapConfig, scale, colliders }) {
    this.scene = scene;
    this.mapConfig = mapConfig;
    this.scale = scale;
    this.colliders = colliders;
    this.active = [];
    this._lastMaintainAt = 0;
    this.drivenEntry = null;
  }

  _blockedAt(x, z, radius = 1.2) {
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (Math.abs(x - c.x) > c.halfW + radius || Math.abs(z - c.z) > c.halfD + radius) continue;
      const closestX = Math.min(Math.max(x, c.x - c.halfW), c.x + c.halfW);
      const closestZ = Math.min(Math.max(z, c.z - c.halfD), c.z + c.halfD);
      const dx = x - closestX;
      const dz = z - closestZ;
      if (dx * dx + dz * dz < radius * radius) return true;
    }
    return false;
  }

  _pickSpawnPoint(playerPos) {
    for (let i = 0; i < RETRY_SPAWN_ATTEMPTS; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = SPAWN_RADIUS[0] + Math.random() * (SPAWN_RADIUS[1] - SPAWN_RADIUS[0]);
      const x = playerPos.x + Math.cos(angle) * dist;
      const z = playerPos.z + Math.sin(angle) * dist;
      if (!this._blockedAt(x, z, 1.4)) return { x, z, heading: Math.random() * Math.PI * 2 };
    }
    return null;
  }

  _pickWanderTarget(anchor) {
    for (let i = 0; i < RETRY_SPAWN_ATTEMPTS; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * AI_WANDER_RADIUS;
      const x = anchor.x + Math.cos(angle) * dist;
      const z = anchor.z + Math.sin(angle) * dist;
      if (!this._blockedAt(x, z, 1.4)) return { x, z };
    }
    return { ...anchor };
  }

  _spawnOne(playerPos) {
    const spawn = this._pickSpawnPoint(playerPos);
    if (!spawn) return;

    const def = VEHICLE_CATALOG[Math.floor(Math.random() * VEHICLE_CATALOG.length)];
    const built = buildVehicle(def.key);
    built.group.position.set(spawn.x, 0, spawn.z);
    built.group.rotation.y = spawn.heading;
    this.scene.add(built.group);

    const controller = new VehicleController({
      x: spawn.x,
      z: spawn.z,
      heading: spawn.heading,
      kind: def.kind,
      speedMultiplier: def.speedMultiplier,
      colliders: this.colliders,
    });

    const entry = { ...built, controller, def, occupied: false, aiDriven: false, driverRig: null, wanderTarget: null };

    if (Math.random() < AI_DRIVER_FRACTION) {
      entry.aiDriven = true;
      entry.wanderTarget = this._pickWanderTarget(spawn);
      const driverRig = buildCharacter(randomDriverAppearance());
      this.scene.add(driverRig.group);
      entry.driverRig = driverRig;
    }

    this.active.push(entry);
  }

  update(dt, playerPos, now) {
    if (now - this._lastMaintainAt > 500) {
      this._lastMaintainAt = now;
      this.active = this.active.filter((v) => {
        if (v === this.drivenEntry) return true; // never despawn what you're driving
        const d = Math.hypot(v.group.position.x - playerPos.x, v.group.position.z - playerPos.z);
        if (d > DESPAWN_RADIUS) {
          this.scene.remove(v.group);
          if (v.driverRig) this.scene.remove(v.driverRig.group);
          return false;
        }
        return true;
      });
      while (this.active.length < ACTIVE_TARGET) {
        const before = this.active.length;
        this._spawnOne(playerPos);
        if (this.active.length === before) break;
      }
    }

    this.active.forEach((entry) => {
      if (entry === this.drivenEntry) {
        this._syncVisual(entry);
        this._syncTrunk(entry, dt);
        return;
      }
      if (entry.aiDriven) this._updateAiDriver(entry, dt, now);
      this._syncVisual(entry);
      this._syncTrunk(entry, dt);
      if (entry.driverRig) this._syncDriver(entry, now);
    });
  }

  /** Eases a vehicle's trunk hinge toward open/closed — same lerp-to-
   * target pattern GameEngine uses for building doors/gates. */
  _syncTrunk(entry, dt) {
    if (!entry.trunkHinge) return;
    const target = entry.trunkOpen ? -1.9 : 0;
    entry.trunkHinge.rotation.y += (target - entry.trunkHinge.rotation.y) * Math.min(1, dt * 3.2);
  }

  _updateAiDriver(entry, dt, now) {
    const c = entry.controller;
    const dx = entry.wanderTarget.x - c.x;
    const dz = entry.wanderTarget.z - c.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 6 || (c.lastCrashAt && now - c.lastCrashAt < 400)) {
      entry.wanderTarget = this._pickWanderTarget({ x: c.x, z: c.z });
    }

    // Steer toward the target heading using the same (sin,cos) forward
    // convention as everything else — compute the angle to the target
    // and turn the shorter way toward it.
    const targetHeading = Math.atan2(dx, dz);
    let diff = targetHeading - c.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const steer = Math.max(-1, Math.min(1, diff * 1.6));
    const throttle = Math.abs(diff) > 2.2 ? 0.3 : 0.85; // slow way down for sharp turns

    c.update(dt, { throttle, steer, handbrake: false });
  }

  _syncDriver(entry, now) {
    const t = entry.controller.getTransform();
    // seatForwardOffset places the driver at the actual seat position
    // within the cabin (not the vehicle's geometric center) — projected
    // into world space along the vehicle's own forward axis, same
    // (sin, cos) basis as every other heading-based position in the game.
    const fwd = entry.seatForwardOffset || 0;
    // entry.seatHeight is where the character's HIPS should end up
    // (roughly the seat cushion height) — but the rig's root sits
    // `hipOffset` BELOW its own hips (see buildCharacter's comment), so
    // the root itself has to be placed that far below the seat, or the
    // driver ends up floating a hip-height above the actual seat.
    const hipOffset = entry.driverRig.hipOffset || 0;
    entry.driverRig.group.position.set(
      t.x + Math.sin(t.heading) * fwd,
      t.y + entry.seatHeight - hipOffset,
      t.z + Math.cos(t.heading) * fwd
    );
    entry.driverRig.group.rotation.y = t.heading + Math.PI;
    entry.driverRig.group.visible = entry.group.visible;
    // animateCharacter runs FIRST (its idle branch drives the subtle
    // breathing/torso-scale life and resets hip/head baselines) and
    // applyDrivingPose runs AFTER, so the seated leg/arm bend and the
    // hands-on-the-wheel grip it sets are always the final word — this
    // used to be the other way round, which meant animateCharacter's
    // idle branch (explicitly zeroing leg/arm rotation) ran last and
    // silently straightened the driver's legs back out and dropped the
    // wheel grip every single frame the vehicle was moving.
    if (Math.abs(t.speed) > 0.1) animateCharacter(entry.driverRig.bones, { time: now / 1000, speedFactor: 0 });
    applyDrivingPose(entry.driverRig.bones);
  }

  _syncVisual(entry) {
    const t = entry.controller.getTransform();
    entry.group.position.set(t.x, t.y, t.z);
    entry.group.rotation.y = t.heading;

    ['frontLeft', 'frontRight'].forEach((k) => {
      const w = entry.wheels[k];
      if (w) w.pivot.rotation.y = t.steerAngle;
    });
    Object.values(entry.wheels).forEach((w) => {
      // The tire geometry's axle axis is baked onto local Z at creation
      // (see VehicleModel's wheel()) — Z is the vehicle's WIDTH axis
      // (matches every chassis's own len→X / width→Z convention), so Z
      // is the correct roll/spin axis here, not X.
      if (w?.mesh) w.mesh.rotation.z = t.wheelRoll;
    });
  }

  applyCulling(playerPos, maxDist) {
    this.active.forEach((v) => {
      if (v === this.drivenEntry) return;
      const d = Math.hypot(v.group.position.x - playerPos.x, v.group.position.z - playerPos.z);
      v.group.visible = d < maxDist;
      if (v.driverRig) v.driverRig.group.visible = v.group.visible;
    });
  }

  /** A free, empty parked vehicle nearby — entering this is not a crime. */
  getNearestEnterable(playerPos) {
    let nearest = null;
    let nearestDist = ENTER_DIST;
    this.active.forEach((v) => {
      if (v.occupied || v.aiDriven) return;
      const d = Math.hypot(v.group.position.x - playerPos.x, v.group.position.z - playerPos.z);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = v;
      }
    });
    return nearest;
  }

  /** A currently NPC-driven vehicle nearby — taking this ejects the driver and is a carjacking. */
  getNearestJackable(playerPos) {
    let nearest = null;
    let nearestDist = JACK_DIST;
    this.active.forEach((v) => {
      if (v.occupied || !v.aiDriven) return;
      const d = Math.hypot(v.group.position.x - playerPos.x, v.group.position.z - playerPos.z);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = v;
      }
    });
    return nearest;
  }

  /**
   * Every active, currently-visible vehicle except the one the player is
   * driving (see PhysicsController's own comment for why that one's
   * excluded), in the {x,z,heading,halfLen,halfWid} shape
   * PhysicsController.setVehicleColliders() expects. Called once per
   * frame by GameEngine — this is what makes vehicles solid to walking
   * players instead of walk-through-able.
   */
  getVehicleColliders() {
    const list = [];
    this.active.forEach((v) => {
      if (v === this.drivenEntry || !v.group.visible) return;
      const t = v.controller.getTransform();
      list.push({
        x: t.x,
        z: t.z,
        heading: t.heading,
        halfLen: (v.length || 2) / 2 + 0.05,
        halfWid: (v.width || 1) / 2 + 0.05,
      });
    });
    return list;
  }

  /** Opens/closes the trunk (or rear doors, on a van) of a car-like
   * vehicle — melee/no-op on bikes, which don't have one. Returns the
   * new open state, or null if this vehicle has no trunk. */
  toggleTrunk(entry) {
    if (!entry || !entry.trunkHinge) return null;
    entry.trunkOpen = !entry.trunkOpen;
    return entry.trunkOpen;
  }

  enter(entry) {
    entry.occupied = true;
    entry.group.visible = true;
    this.drivenEntry = entry;
    return entry;
  }

  /** Forces an occupied vehicle to a stop, removes its driver, and hands it to the player. */
  carjack(entry) {
    entry.controller.speed = 0;
    entry.aiDriven = false;
    if (entry.driverRig) {
      this.scene.remove(entry.driverRig.group);
      entry.driverRig = null;
    }
    return this.enter(entry);
  }

  /** @returns {{x:number,z:number,heading:number}} a spot beside the vehicle to place the player on foot */
  exit() {
    if (!this.drivenEntry) return null;
    const entry = this.drivenEntry;
    entry.occupied = false;
    entry.controller.speed = 0;
    const t = entry.controller.getTransform();
    // Offset needs to clear the vehicle's actual half-width (now up to
    // ~1m for a van) plus the player's own collision radius, or the
    // player spawns back inside the vehicle's new (correctly-registered,
    // see PhysicsController.setVehicleColliders) collider and immediately
    // gets pushed around by it.
    const clearance = (entry.width || 1) / 2 + 0.9;
    const sideX = t.x + Math.cos(t.heading) * clearance;
    const sideZ = t.z - Math.sin(t.heading) * clearance;
    this.drivenEntry = null;
    return { x: sideX, z: sideZ, heading: t.heading };
  }

  dispose() {
    this.active.forEach((v) => {
      this.scene.remove(v.group);
      if (v.driverRig) this.scene.remove(v.driverRig.group);
    });
    this.active = [];
    this.drivenEntry = null;
  }
}
