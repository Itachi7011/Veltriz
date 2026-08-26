import * as THREE from 'three';
import gameEvents from '../gameEvents';
import { buildCharacter, animateCharacter } from './CharacterModel';
import { buildWorld } from './WorldBuilder';
import { buildStructure } from './BuildingBuilder';
import { PhysicsController } from './PhysicsController';
import { CameraRig } from './CameraRig';

export const WORLD_SCALE = 0.08; // 1 map pixel -> 0.08 world units (~12.5px per meter)
const MOVE_EMIT_INTERVAL_MS = 90;
const MINIMAP_EMIT_INTERVAL_MS = 250;
const CULL_TICK_MS = 300;
const HOUSE_RENDER_DIST = 95;
const BUILDING_RENDER_DIST = 190;
const NEARBY_COLLIDABLE_DIST = 40;

function hashAppearanceFromId(id) {
  let h = 0;
  for (let i = 0; i < (id || 'x').length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const skin = ['#f1c39a', '#e0ac69', '#c68863', '#8d5524', '#5a3825'][h % 5];
  const outfit = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4'][(h >> 3) % 6];
  const hair = ['#2b2b2b', '#5a3825', '#7a4a1e', '#c9c9c9', '#8b1e1e'][(h >> 6) % 5];
  const gender = h % 2 === 0 ? 'male' : 'female';
  return { skinTone: skin, outfitColor: outfit, hairColor: hair, gender };
}

export default class GameEngine {
  constructor({ container, mapConfig, character, socket }) {
    this.container = container;
    this.mapConfig = mapConfig;
    this.character = character;
    this.socket = socket;
    this.scale = WORLD_SCALE;

    this.paused = false;
    this.destroyed = false;
    this.currentBuildingType = null;
    this.remotePlayers = new Map();
    this.keys = {};
    this.lastEmitAt = 0;
    this.lastMinimapEmitAt = 0;
    this.lastCullAt = 0;
    this.lastTime = performance.now();

    this._initThree();
    this._initWorld();
    this._initPlayer();
    this._initPhysics();
    this._initCamera();
    this._initInput();
    this._wireSocket();

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);

    this._tick = this._tick.bind(this);
    this.rafId = requestAnimationFrame(this._tick);

    gameEvents.emit('scene:ready');
  }

  // ---------------------------------------------------------------- THREE
  _initThree() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#8fc7e8');
    this.scene.fog = new THREE.Fog('#8fc7e8', 60, 220);

    this.camera = new THREE.PerspectiveCamera(
      70,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      600
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    const hemi = new THREE.HemisphereLight('#cfe8ff', '#3a3f2c', 0.9);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight('#fff3d6', 1.4);
    sun.position.set(40, 70, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 160;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    sun.shadow.bias = -0.0015;
    this.scene.add(sun);
    this.sun = sun;
    this.sunTarget = sun.target;
    this.scene.add(sun.target);
  }

  // ---------------------------------------------------------------- WORLD
  _initWorld() {
    buildWorld(this.scene, this.mapConfig, this.scale);

    this.buildingEntries = [];
    this.houseEntries = [];

    (this.mapConfig.buildings || []).forEach((b) => {
      const { group, footprint } = buildStructure(b, { scale: this.scale, zoneKey: b.zone, kind: 'building' });
      this.scene.add(group);
      this.buildingEntries.push({ data: b, group, footprint });
    });

    (this.mapConfig.houses || []).forEach((h) => {
      const { group, footprint } = buildStructure(h, { scale: this.scale, zoneKey: h.zone, kind: 'house' });
      this.scene.add(group);
      this.houseEntries.push({ data: h, group, footprint });
    });
  }

  // ------------------------------------------------------------- PLAYER
  _initPlayer() {
    const appearance = this.character?.appearance || {};
    const rig = buildCharacter(appearance);
    rig.group.castShadow = true;
    this.scene.add(rig.group);
    this.playerRig = rig;

    this.nameplateEl = null; // nameplate handled by React HUD via minimap/HUD, not needed in-world
  }

  // ------------------------------------------------------------ PHYSICS
  _initPhysics() {
    this.physics = new PhysicsController({ mapConfig: this.mapConfig, scale: this.scale });
    const spawnX = (this.character?.position?.x ?? this.mapConfig.spawnPoint.x) * this.scale;
    const spawnZ = (this.character?.position?.y ?? this.mapConfig.spawnPoint.y) * this.scale;
    this.physics.setSpawn(spawnX, spawnZ);
  }

  // ------------------------------------------------------------- CAMERA
  _initCamera() {
    this.cameraRig = new CameraRig({
      camera: this.camera,
      domElement: this.renderer.domElement,
      scene: this.scene,
      characterGroup: this.playerRig.group,
    });
  }

  // -------------------------------------------------------------- INPUT
  _initInput() {
    this.inputEnabled = true;
    this._onKeyDown = (e) => {
      if (!this.inputEnabled) return;
      this.keys[e.code] = true;
      if (e.code === 'KeyV') {
        const mode = this.cameraRig.toggleMode();
        gameEvents.emit('camera:mode', mode);
      }
    };
    this._onKeyUp = (e) => {
      this.keys[e.code] = false;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  /**
   * Disabled while any React panel/menu/full-map is open, so the
   * character can't be walked around blind behind a modal and the mouse
   * is freed up for clicking UI instead of steering the camera.
   */
  setInputEnabled(enabled) {
    this.inputEnabled = enabled;
    if (!enabled) {
      this.keys = {};
      this.cameraRig?.releasePointerLock();
    }
  }

  // ------------------------------------------------------------- SOCKET
  _wireSocket() {
    if (!this.socket) return;
    const spawnX = this.character?.position?.x ?? this.mapConfig.spawnPoint.x;
    const spawnY = this.character?.position?.y ?? this.mapConfig.spawnPoint.y;

    this.socket.emit('world:join', {
      mapId: this.mapConfig.id,
      displayName: this.character?.displayName,
      x: spawnX,
      y: spawnY,
      appearance: this.character?.appearance,
      gender: this.character?.appearance?.gender || 'male',
    });

    this._onSnapshot = ({ players }) => players.forEach((p) => this.addRemotePlayer(p));
    this._onJoined = (p) => this.addRemotePlayer(p);
    this._onMoved = (p) => this.updateRemotePlayer(p);
    this._onLeft = ({ userId }) => this.removeRemotePlayer(userId);

    this.socket.on('world:snapshot', this._onSnapshot);
    this.socket.on('player:joined', this._onJoined);
    this.socket.on('player:moved', this._onMoved);
    this.socket.on('player:left', this._onLeft);
  }

  addRemotePlayer(p) {
    if (this.remotePlayers.has(p.userId)) return;
    const appearance = p.appearance || hashAppearanceFromId(p.userId);
    const rig = buildCharacter({ ...appearance, gender: appearance.gender || p.gender });
    rig.group.position.set(p.x * this.scale, 0, p.y * this.scale);
    this.scene.add(rig.group);
    this.remotePlayers.set(p.userId, {
      rig,
      targetX: p.x * this.scale,
      targetZ: p.y * this.scale,
      displayName: p.displayName,
    });
  }

  updateRemotePlayer(p) {
    const entry = this.remotePlayers.get(p.userId);
    if (!entry) {
      this.addRemotePlayer(p);
      return;
    }
    entry.targetX = p.x * this.scale;
    entry.targetZ = p.y * this.scale;
  }

  removeRemotePlayer(userId) {
    const entry = this.remotePlayers.get(userId);
    if (!entry) return;
    this.scene.remove(entry.rig.group);
    this.remotePlayers.delete(userId);
  }

  // ---------------------------------------------------------------- LOOP
  _tick(time) {
    if (this.destroyed) return;
    this.rafId = requestAnimationFrame(this._tick);
    if (this.paused) return;

    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    try {
      this._updateMovement(dt, now);
      this._updateRemoteInterpolation();
      this._updateCulling(now);
      this._updateBuildingProximity();

      const pos = this.physics.getPosition();
      this.cameraRig.update({ x: pos.x, y: pos.y - 0.9, z: pos.z }, this._nearbyCollidables || []);
    } catch (err) {
      // A logic error in movement/culling/camera should never prevent the
      // frame from being drawn — surfacing a black screen with silent,
      // endlessly-repeating console errors is much worse for debugging
      // than one visible warning plus a frame that still renders.
      if (!this._loggedTickError) {
        console.error('[GameEngine] tick update error (rendering will continue):', err);
        this._loggedTickError = true;
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  _updateMovement(dt, now) {
    const forward = (this.keys.KeyW || this.keys.ArrowUp ? 1 : 0) - (this.keys.KeyS || this.keys.ArrowDown ? 1 : 0);
    const strafe = (this.keys.KeyD || this.keys.ArrowRight ? 1 : 0) - (this.keys.KeyA || this.keys.ArrowLeft ? 1 : 0);
    const running = !!this.keys.ShiftLeft || !!this.keys.ShiftRight;
    const jumpPressed = !!this.keys.Space;

    this.physics.update(dt, {
      moveX: strafe,
      moveZ: -forward,
      facingYaw: this.cameraRig.facingYaw,
      running,
      jumpPressed,
    });
    if (this.keys.Space) this.keys.Space = false; // single jump per press

    const pos = this.physics.getPosition();
    const feetY = pos.y - 0.875; // PLAYER_HEIGHT/2
    this.playerRig.group.position.set(pos.x, feetY, pos.z);

    const speedMag = Math.hypot(this.physics.velocity.x, this.physics.velocity.z);
    const speedFactor = Math.min(1, speedMag / 6.6);
    animateCharacter(this.playerRig.bones, {
      time: now / 1000,
      speedFactor,
      headPitch: this.cameraRig.mode === 'first' ? 0 : this.cameraRig.pitch,
      isGrounded: this.physics.isGrounded,
    });

    // Multiplayer emit
    if (this.socket && speedMag > 0.05 && now - this.lastEmitAt > MOVE_EMIT_INTERVAL_MS) {
      this.lastEmitAt = now;
      this.socket.emit('player:move', {
        x: pos.x / this.scale,
        y: pos.z / this.scale,
        vx: this.physics.velocity.x,
        vz: this.physics.velocity.z,
        facing: 'down',
      });
    }

    if (now - this.lastMinimapEmitAt > MINIMAP_EMIT_INTERVAL_MS) {
      this.lastMinimapEmitAt = now;
      gameEvents.emit('minimap:update', {
        self: { x: pos.x / this.scale, y: pos.z / this.scale },
        others: Array.from(this.remotePlayers.values()).map((e) => ({
          x: e.targetX / this.scale,
          y: e.targetZ / this.scale,
        })),
      });
    }
  }

  _updateRemoteInterpolation() {
    this.remotePlayers.forEach((entry) => {
      const g = entry.rig.group;
      const dx = entry.targetX - g.position.x;
      const dz = entry.targetZ - g.position.z;
      g.position.x += dx * 0.2;
      g.position.z += dz * 0.2;
      if (Math.hypot(dx, dz) > 0.01) {
        g.rotation.y = Math.atan2(dx, dz);
      }
      animateCharacter(entry.rig.bones, {
        time: performance.now() / 1000,
        speedFactor: Math.min(1, Math.hypot(dx, dz) * 4),
      });
    });
  }

  _updateCulling(now) {
    if (now - this.lastCullAt < CULL_TICK_MS) return;
    this.lastCullAt = now;
    const pos = this.physics.getPosition();

    this.houseEntries.forEach((entry) => {
      const d = Math.hypot(entry.footprint.x - pos.x, entry.footprint.z - pos.z);
      entry.group.visible = d < HOUSE_RENDER_DIST;
    });
    this.buildingEntries.forEach((entry) => {
      const d = Math.hypot(entry.footprint.x - pos.x, entry.footprint.z - pos.z);
      entry.group.visible = d < BUILDING_RENDER_DIST;
    });

    this._nearbyCollidables = [...this.buildingEntries, ...this.houseEntries]
      .filter((e) => {
        const d = Math.hypot(e.footprint.x - pos.x, e.footprint.z - pos.z);
        return d < NEARBY_COLLIDABLE_DIST;
      })
      .map((e) => e.group);

    // Keep the sun's shadow frustum centered near the player so shadows
    // stay sharp anywhere across a 60,000+ pixel-wide map.
    this.sun.position.set(pos.x + 40, pos.y + 70, pos.z + 20);
    this.sunTarget.position.set(pos.x, pos.y, pos.z);
  }

  _updateBuildingProximity() {
    const pos = this.physics.getPosition();
    let nearest = null;
    let nearestDist = Infinity;
    this.buildingEntries.forEach((entry) => {
      const fp = entry.footprint;
      const withinX = Math.abs(pos.x - fp.x) < fp.halfW + 2.2;
      const withinZ = Math.abs(pos.z - fp.z) < fp.halfD + 2.2;
      if (withinX && withinZ) {
        const d = Math.hypot(fp.x - pos.x, fp.z - pos.z);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = entry.data.type;
        }
      }
    });

    if (nearest !== this.currentBuildingType) {
      if (this.currentBuildingType) gameEvents.emit('building:leave', { type: this.currentBuildingType });
      this.currentBuildingType = nearest;
      if (nearest) gameEvents.emit('building:enter', { type: nearest });
    }
  }

  // -------------------------------------------------------------- PUBLIC
  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.lastTime = performance.now();
  }

  _onResize() {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);

    if (this.socket) {
      this.socket.off('world:snapshot', this._onSnapshot);
      this.socket.off('player:joined', this._onJoined);
      this.socket.off('player:moved', this._onMoved);
      this.socket.off('player:left', this._onLeft);
    }

    this.cameraRig?.dispose();
    this.physics?.dispose();

    this.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      }
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
