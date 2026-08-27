import * as CANNON from 'cannon-es';

const GRAVITY = -22;
const WALK_SPEED = 3.4;
const RUN_SPEED = 6.6;
const JUMP_SPEED = 7.2;
const PLAYER_RADIUS = 0.32;
const PLAYER_HEIGHT = 1.75;
// Two stacked spheres approximate a capsule. cannon-es resolves sphere-vs-
// box and sphere-vs-plane contacts very robustly; a single tall Cylinder
// (the previous approach) is internally a low-face ConvexPolyhedron in
// cannon-es, and colliding its flat top/bottom/edge faces against the
// building/house boxes packed densely across this map could occasionally
// produce a wildly incorrect contact normal — the exact "player suddenly
// rockets upward and never comes back down" bug this replaces.
const SPHERE_OFFSET = PLAYER_HEIGHT / 2 - PLAYER_RADIUS;
const MAX_FALL_SPEED = 28;
const MAX_RISE_SPEED = 12;
const GROUND_CLEARANCE = 0.05;
// playerBody.position.y is the capsule's CENTER height (baseline ≈0.925 at
// rest, since the body itself never sits at y=0). Everything outside this
// class — the rig's visual position, camera eye height, etc. — wants a
// feet-on-the-ground value where 0 = standing and >0 only while airborne.
// getPosition() subtracts this baseline so callers get that, while the
// raw playerBody.position (still true center height) is used for every
// physics/raycast calculation inside this class.
const GROUND_BASELINE_Y = PLAYER_HEIGHT / 2 + GROUND_CLEARANCE;

// Collision groups: the ground-check raycast below must never be able to
// hit the player's own compound shape (it's an infinite-radius query
// starting at the body's own center, so it will otherwise cross the
// body's own lower sphere every time and can report "grounded" even
// mid-air) — putting the player on its own group and masking the ray to
// world-only geometry makes the ground check test the actual world, not
// itself.
const GROUP_WORLD = 1;
const GROUP_PLAYER = 2;

/**
 * A small real physics world (cannon-es): gravity, a static collider per
 * building/house footprint (kept 1:1 with the existing map data — nothing
 * removed, just given real height/depth instead of a 2D sensor rectangle),
 * and a capsule-like player body that can walk, run, jump, and collide
 * with the city instead of sliding around on an invisible top-down plane.
 */
export class PhysicsController {
  constructor({ mapConfig, scale }) {
    this.scale = scale;
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, GRAVITY, 0) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    this.world.solver.iterations = 12;
    this.world.defaultContactMaterial.friction = 0.02;

