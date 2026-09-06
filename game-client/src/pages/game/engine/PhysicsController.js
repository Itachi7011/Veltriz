import { computeHouseWalls, computeHouseStairs, computeHouseFloorPlatforms } from './BuildingBuilder';

const GRAVITY = -22;
const WALK_SPEED = 8.5; // 2.5x the original 3.4
const RUN_SPEED = 17; // Shift — roughly the same walk:run ratio as before, scaled up
const SKATE_SPEED = 24; // Skateboard mode
const SKATE_BOOST_SPEED = 34; // Skateboard + Shift — fastest way to get around on foot
const JUMP_SPEED = 7.2;
const PLAYER_RADIUS = 0.34;
const PLAYER_HEIGHT = 1.75;
const TERMINAL_VELOCITY = -30;
// On-foot acceleration/deceleration — movement used to snap instantly to
// full walk/run speed the moment a key was pressed and stop dead the
// instant it was released, which reads as stiff/robotic compared to the
// vehicles (which already ease in via accel/brake/drag in
// VehicleController.js). ACCEL reaches WALK_SPEED in ~0.2s and RUN_SPEED
// in ~0.4s — enough of a ramp to feel smooth without feeling sluggish or
// "floaty" to control. DECEL is snappier than ACCEL so stopping still
// feels responsive rather than sliding on ice.
const MOVE_ACCEL = 42;
const MOVE_DECEL = 60;

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
    // Multi-floor houses' staircases — see _groundHeightAt() for how
    // these are used. Every house always has *some* value here (an
    // empty array for single-floor houses), and _groundHeightAt returns
    // exactly 0 whenever the player isn't standing inside one of these
    // footprints, so normal flat-ground physics is completely unchanged
    // everywhere else on the map.
    this.ramps = this._buildRamps(mapConfig);
    // Vehicles aren't part of the static map data (they spawn/move at
    // runtime), so they can't be baked into `this.colliders` at
    // construction time the way buildings/houses are — GameEngine calls
    // setVehicleColliders() once per frame with each non-driven
    // vehicle's current position/heading/footprint instead — see
    // _blockedAtVehicle() below for why these need real oriented (not
    // axis-aligned) rectangle checks, unlike the static ones.
    this.vehicleColliders = [];
  }

  /**
   * Solid-box collider list for NPC wander-avoidance and AI vehicle
   * pathing (NpcSystem/VehicleSystem) — deliberately the OLD "house is
   * one fully solid rectangle" shape, NOT the wall-segment-with-a-
   * doorway-gap version `this.colliders` uses for the player below.
   * Neither NPCs nor AI drivers have any interior logic (no stairs, no
   * reason to be inside), so they should keep treating every house as a
   * solid obstacle exactly like before this feature existed — only the
   * player's own collision (_blockedAt) got the doorway gap.
   */
  getColliders() {
    return this._solidColliders;
  }

  _buildColliders(mapConfig) {
    const { buildings = [], houses = [], obstacles = [] } = mapConfig;
    const s = this.scale;
    const colliders = [];
    const solidColliders = [];

    const addCollider = (list, x, z, halfW, halfD) => {
      // A small inward margin so the collision box roughly matches the
      // building's visible wall footprint rather than its slightly larger
      // paved apron, and doesn't feel like an invisible force-field a
      // full meter before the wall.
      list.push({ x, z, halfW: Math.max(0.2, halfW - 0.1), halfD: Math.max(0.2, halfD - 0.1) });
    };

    buildings.forEach((b) => {
      addCollider(colliders, b.x * s, b.y * s, (b.width * s) / 2, (b.height * s) / 2);
      addCollider(solidColliders, b.x * s, b.y * s, (b.width * s) / 2, (b.height * s) / 2);
    });
    // Houses: the PLAYER's own collider list gets individual wall
    // segments with a doorway-width gap (computeHouseWalls, shared with
    // BuildingBuilder.js so the collider and the visible wall are always
    // the same rectangle) — this is what actually lets a player walk
    // inside. The NPC/vehicle-AI list keeps the old single-solid-box
    // shape via addCollider, same as every other structure.
    houses.forEach((h) => {
      const { segments, cx, cz, halfW, halfD } = computeHouseWalls(h, s);
      segments.forEach((seg) => colliders.push({ x: seg.x, z: seg.z, halfW: seg.halfW, halfD: seg.halfD }));
      addCollider(solidColliders, cx, cz, halfW, halfD);
    });
    obstacles.forEach((o) => {
      addCollider(colliders, o.x * s, o.y * s, Math.max(0.15, (o.width * s) / 2), Math.max(0.15, (o.height * s) / 2));
      addCollider(solidColliders, o.x * s, o.y * s, Math.max(0.15, (o.width * s) / 2), Math.max(0.15, (o.height * s) / 2));
    });

    this._solidColliders = solidColliders;
    return colliders;
  }

  /** One entry per floor transition across every multi-floor house on
   * the map — see computeHouseStairs/computeHouseFloorPlatforms (shared
   * with BuildingBuilder.js) and _groundHeightAt() below for how these
   * turn into walkable stairs + upper floors. */
  _buildRamps(mapConfig) {
    const { houses = [] } = mapConfig;
    const s = this.scale;
    const ramps = [];
    houses.forEach((h) => {
      computeHouseStairs(h, s).forEach((flight) => ramps.push(flight));
      computeHouseFloorPlatforms(h, s).forEach((platform) => ramps.push(platform));
    });
    return ramps;
  }

  /**
   * The height of "the ground" at (x,z) — 0 everywhere on the map except
   * while standing within a registered staircase or upper-floor
   * footprint, where it's the interpolated step height (or flat floor
   * height) there. This is the ENTIRE mechanism multi-floor house
   * interiors use to be walkable: everywhere this returns 0 (i.e.
   * everywhere that isn't a house's stairs/upper floor), gravity/
   * jumping/ground-clamping below behave byte-for-byte the same as
   * before this feature existed.
   *
   * `currentY` (the player's height at the START of this frame) resolves
   * the one genuinely new ambiguity multi-floor houses introduce: the
   * SAME (x,z) column can have a valid floor at several different
   * heights (ground floor, 2nd floor, 3rd floor...). Among every
   * registered footprint the player is currently within, this picks the
   * HIGHEST one that isn't more than a small step above where they
   * already were — which is what lets a player walk up a staircase onto
   * the 2nd floor without a 1st-floor's flat ground "winning" by default,
   * while still landing on the right floor after a normal jump.
   */
  _groundHeightAt(x, z, currentY) {
    const STEP_TOLERANCE = 0.35;
    let best = 0;
    for (let i = 0; i < this.ramps.length; i++) {
      const r = this.ramps[i];
      if (Math.abs(x - r.x) > r.halfW || Math.abs(z - r.z) > r.halfD) continue;
      const t = Math.max(0, Math.min(1, (r.startZ - z) / r.run));
      const h = r.fromY + (r.toY - r.fromY) * t;
      if (h <= currentY + STEP_TOLERANCE && h > best) best = h;
    }
    return best;
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
    return this._blockedAtVehicle(x, z);
  }

  /**
   * Vehicles weren't checked here at all before — there was simply no
   * collision handling between the on-foot player and cars/bikes, parked
   * or otherwise, which is why you could walk straight through one. This
   * is the fix: unlike the static colliders above (axis-aligned, built
   * once), vehicles move and turn every frame, so each one needs a real
   * ORIENTED rectangle test against its current heading, not just an
   * axis-aligned box — the closest-point trick above only works for a
   * box aligned to the world axes.
   */
  _blockedAtVehicle(x, z) {
    for (let i = 0; i < this.vehicleColliders.length; i++) {
      const v = this.vehicleColliders[i];
      const dx = x - v.x;
      const dz = z - v.z;
      // Cheap reject with the vehicle's bounding circle before doing the
      // trig below for every vehicle on the map.
      const roughR = v.halfLen + v.halfWid + PLAYER_RADIUS;
      if (dx * dx + dz * dz > roughR * roughR) continue;

      // Rotate the world-space offset into the vehicle's own local frame
      // (forward = local +Z, right = local +X), same forward/right basis
      // used everywhere else in this file (sin/cos of heading) — see
      // VehicleController/CameraRig for why this particular pairing is
      // "forward", not an arbitrary choice.
      const sin = Math.sin(v.heading);
      const cos = Math.cos(v.heading);
      const localX = dx * -cos + dz * sin; // right-axis component
      const localZ = dx * sin + dz * cos; // forward-axis component

      const closestX = Math.min(Math.max(localX, -v.halfWid), v.halfWid);
      const closestZ = Math.min(Math.max(localZ, -v.halfLen), v.halfLen);
      const ex = localX - closestX;
      const ez = localZ - closestZ;
      if (ex * ex + ez * ez < PLAYER_RADIUS * PLAYER_RADIUS) return true;
    }
    return false;
  }

  /**
   * Called once per frame by GameEngine with every vehicle currently on
   * the map that isn't the one the local player is driving (the driven
   * vehicle's own on-foot physics body is parked and frozen — see
   * _updateDriving — so it can never collide with itself; other
   * players/AI driving it, or it sitting parked, should still block).
   * @param {Array<{x:number,z:number,heading:number,halfLen:number,halfWid:number}>} list
   */
  setVehicleColliders(list) {
    this.vehicleColliders = list || [];
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
    const targetVX = len > 0 ? (wishX / len) * speed : 0;
    const targetVZ = len > 0 ? (wishZ / len) * speed : 0;

    // Ease the ACTUAL velocity toward the target instead of snapping to
    // it — this is the entire smoothing fix: starting, stopping, and
    // changing direction now ramp over a few frames rather than jumping
    // instantly to full speed, for every movement mode (walk/run/
    // skateboard all share this, just with a different target `speed`).
    const rate = len > 0 ? MOVE_ACCEL : MOVE_DECEL;
    this.velocity.x += Math.max(-rate * dt, Math.min(rate * dt, targetVX - this.velocity.x));
    this.velocity.z += Math.max(-rate * dt, Math.min(rate * dt, targetVZ - this.velocity.z));

    const dx = this.velocity.x * dt;
    const dz = this.velocity.z * dt;

    // Resolve X and Z independently against the wall list — this is what
    // gives you "sliding along a wall" for free instead of sticking dead
    // when moving diagonally into a corner.
    const nextX = this.position.x + dx;
    if (!this._blockedAt(nextX, this.position.z)) this.position.x = nextX;
    else this.velocity.x = 0; // stop easing into a wall instead of pressing against it every frame
    const nextZ = this.position.z + dz;
    if (!this._blockedAt(this.position.x, nextZ)) this.position.z = nextZ;
    else this.velocity.z = 0;

    // Gravity + jump, entirely independent of the horizontal wall checks
    // above — a building can never push the player up or down.
    //
    // groundY is 0 everywhere except a house's stairs/upper floor (see
    // _groundHeightAt) — jumping/falling/landing all work exactly as
    // before on normal ground, they just land on a possibly-non-zero
    // floor while inside a multi-storey house.
    const groundY = this._groundHeightAt(this.position.x, this.position.z, this.position.y);
    this.isGrounded = this.position.y <= groundY + 0.0001;
    this.onRamp = groundY > 0.0001;
    if (jumpPressed && this.isGrounded) {
      this.velocityY = JUMP_SPEED;
      this.isGrounded = false;
    }
    this.velocityY += GRAVITY * dt;
    if (this.velocityY < TERMINAL_VELOCITY) this.velocityY = TERMINAL_VELOCITY;

    this.position.y += this.velocityY * dt;
    if (this.position.y <= groundY) {
      this.position.y = groundY;
      this.velocityY = 0;
      this.isGrounded = true;
    }
    // this.velocity.{x,z} are already current — maintained directly by
    // the accel/decel easing above (and zeroed there on wall collision),
    // not re-derived from dx/dt here anymore. Re-deriving from dx/dt
    // would silently undo the "stop easing into a wall" fix above by
    // overwriting the just-zeroed velocity with the pre-collision value.
  }

  getPosition() {
    return this.position;
  }

  dispose() {
    this.colliders = [];
  }
}

export const PLAYER_DIMENSIONS = { radius: PLAYER_RADIUS, height: PLAYER_HEIGHT };
