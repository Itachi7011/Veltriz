import * as CANNON from 'cannon-es';

const GRAVITY = -22;
const WALK_SPEED = 3.4;
const RUN_SPEED = 6.6;
const JUMP_SPEED = 7.2;
const PLAYER_RADIUS = 0.32;
const PLAYER_HEIGHT = 1.75;

/**
 * A small real physics world (cannon-es): gravity, a static collider per
 * building/house footprint (kept 1:1 with the existing map data — nothing
 * removed, just given real height/depth instead of a 2D sensor rectangle),
 * and a capsule-ish player body that can walk, run, jump, and collide with
 * the city instead of sliding around on an invisible top-down plane.
 */
export class PhysicsController {
  constructor({ mapConfig, scale }) {
    this.scale = scale;
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, GRAVITY, 0) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    this.world.defaultContactMaterial.friction = 0.02;

    this.groundMaterial = new CANNON.Material('ground');
    this.playerMaterial = new CANNON.Material('player');
    this.world.addContactMaterial(
      new CANNON.ContactMaterial(this.groundMaterial, this.playerMaterial, {
        friction: 0.0,
        restitution: 0.0,
      })
    );

    // Ground plane
    const groundBody = new CANNON.Body({ mass: 0, material: this.groundMaterial });
    groundBody.addShape(new CANNON.Plane());
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    this.world.addBody(groundBody);

    // Player body: a cylinder approximates a capsule well enough for a
    // stylized character and is much cheaper than a true compound capsule.
    this.playerBody = new CANNON.Body({
      mass: 62,
      material: this.playerMaterial,
      fixedRotation: true,
      linearDamping: 0.001,
    });
    this.playerBody.addShape(new CANNON.Cylinder(PLAYER_RADIUS, PLAYER_RADIUS, PLAYER_HEIGHT, 10));
    this.playerBody.position.set(0, PLAYER_HEIGHT / 2 + 0.05, 0);
    this.world.addBody(this.playerBody);

    this.structureBodies = [];
    this._buildStaticColliders(mapConfig);

    this.isGrounded = false;
    this._groundedTimer = 0;
    this.velocity = { x: 0, z: 0 };
  }

  _buildStaticColliders(mapConfig) {
    const { buildings = [], houses = [], obstacles = [] } = mapConfig;
    const s = this.scale;

    const addBox = (x, z, halfW, halfD, height, yOffset = 0) => {
      const body = new CANNON.Body({ mass: 0, material: this.groundMaterial });
      body.addShape(new CANNON.Box(new CANNON.Vec3(halfW, height / 2, halfD)));
      body.position.set(x, height / 2 + yOffset, z);
      this.world.addBody(body);
      this.structureBodies.push(body);
    };

    buildings.forEach((b) => {
      const floors = 3; // matches BuildingBuilder default footprint collider (approximate, generous)
      const height = Math.max(3, floors * 1.05);
      addBox(b.x * s, b.y * s, (b.width * s) / 2, (b.height * s) / 2, height);
    });
    houses.forEach((h) => {
      const height = h.height > 200 ? 1.8 : 0.9;
      addBox(h.x * s, h.y * s, (h.width * s) / 2, (h.height * s) / 2, height);
    });
    obstacles.forEach((o) => {
      addBox(o.x * s, o.y * s, Math.max(0.15, (o.width * s) / 2), Math.max(0.15, (o.height * s) / 2), 0.7);
    });
  }

  setSpawn(x, z) {
    this.playerBody.position.set(x, PLAYER_HEIGHT / 2 + 0.05, z);
    this.playerBody.velocity.set(0, 0, 0);
  }

  /**
   * @param {number} moveX -1..1 strafe (camera-relative right)
   * @param {number} moveZ -1..1 forward (camera-relative forward)
   * @param {number} facingYaw camera yaw in radians, 0 = -Z forward
   * @param {boolean} running
   * @param {boolean} jumpPressed
   */
  update(dt, { moveX, moveZ, facingYaw, running, jumpPressed }) {
    // Ground check via short downward raycast from the body's base.
    const from = new CANNON.Vec3(this.playerBody.position.x, this.playerBody.position.y, this.playerBody.position.z);
    const to = new CANNON.Vec3(from.x, from.y - (PLAYER_HEIGHT / 2 + 0.15), from.z);
    const result = new CANNON.RaycastResult();
    this.world.raycastClosest(from, to, {}, result);
    const grounded = result.hasHit;
    this.isGrounded = grounded;

    const speed = running ? RUN_SPEED : WALK_SPEED;
    const sin = Math.sin(facingYaw);
    const cos = Math.cos(facingYaw);

    // Camera-relative movement: forward is -Z rotated by yaw.
    const worldX = moveX * cos + moveZ * sin;
    const worldZ = moveZ * cos - moveX * sin;
    const len = Math.hypot(worldX, worldZ);
    const nx = len > 0 ? (worldX / len) * speed : 0;
    const nz = len > 0 ? (worldZ / len) * speed : 0;

    this.playerBody.velocity.x = nx;
    this.playerBody.velocity.z = nz;

    if (jumpPressed && grounded) {
      this.playerBody.velocity.y = JUMP_SPEED;
    }

    this.world.step(1 / 60, dt, 3);

    this.velocity.x = nx;
    this.velocity.z = nz;
  }

  getPosition() {
    return this.playerBody.position;
  }

  dispose() {
    this.structureBodies.forEach((b) => this.world.removeBody(b));
    this.structureBodies = [];
  }
}

export const PLAYER_DIMENSIONS = { radius: PLAYER_RADIUS, height: PLAYER_HEIGHT };
