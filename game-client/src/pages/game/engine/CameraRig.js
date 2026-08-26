import * as THREE from 'three';

const TPV_DISTANCE = 4.2;
const TPV_HEIGHT = 1.55;
const FPV_HEIGHT = 1.62;

/**
 * Handles both camera modes:
 *  - First person: camera sits at eye height inside the character's head;
 *    the body is hidden (except forearms/hands, like most FPV games) so
 *    the player isn't staring at the inside of their own skull.
 *  - Third person: a spring-arm camera that orbits behind/above the
 *    character with mouse look, and pulls in via a collision raycast so
 *    it never clips through buildings.
 *
 * Mouse look uses the Pointer Lock API so movement is relative, exactly
 * like a real game, not "drag to rotate".
 */
export class CameraRig {
  constructor({ camera, domElement, scene, characterGroup }) {
    this.camera = camera;
    this.domElement = domElement;
    this.scene = scene;
    this.characterGroup = characterGroup;

    this.mode = 'third'; // 'third' | 'first'
    this.yaw = 0;
    this.pitch = -0.12;
    this.minPitch = -1.15;
    this.maxPitch = 1.0;

    this.raycaster = new THREE.Raycaster();
    // Required by three.js whenever you raycast against a THREE.Sprite
    // (the building name-sign labels are sprites) — without this, Sprite's
    // raycast() throws trying to read `raycaster.camera.matrixWorld` on a
    // null camera, every single frame, before the scene ever gets
    // rendered. That was the root cause of the blank screen.
    this.raycaster.camera = camera;
    this._pointerLocked = false;

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);
    this._onClick = this._onClick.bind(this);

    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
    domElement.addEventListener('click', this._onClick);
  }

  _onClick() {
    if (!this._pointerLocked && document.pointerLockElement !== this.domElement) {
      this.domElement.requestPointerLock?.();
    }
  }

  _onPointerLockChange() {
    this._pointerLocked = document.pointerLockElement === this.domElement;
  }

  _onMouseMove(e) {
    if (!this._pointerLocked) return;
    const sensitivity = 0.0024;
    this.yaw -= e.movementX * sensitivity;
    this.pitch -= e.movementY * sensitivity;
    this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
  }

  toggleMode() {
    this.mode = this.mode === 'third' ? 'first' : 'third';
    return this.mode;
  }

  setMode(mode) {
    this.mode = mode;
  }

  releasePointerLock() {
    if (document.pointerLockElement === this.domElement) document.exitPointerLock?.();
  }

  /** collidables: array of THREE.Mesh/Group used for the TPV pull-in raycast */
  update(playerPos, collidables) {
    const headY = playerPos.y + FPV_HEIGHT;

    if (this.mode === 'first') {
      this.camera.position.set(playerPos.x, headY, playerPos.z);
      const dir = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        Math.cos(this.yaw) * Math.cos(this.pitch)
      );
      this.camera.lookAt(
        playerPos.x + dir.x,
        headY + dir.y,
        playerPos.z + dir.z
      );
    } else {
      const targetY = playerPos.y + TPV_HEIGHT;
      const dirX = Math.sin(this.yaw) * Math.cos(this.pitch);
      const dirY = Math.sin(this.pitch);
      const dirZ = Math.cos(this.yaw) * Math.cos(this.pitch);

      let dist = TPV_DISTANCE;
      if (collidables && collidables.length) {
        const origin = new THREE.Vector3(playerPos.x, targetY, playerPos.z);
        const back = new THREE.Vector3(-dirX, -dirY, -dirZ).normalize();
        this.raycaster.set(origin, back);
        this.raycaster.far = TPV_DISTANCE + 0.5;
        const hits = this.raycaster.intersectObjects(collidables, true);
        if (hits.length && hits[0].distance < dist) {
          dist = Math.max(0.8, hits[0].distance - 0.25);
        }
      }

      this.camera.position.set(playerPos.x - dirX * dist, targetY - dirY * dist * 0.4 + dist * 0.15, playerPos.z - dirZ * dist);
      this.camera.lookAt(playerPos.x, targetY, playerPos.z);
    }

    // Character always faces camera yaw (movement direction handling is
    // done by the caller feeding moveX/moveZ relative to this same yaw).
    if (this.characterGroup) {
      this.characterGroup.rotation.y = this.yaw + Math.PI;
      this.characterGroup.visible = this.mode !== 'first';
    }
  }

  get facingYaw() {
    return this.yaw;
  }

  dispose() {
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    this.domElement.removeEventListener('click', this._onClick);
    if (document.pointerLockElement === this.domElement) document.exitPointerLock?.();
  }
}
