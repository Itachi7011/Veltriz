/**
 * Arcade vehicle driving physics — deliberately simple and deterministic
 * (same philosophy as PhysicsController.js's kinematic character
 * controller, and for the same reason: predictable custom motion beats
 * fighting a general-purpose physics engine for "drive around a city of
 * boxes" gameplay). Not a simulation of real vehicle dynamics — no
 * suspension, no per-wheel slip — but it has real acceleration, braking,
 * speed-dependent steering (can't turn on a dime at speed), a handbrake,
 * and reverse, and it collides with the same building/house footprints
 * the player does on foot.
 */

const KIND_TUNING = {
  bike: { maxSpeed: 7.5, accel: 5.5, brake: 9, reverseMax: 3, turnRate: 2.6, drag: 2.2, footprint: 0.5 },
  motorbike: { maxSpeed: 15, accel: 7, brake: 10, reverseMax: 3.5, turnRate: 2.4, drag: 1.6, footprint: 0.55 },
  car: { maxSpeed: 20, accel: 6, brake: 11, reverseMax: 5, turnRate: 1.7, drag: 1.4, footprint: 1.1 },
  truck: { maxSpeed: 18, accel: 5, brake: 10, reverseMax: 4.5, turnRate: 1.4, drag: 1.5, footprint: 1.3 },
  van: { maxSpeed: 17, accel: 4.6, brake: 9.5, reverseMax: 4, turnRate: 1.35, drag: 1.6, footprint: 1.3 },
  suv: { maxSpeed: 19, accel: 5.5, brake: 10.5, reverseMax: 4.5, turnRate: 1.5, drag: 1.4, footprint: 1.2 },
};

export class VehicleController {
  constructor({ x, z, heading = 0, kind, speedMultiplier = 1, colliders }) {
    this.x = x;
    this.z = z;
    this.y = 0;
    this.heading = heading;
    this.speed = 0;
    this.steerAngle = 0;
    this.kind = kind;
    this.tuning = { ...(KIND_TUNING[kind] || KIND_TUNING.car) };
    this.tuning.maxSpeed *= speedMultiplier;
    this.colliders = colliders;
    this.wheelRoll = 0;
    this.lastCrashAt = 0;
  }

  _blockedAt(x, z) {
    const r = this.tuning.footprint;
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      if (Math.abs(x - c.x) > c.halfW + r || Math.abs(z - c.z) > c.halfD + r) continue;
      const closestX = Math.min(Math.max(x, c.x - c.halfW), c.x + c.halfW);
      const closestZ = Math.min(Math.max(z, c.z - c.halfD), c.z + c.halfD);
      const dx = x - closestX;
      const dz = z - closestZ;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  }

  /**
   * @param {number} throttle -1..1 (negative = reverse/brake depending on current speed)
   * @param {number} steer -1..1
   * @param {boolean} handbrake
   */
  update(dt, { throttle, steer, handbrake }) {
    const t = this.tuning;

    if (handbrake) {
      const decel = t.brake * 1.6 * dt;
      this.speed = this.speed > 0 ? Math.max(0, this.speed - decel) : Math.min(0, this.speed + decel);
    } else if (throttle > 0) {
      if (this.speed < 0) {
        this.speed = Math.min(0, this.speed + t.brake * dt);
      } else {
        this.speed = Math.min(t.maxSpeed, this.speed + t.accel * dt * throttle);
      }
    } else if (throttle < 0) {
      if (this.speed > 0) {
        this.speed = Math.max(0, this.speed + t.brake * dt * throttle);
      } else {
        this.speed = Math.max(-t.reverseMax, this.speed + t.accel * dt * throttle * 0.6);
      }
    } else {
      const drag = t.drag * dt;
      this.speed = this.speed > 0 ? Math.max(0, this.speed - drag) : Math.min(0, this.speed + drag);
    }

    const speedFactor = Math.min(1, Math.abs(this.speed) / 3);
    const steerDir = this.speed < 0 ? -1 : 1;
    this.heading += steer * t.turnRate * speedFactor * steerDir * dt;
    this.steerAngle = steer * 0.5;

    const dx = Math.sin(this.heading) * this.speed * dt;
    const dz = Math.cos(this.heading) * this.speed * dt;

    const nextX = this.x + dx;
    const nextZ = this.z + dz;
    if (!this._blockedAt(nextX, this.z)) this.x = nextX;
    else {
      this.speed *= 0.15;
      this.lastCrashAt = performance.now();
    }
    if (!this._blockedAt(this.x, nextZ)) this.z = nextZ;
    else {
      this.speed *= 0.15;
      this.lastCrashAt = performance.now();
    }

    this.wheelRoll += (this.speed / 0.28) * dt;
  }

  setSpawn(x, z, heading = 0) {
    this.x = x;
    this.z = z;
    this.heading = heading;
    this.speed = 0;
  }

  getTransform() {
    return { x: this.x, y: this.y, z: this.z, heading: this.heading, speed: this.speed, steerAngle: this.steerAngle, wheelRoll: this.wheelRoll };
  }
}
