const GRAVITY = -22;
const WALK_SPEED = 8.5; // 2.5x the original 3.4
const RUN_SPEED = 17; // Shift — roughly the same walk:run ratio as before, scaled up
const SKATE_SPEED = 24; // Skateboard mode
const SKATE_BOOST_SPEED = 34; // Skateboard + Shift — fastest way to get around on foot
const JUMP_SPEED = 7.2;
const PLAYER_RADIUS = 0.34;
const PLAYER_HEIGHT = 1.75;
const TERMINAL_VELOCITY = -30;

/**
 * A small deterministic kinematic controller — deliberately NOT a rigid-
 * body physics engine (see CHANGES notes for why cannon-es was removed).
 *
 * Horizontal movement: every building/house/obstacle is treated as a
 * solid vertical column — a circle-vs-rectangle overlap test in the X/Z
 * plane, full height, no vertical component at all. This matches how the
 * original 2D game already worked (walk around buildings, enter through
 * the interaction prompt, never through/over a wall), and — importantly —
 * makes it structurally impossible for a horizontal wall collision to
 * ever inject vertical velocity, which is exactly the class of bug a
 * rigid-body solver was producing here.
 *
 * Vertical movement: purely gravity + jump against a flat ground plane at
 * y=0. Nothing about buildings ever touches the Y axis.
 */
export class PhysicsController {
  constructor({ mapConfig, scale }) {
    this.scale = scale;
    this.position = { x: 0, y: 0, z: 0 };
    this.velocityY = 0;
    this.velocity = { x: 0, z: 0 };
    this.isGrounded = true;

    this.colliders = this._buildColliders(mapConfig);
  }

  /** Shared read-only collider list — used by NpcSystem for wander-target avoidance too. */
  getColliders() {
    return this.colliders;
  }

  _buildColliders(mapConfig) {
    const { buildings = [], houses = [], obstacles = [] } = mapConfig;
    const s = this.scale;
    const colliders = [];

    const addCollider = (x, z, halfW, halfD) => {
      // A small inward margin so the collision box roughly matches the
      // building's visible wall footprint rather than its slightly larger
      // paved apron, and doesn't feel like an invisible force-field a
      // full meter before the wall.
      colliders.push({ x, z, halfW: Math.max(0.2, halfW - 0.1), halfD: Math.max(0.2, halfD - 0.1) });
    };

    buildings.forEach((b) => addCollider(b.x * s, b.y * s, (b.width * s) / 2, (b.height * s) / 2));
    houses.forEach((h) => addCollider(h.x * s, h.y * s, (h.width * s) / 2, (h.height * s) / 2));
    obstacles.forEach((o) => addCollider(o.x * s, o.y * s, Math.max(0.15, (o.width * s) / 2), Math.max(0.15, (o.height * s) / 2)));

    return colliders;
  }

  /** True if a circle of PLAYER_RADIUS at (x,z) overlaps any collider. */
  _blockedAt(x, z) {
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      // Cheap reject before the precise check — skips the vast majority
      // of the map's colliders every call.
      if (Math.abs(x - c.x) > c.halfW + PLAYER_RADIUS || Math.abs(z - c.z) > c.halfD + PLAYER_RADIUS) continue;
      const closestX = Math.min(Math.max(x, c.x - c.halfW), c.x + c.halfW);
      const closestZ = Math.min(Math.max(z, c.z - c.halfD), c.z + c.halfD);
      const dx = x - closestX;
      const dz = z - closestZ;
      if (dx * dx + dz * dz < PLAYER_RADIUS * PLAYER_RADIUS) return true;
    }
    return false;
  }

  setSpawn(x, z) {
    // If the exact spawn point happens to sit inside a collider (data
    // edge case), nudge outward along a small spiral instead of leaving
    // the player permanently stuck pushing against a wall from the
    // inside.
    let sx = x;
    let sz = z;
    if (this._blockedAt(sx, sz)) {
      for (let r = 0.5; r <= 6 && this._blockedAt(sx, sz); r += 0.5) {
        sx = x + r;
        sz = z;
        if (!this._blockedAt(sx, sz)) break;
        sx = x;
        sz = z + r;
      }
    }
    this.position.x = sx;
    this.position.z = sz;
    this.position.y = 0;
    this.velocityY = 0;
  }

  /**
   * @param {number} forward -1..1, +1 = the direction the camera is facing
   * @param {number} strafe -1..1, +1 = camera-relative right
   * @param {number} facingYaw camera yaw in radians (0 = looking toward +Z)
   * @param {boolean} running
   * @param {boolean} jumpPressed
   */
  update(dt, { forward, strafe, facingYaw, running, jumpPressed, skateboarding }) {
    const speed = skateboarding ? (running ? SKATE_BOOST_SPEED : SKATE_SPEED) : running ? RUN_SPEED : WALK_SPEED;
    const sin = Math.sin(facingYaw);
    const cos = Math.cos(facingYaw);

    // Same forward/right basis as CameraRig's look direction (sin(yaw),
    // cos(yaw)) — pressing "forward" moves the direction the camera is
    // looking.
    // Same forward/right basis as CameraRig's look direction (sin(yaw),
    // cos(yaw)). "Right" relative to that forward+up is
    // cross(forward,up) = (-cos(yaw), 0, sin(yaw)) — verified numerically
    // rather than assumed, since the previous version had this backwards
    // (D/right-arrow was moving players toward their actual left).
    const wishX = forward * sin - strafe * cos;
    const wishZ = forward * cos + strafe * sin;
    const len = Math.hypot(wishX, wishZ);
    const dx = len > 0 ? (wishX / len) * speed * dt : 0;
    const dz = len > 0 ? (wishZ / len) * speed * dt : 0;

    // Resolve X and Z independently against the wall list — this is what
    // gives you "sliding along a wall" for free instead of sticking dead
    // when moving diagonally into a corner.
    const nextX = this.position.x + dx;
    if (!this._blockedAt(nextX, this.position.z)) this.position.x = nextX;
    const nextZ = this.position.z + dz;
    if (!this._blockedAt(this.position.x, nextZ)) this.position.z = nextZ;

    // Gravity + jump, entirely independent of the horizontal wall checks
    // above — a building can never push the player up or down.
    this.isGrounded = this.position.y <= 0.0001;
    if (jumpPressed && this.isGrounded) {
      this.velocityY = JUMP_SPEED;
      this.isGrounded = false;
    }
    this.velocityY += GRAVITY * dt;
    if (this.velocityY < TERMINAL_VELOCITY) this.velocityY = TERMINAL_VELOCITY;

    this.position.y += this.velocityY * dt;
    if (this.position.y <= 0) {
      this.position.y = 0;
      this.velocityY = 0;
      this.isGrounded = true;
    }

    this.velocity.x = dx / dt || 0;
    this.velocity.z = dz / dt || 0;
  }

  getPosition() {
    return this.position;
  }

  dispose() {
    this.colliders = [];
  }
}

export const PLAYER_DIMENSIONS = { radius: PLAYER_RADIUS, height: PLAYER_HEIGHT };