    this.groundMaterial = new CANNON.Material('ground');
    this.playerMaterial = new CANNON.Material('player');
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.groundMaterial, this.playerMaterial, {
        friction: 0.0,
        restitution: 0.0,
        contactEquationStiffness: 1e8,
        contactEquationRelaxation: 4,
      })
    );

    // Ground plane
    const groundBody = new CANNON.Body({ mass: 0, material: this.groundMaterial });
    groundBody.collisionFilterGroup = GROUP_WORLD;
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);

    // Player body: compound of two spheres (a "pill" shape), far more
    // stable against dense box geometry than a single cylinder.
    this.playerBody = new CANNON.Body({
      mass: 62,
      material: this.playerMaterial,
      fixedRotation: true,
      linearDamping: 0.001,
      // Never let the controllable player sleep: cannon-es stops
      // integrating a sleeping body's position even after its velocity
      // is set again from outside, which is exactly what "moves fine at
      // first, but freezes (with the walk animation still playing) after
      // any pause" looks like — the body nodded off and never woke back up.
      allowSleep: false,
    });
    this.playerBody.collisionFilterGroup = GROUP_PLAYER;
    this.playerBody.collisionFilterMask = GROUP_WORLD;
    const sphereShape = new CANNON.Sphere(PLAYER_RADIUS);
    this.playerBody.addShape(sphereShape, new CANNON.Vec3(0, SPHERE_OFFSET, 0));
    this.playerBody.addShape(sphereShape, new CANNON.Vec3(0, -SPHERE_OFFSET, 0));
    this.playerBody.position.set(0, GROUND_BASELINE_Y, 0);
    this.world.addBody(this.playerBody);

    this.structureBodies = [];
    this.colliderBoxes = []; // plain {x,z,halfW,halfD} list, e.g. for NpcSystem's non-physics blocking checks
    this._buildStaticColliders(mapConfig);

    this.isGrounded = false;
    this.velocity = { x: 0, z: 0 };
    this._lastSafePosition = new CANNON.Vec3(0, GROUND_BASELINE_Y, 0);
  }

  _buildStaticColliders(mapConfig) {
    const { buildings = [], houses = [], obstacles = [] } = mapConfig;
    const s = this.scale;

    const addBox = (x, z, halfW, halfD, height, yOffset = 0) => {
      const body = new CANNON.Body({ mass: 0, material: this.groundMaterial });
      body.collisionFilterGroup = GROUP_WORLD;
      body.addShape(new CANNON.Box(new CANNON.Vec3(halfW, height / 2, halfD)));
      body.position.set(x, height / 2 + yOffset, z);
      this.world.addBody(body);
      this.structureBodies.push(body);
      this.colliderBoxes.push({ x, z, halfW, halfD });
    };

    buildings.forEach((b) => {
      const floors = 3; // matches BuildingBuilder default footprint collider (approximate, generous)
      const height = Math.max(3, floors * 1.05);
      addBox(b.x * s, b.y * s, (b.width * s) / 2, (b.height * s) / 2, height);
    });
    houses.forEach((h) => {
      // Mirrors BuildingBuilder's classifyHouse() heuristic closely enough
      // for a collision box (doesn't need to be pixel-perfect): tall
      // condo/tower-shaped houses get a taller collider than small
      // cottages, so you can't see through the top of a "penthouse" into
      // thin air.
      const isTowerLike = /tower|condo|flat|loft|penthouse|apartment|suite|estate|complex|residence|studio|unit/i.test(
        h.houseType || ''
      );
      const price = h.price || 0;
      const floors = isTowerLike && price > 2200 ? Math.max(2, Math.min(9, 2 + Math.floor(price / 3200))) : price > 4500 ? 2 : 1;
      const height = floors * 0.95;
      addBox(h.x * s, h.y * s, (h.width * s) / 2, (h.height * s) / 2, height);
    });
    obstacles.forEach((o) => {
      addBox(o.x * s, o.y * s, Math.max(0.15, (o.width * s) / 2), Math.max(0.15, (o.height * s) / 2), 0.7);
    });
  }

  setSpawn(x, z) {
    this.playerBody.position.set(x, GROUND_BASELINE_Y, z);
    this.playerBody.velocity.set(0, 0, 0);
    this._lastSafePosition.set(x, GROUND_BASELINE_Y, z);
  }

  /**
   * @param {number} forward -1..1, +1 = the direction the camera is facing
   * @param {number} strafe -1..1, +1 = camera-relative right
   * @param {number} facingYaw camera yaw in radians (0 = looking toward +Z)
   * @param {boolean} running
   * @param {boolean} jumpPressed
   */
  update(dt, { forward, strafe, facingYaw, running, jumpPressed }) {
    // Defensive wake-up: allowSleep:false above should already prevent
    // this body from ever sleeping, but if anything upstream (e.g. a
    // future cannon-es version, or code that flips allowSleep back on)
    // changes that, real input should never silently fail to move a body
    // that nodded off — this makes that impossible regardless.
    if ((forward || strafe || jumpPressed) && this.playerBody.sleepState !== CANNON.Body.AWAKE) {
      this.playerBody.wakeUp();
    }

    // Ground check via short downward raycast from the body's base.
    const from = new CANNON.Vec3(this.playerBody.position.x, this.playerBody.position.y, this.playerBody.position.z);
    const to = new CANNON.Vec3(from.x, from.y - (PLAYER_HEIGHT / 2 + 0.15), from.z);
    const result = new CANNON.RaycastResult();
    // collisionFilterMask: GROUP_WORLD only — excludes the player's own
    // compound body so this can't self-intersect (see GROUP_WORLD/
    // GROUP_PLAYER above), which previously made `grounded` unreliable.
    this.world.raycastClosest(from, to, { collisionFilterMask: GROUP_WORLD }, result);
    const grounded = result.hasHit;
    this.isGrounded = grounded;

    const speed = running ? RUN_SPEED : WALK_SPEED;
    const sin = Math.sin(facingYaw);
    const cos = Math.cos(facingYaw);

    // Right vector consistent with this yaw convention (mouse-right decreases
    // yaw, which rotates `forward` toward -X — see CameraRig's mouse handler)
    // is (-cos(yaw), sin(yaw)), the negative of the naive right-hand-rule
    // guess. Using the positive version here was the exact cause of A/D
    // (and left/right arrow) being swapped.
    const worldX = forward * sin - strafe * cos;
    const worldZ = forward * cos + strafe * sin;
    const len = Math.hypot(worldX, worldZ);
    const nx = len > 0 ? (worldX / len) * speed : 0;
    const nz = len > 0 ? (worldZ / len) * speed : 0;

    this.playerBody.velocity.x = nx;
    this.playerBody.velocity.z = nz;

    if (jumpPressed && grounded) {
      this.playerBody.velocity.y = JUMP_SPEED;
    }

    // Safety clamp: a bad contact resolution should never be able to
    // launch the player into the stratosphere or through the floor.
    if (this.playerBody.velocity.y > MAX_RISE_SPEED) this.playerBody.velocity.y = MAX_RISE_SPEED;
    if (this.playerBody.velocity.y < -MAX_FALL_SPEED) this.playerBody.velocity.y = -MAX_FALL_SPEED;

    this.world.step(1 / 60, dt, 5);

    // If something still slips through (e.g. spawned inside geometry) and
    // the player ends up somewhere absurd, snap back to the last known
    // grounded position instead of leaving them stuck in the void.
    const p = this.playerBody.position;
    const wildly = p.y > 40 || p.y < -20 || Number.isNaN(p.y);
    if (wildly) {
      this.playerBody.position.copy(this._lastSafePosition);
      this.playerBody.velocity.set(0, 0, 0);
    } else if (grounded && Math.abs(this.playerBody.velocity.y) < 3) {
      this._lastSafePosition.copy(p);
    }

    this.velocity.x = nx;
    this.velocity.z = nz;
  }

  getColliders() {
    return this.colliderBoxes;
  }

  getPosition() {
    const p = this.playerBody.position;
    return { x: p.x, y: p.y - GROUND_BASELINE_Y, z: p.z };
  }

  dispose() {
    this.structureBodies.forEach((b) => this.world.removeBody(b));
    this.structureBodies = [];
  }
}

export const PLAYER_DIMENSIONS = { radius: PLAYER_RADIUS, height: PLAYER_HEIGHT };