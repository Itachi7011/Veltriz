import * as THREE from 'three';
import gameEvents from '../gameEvents';
import { buildCharacter, animateCharacter, buildSkateboard, applySkateboardPose, applyCrimePose, applyPhonePose, clearPhonePose, applyGripPose } from './CharacterModel';
import { buildWorld } from './WorldBuilder';
import { buildStructure } from './BuildingBuilder';
import { PhysicsController } from './PhysicsController';
import { CameraRig } from './CameraRig';
import { NpcSystem } from './NpcSystem';
import { WeaponSystem, WEAPON_SLOTS } from './WeaponSystem';
import { VehicleSystem } from './VehicleSystem';
import { BillboardSystem } from './BillboardSystem';
import { WorldEventSystem } from './WorldEventSystem';
import { AudioSystem } from './AudioSystem';

export const WORLD_SCALE = 0.08; // 1 map pixel -> 0.08 world units (~12.5px per meter)
const MOVE_EMIT_INTERVAL_MS = 90;
const MINIMAP_EMIT_INTERVAL_MS = 250;
const CULL_TICK_MS = 300;
const HOUSE_RENDER_DIST = 95;
const BUILDING_RENDER_DIST = 190;
const NEARBY_COLLIDABLE_DIST = 40;
const CRIME_INTERACT_DIST = 3.2;
const BUST_DIST = 1.7;

// Which crime actions require being physically at a matching kind of
// place — this is what turns "crime" from a menu you can click from
// anywhere into something you have to actually walk up to and do.
const CRIME_LOCATIONS = {
  pickpocket: { kind: 'npc' },
  shoplift: { kind: 'building', types: ['market', 'boutique', 'electronics', 'jeweler', 'hardware_store', 'trading_post'] },
  burglary: { kind: 'house' },
  carjack: { kind: 'building', types: ['vehicle_dealer'] },
  smuggling: { kind: 'building', types: ['marina', 'port_authority', 'smugglers_den', 'fishing_wharf'] },
  heist: { kind: 'building', types: ['bank', 'stock_exchange'] },
};

// A simple static "sitting, hands on the wheel/bars" pose, used instead
// of the walk-cycle animation while driving.
function applyDrivingPose(bones) {
  bones.upperLegLeft.rotation.x = 1.35;
  bones.upperLegRight.rotation.x = 1.35;
  bones.lowerLegLeft.rotation.x = -1.15;
  bones.lowerLegRight.rotation.x = -1.15;
  bones.upperArmLeft.rotation.x = -0.95;
  bones.upperArmRight.rotation.x = -0.95;
  bones.forearmLeft.rotation.x = 0.35;
  bones.forearmRight.rotation.x = 0.35;
  bones.hips.rotation.y = 0;
  bones.head.rotation.x = 0;
  bones.neck.rotation.x = 0;
  // Feet rest toe-down on the pegs/pedals, hands wrap around the
  // wheel/handlebar grips — same reasoning as VehicleSystem's copy of
  // this pose for other drivers.
  if (bones.ankleLeft && bones.ankleRight) {
    bones.ankleLeft.rotation.x = 0.3;
    bones.ankleRight.rotation.x = 0.3;
  }
  applyGripPose(bones, 'Left', 0.9);
  applyGripPose(bones, 'Right', 0.9);
}

function hashAppearanceFromId(id) {
  let h = 0;
  for (let i = 0; i < (id || 'x').length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const skin = ['#f1c39a', '#e0ac69', '#c68863', '#8d5524', '#5a3825'][h % 5];
  const outfit = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4'][(h >> 3) % 6];
  const hair = ['#2b2b2b', '#5a3825', '#7a4a1e', '#c9c9c9', '#8b1e1e'][(h >> 6) % 5];
  const gender = h % 2 === 0 ? 'male' : 'female';
  // faceSeed derived from the same hash, so a remote player with no
  // saved appearance still gets a stable, distinct face (same id →
  // same face every time) instead of everyone sharing the default look.
  return { skinTone: skin, outfitColor: outfit, hairColor: hair, gender, faceSeed: h };
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
    this.currentHouseId = null;
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
    this._initNpcs();
    this._initVehicles();
    this._initCamera();
    this._initCivicSystems();
    this._initWeapons();
    this._initInput();
    this._wireSocket();

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);

    this._tick = this._tick.bind(this);
    this.rafId = requestAnimationFrame(this._tick);

    this._onAlertPolice = () => this.alertPoliceNear();
    gameEvents.on('crime:alertPolice', this._onAlertPolice);

    this.crimePoseStartedAt = 0;
    this.crimePoseDurationMs = 0;
    this._onCrimePerforming = ({ durationMs } = {}) => {
      this.crimePoseStartedAt = performance.now();
      this.crimePoseDurationMs = durationMs || 1800;
    };
    gameEvents.on('crime:performing', this._onCrimePerforming);

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
      const { group, footprint, doorHinge, gateHinge } = buildStructure(b, { scale: this.scale, zoneKey: b.zone, kind: 'building' });
      this.scene.add(group);
      this.buildingEntries.push({ data: b, group, footprint, doorHinge, gateHinge, doorOpen: 0, gateOpen: 0 });
    });

    (this.mapConfig.houses || []).forEach((h) => {
      const { group, footprint, doorHinge, gateHinge } = buildStructure(h, { scale: this.scale, zoneKey: h.zone, kind: 'house' });
      this.scene.add(group);
      this.houseEntries.push({ data: h, group, footprint, doorHinge, gateHinge, doorOpen: 0, gateOpen: 0 });
    });
  }

  // ------------------------------------------------------------- PLAYER
  _initPlayer() {
    const appearance = this.character?.appearance || {};
    const rig = buildCharacter(appearance);
    rig.group.castShadow = true;
    this.scene.add(rig.group);
    this.playerRig = rig;

    this.isSkateboarding = false;
    this.skateboardProp = buildSkateboard();
    this.skateboardProp.visible = false;
    this.skateboardProp.position.y = 0.03;
    this.playerRig.group.add(this.skateboardProp);

    this.nameplateEl = null; // nameplate handled by React HUD via minimap/HUD, not needed in-world
  }

  _toggleSkateboard() {
    if (this.isDriving) return;
    this.isSkateboarding = !this.isSkateboarding;
    this.skateboardProp.visible = this.isSkateboarding;
    gameEvents.emit('skateboard:update', this.isSkateboarding);
  }

  // ------------------------------------------------------------ PHYSICS
  _initPhysics() {
    this.physics = new PhysicsController({ mapConfig: this.mapConfig, scale: this.scale });
    const spawnX = (this.character?.position?.x ?? this.mapConfig.spawnPoint.x) * this.scale;
    const spawnZ = (this.character?.position?.y ?? this.mapConfig.spawnPoint.y) * this.scale;
    this.physics.setSpawn(spawnX, spawnZ);
  }

  // ---------------------------------------------------------------- NPCS
  _initNpcs() {
    this.npcSystem = new NpcSystem({
      scene: this.scene,
      mapConfig: this.mapConfig,
      scale: this.scale,
      colliders: this.physics.getColliders(),
    });
    this.currentCrimeOpportunity = null;
    this._bustedAt = 0;
  }

  // ------------------------------------------------------------- VEHICLES
  _initVehicles() {
    this.vehicleSystem = new VehicleSystem({
      scene: this.scene,
      mapConfig: this.mapConfig,
      scale: this.scale,
      colliders: this.physics.getColliders(),
    });
    this.isDriving = false;
    this.currentVehicleNearby = null;
  }

  // -------------------------------------------------------------- CIVIC
  _initCivicSystems() {
    this.billboardSystem = new BillboardSystem({ buildingEntries: this.buildingEntries });
    this.worldEventSystem = new WorldEventSystem({
      npcSystem: this.npcSystem,
      buildingEntries: this.buildingEntries,
      scale: this.scale,
    });
    this.audio = new AudioSystem();
    this.isUsingPhone = false;

    this._onPoliticsStart = ({ type }) => {
      const pos = this.physics.getPosition();
      const started = this.worldEventSystem.start(type, pos.x, pos.z);
      if (!started) {
        gameEvents.emit('subtitle:show', { name: 'System', text: 'Nobody is around here to gather.' });
      }
    };
    gameEvents.on('politics:start', this._onPoliticsStart);

    this._onAudioMuteToggle = (muted) => this.audio.setMuted(muted);
    gameEvents.on('audio:setMuted', this._onAudioMuteToggle);
  }

  openPhone() {
    if (this.isDriving || this.isUsingPhone) return;
    this.isUsingPhone = true;
    applyPhonePose(this.playerRig.bones);
    gameEvents.emit('phone:toggle', true);
  }

  closePhone() {
    if (!this.isUsingPhone) return;
    this.isUsingPhone = false;
    clearPhonePose(this.playerRig.bones);
    // If a weapon is equipped, re-apply its grip curl — closePhone
    // relaxes the right hand for the phone, which would otherwise leave
    // an equipped weapon looking like it's floating in an open palm.
    if (this.weaponSystem && this.weaponSystem.currentKey && this.weaponSystem.currentKey !== 'unarmed') {
      applyGripPose(this.playerRig.bones, 'Right', 1);
    }
    gameEvents.emit('phone:toggle', false);
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

  // ------------------------------------------------------------ WEAPONS
  _initWeapons() {
    this.weaponSystem = new WeaponSystem({
      scene: this.scene,
      camera: this.camera,
      cameraRig: this.cameraRig,
      bones: this.playerRig.bones,
      npcSystem: this.npcSystem,
      playerHeightGetter: () => this.physics.getPosition().y,
      audio: this.audio,
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
      if (e.code === 'KeyR') {
        this.weaponSystem.startReload();
      }
      if (e.code === 'KeyF') {
        this._toggleVehicle();
      }
      if (e.code === 'KeyQ') {
        this._toggleSkateboard();
      }
      if (e.code === 'KeyG' && !this.isDriving) {
        gameEvents.emit('ui:openPolitics');
      }
      if (e.code === 'KeyP') {
        this.openPhone();
      }
      if (e.code === 'KeyH' && this.isDriving) {
        this.audio?.playHorn();
      }
      const slotIndex = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].indexOf(e.code);
      if (slotIndex !== -1 && WEAPON_SLOTS[slotIndex]) {
        this.weaponSystem.equip(WEAPON_SLOTS[slotIndex]);
      }
    };
    this._onKeyUp = (e) => {
      this.keys[e.code] = false;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    // Mouse: left click fires/swings (only once actually pointer-locked,
    // so the very first click — which just requests pointer lock — never
    // also counts as a shot), right click aims/scopes while held.
    this._onMouseDown = (e) => {
      this.audio?.ensureStarted();
      if (!this.inputEnabled) return;
      const locked = document.pointerLockElement === this.renderer.domElement;
      if (!locked) return;
      if (e.button === 0) {
        this._firePressed = true;
      } else if (e.button === 2) {
        this.weaponSystem.setAiming(true);
      }
    };
    this._onMouseUp = (e) => {
      if (e.button === 0) this._firePressed = false;
      if (e.button === 2) this.weaponSystem?.setAiming(false);
    };
    this._onContextMenu = (e) => e.preventDefault();
    this.renderer.domElement.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    this.renderer.domElement.addEventListener('contextmenu', this._onContextMenu);
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
      this._firePressed = false;
      this.weaponSystem?.setAiming(false);
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
      if (!this.isDriving) {
        this._updateBuildingProximity();
        this._updateHouseProximity();
        this._updateCrimeProximity();
      }
      this._updateVehicleProximity();

      const pos = this._getEffectivePosition();
      this.npcSystem.update(dt, { x: pos.x, z: pos.z }, now);
      this.vehicleSystem.update(dt, { x: pos.x, z: pos.z }, now);
      this.worldEventSystem.update(dt, now);
      this.worldEventSystem.maybeAutoStart(now, this._computeMarketTrend());
      this.billboardSystem.update(dt, now);
      this._checkBusted(pos, now);
      this._updateWeapon(dt, pos);
      this._updateDoorsAndGates(pos, dt);
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
    if (this.isDriving) {
      this._updateDriving(dt, now);
      return;
    }

    const forward = (this.keys.KeyW || this.keys.ArrowUp ? 1 : 0) - (this.keys.KeyS || this.keys.ArrowDown ? 1 : 0);
    const strafe = (this.keys.KeyD || this.keys.ArrowRight ? 1 : 0) - (this.keys.KeyA || this.keys.ArrowLeft ? 1 : 0);
    const running = !!this.keys.ShiftLeft || !!this.keys.ShiftRight;
    const jumpPressed = !!this.keys.Space;
    const performingCrime = performance.now() - this.crimePoseStartedAt < this.crimePoseDurationMs;

    this.physics.update(dt, {
      forward: performingCrime ? 0 : forward,
      strafe: performingCrime ? 0 : strafe,
      facingYaw: this.cameraRig.facingYaw,
      running,
      jumpPressed: performingCrime ? false : jumpPressed,
      skateboarding: this.isSkateboarding,
    });
    if (this.keys.Space) {
      this.keys.Space = false; // single jump per press
      if (jumpPressed && !performingCrime) this.audio?.playJump();
    }

    const pos = this.physics.getPosition();
    // The controller's y is already the feet/ground-relative height (0 =
    // standing on the ground, >0 only while jumping) — no center-of-mass
    // offset needed here anymore.
    this.playerRig.group.position.set(pos.x, pos.y, pos.z);

    const speedMag = Math.hypot(this.physics.velocity.x, this.physics.velocity.z);
    if (speedMag > 1 && this.physics.isGrounded) {
      this._footstepTimer = (this._footstepTimer || 0) + dt;
      const interval = Math.max(0.2, 0.55 - speedMag * 0.015);
      if (this._footstepTimer > interval) {
        this._footstepTimer = 0;
        this.audio?.playFootstep();
      }
    }
    const crimePoseElapsed = performance.now() - this.crimePoseStartedAt;
    if (crimePoseElapsed >= 0 && crimePoseElapsed < this.crimePoseDurationMs) {
      applyCrimePose(this.playerRig.bones, crimePoseElapsed / this.crimePoseDurationMs);
    } else if (this.isSkateboarding) {
      const speedFactor = Math.min(1, speedMag / 20);
      applySkateboardPose(this.playerRig.bones, { time: now / 1000, speedFactor });
    } else {
      const speedFactor = Math.min(1, speedMag / 15);
      animateCharacter(this.playerRig.bones, {
        time: now / 1000,
        speedFactor,
        headPitch: this.cameraRig.mode === 'first' ? 0 : this.cameraRig.pitch,
        isGrounded: this.physics.isGrounded,
      });
    }

    this.cameraRig.update({ x: pos.x, y: pos.y, z: pos.z }, this._nearbyCollidables || []);

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
        self: { x: pos.x / this.scale, y: pos.z / this.scale, facing: this.cameraRig.facingYaw },
        others: Array.from(this.remotePlayers.values()).map((e) => ({
          x: e.targetX / this.scale,
          y: e.targetZ / this.scale,
        })),
      });
    }
  }

  // ------------------------------------------------------------ DRIVING
  _toggleVehicle() {
    if (this.isDriving) {
      const exitSpot = this.vehicleSystem.exit();
      this.isDriving = false;
      if (exitSpot) {
        this.physics.setSpawn(exitSpot.x, exitSpot.z);
        this.playerRig.group.rotation.y = exitSpot.heading + Math.PI;
      }
      // Hands were curled around the wheel/handlebar for the drive —
      // relax them back to a normal open/resting hand on foot, unless a
      // weapon is currently equipped, in which case keep gripping it.
      const stillArmed = this.weaponSystem && this.weaponSystem.currentKey && this.weaponSystem.currentKey !== 'unarmed';
      applyGripPose(this.playerRig.bones, 'Left', 0);
      applyGripPose(this.playerRig.bones, 'Right', stillArmed ? 1 : 0);
      gameEvents.emit('vehicle:update', null);
      return;
    }

    const pos = this.physics.getPosition();
    const nearby = this.vehicleSystem.getNearestEnterable(pos);
    if (nearby) {
      this.vehicleSystem.enter(nearby);
      this.isDriving = true;
    } else {
      const jackable = this.vehicleSystem.getNearestJackable(pos);
      if (!jackable) return;
      // Forcing an occupied vehicle to stop and taking it is a
      // carjacking, not just "finding a car" — same distinction the
      // reference game makes, and it plugs into the same heat/police
      // consequence the crime system already uses.
      this.vehicleSystem.carjack(jackable);
      this.isDriving = true;
      gameEvents.emit('crime:alertPolice');
    }
    if (this.isSkateboarding) {
      this.isSkateboarding = false;
      this.skateboardProp.visible = false;
      gameEvents.emit('skateboard:update', false);
    }

    // Clear any on-foot interaction prompts (building/house/crime) so they
    // don't stay stuck on screen while driving away from them.
    if (this.currentBuildingType) {
      gameEvents.emit('building:leave', { type: this.currentBuildingType });
      this.currentBuildingType = null;
    }
    if (this.currentHouseId) {
      gameEvents.emit('house:leave', { id: this.currentHouseId });
      this.currentHouseId = null;
    }
    if (this.currentCrimeOpportunity) {
      this.currentCrimeOpportunity = null;
      gameEvents.emit('crime:opportunity', null);
    }
  }

  _updateVehicleProximity() {
    if (this.isDriving) {
      gameEvents.emit('vehicle:nearby', null);
      return;
    }
    const pos = this.physics.getPosition();
    const nearby = this.vehicleSystem.getNearestEnterable(pos);
    if (nearby) {
      if (this._lastVehicleNearbyLabel !== nearby.def.name || this._lastVehicleNearbyMode !== 'enter') {
        this._lastVehicleNearbyLabel = nearby.def.name;
        this._lastVehicleNearbyMode = 'enter';
        gameEvents.emit('vehicle:nearby', { name: nearby.def.name, mode: 'enter' });
      }
      return;
    }
    const jackable = this.vehicleSystem.getNearestJackable(pos);
    if (jackable) {
      if (this._lastVehicleNearbyLabel !== jackable.def.name || this._lastVehicleNearbyMode !== 'jack') {
        this._lastVehicleNearbyLabel = jackable.def.name;
        this._lastVehicleNearbyMode = 'jack';
        gameEvents.emit('vehicle:nearby', { name: jackable.def.name, mode: 'jack' });
      }
      return;
    }
    if (this._lastVehicleNearbyLabel !== null) {
      this._lastVehicleNearbyLabel = null;
      this._lastVehicleNearbyMode = null;
      gameEvents.emit('vehicle:nearby', null);
    }
  }

  _updateDriving(dt, now) {
    const entry = this.vehicleSystem.drivenEntry;
    if (!entry) {
      this.isDriving = false;
      return;
    }

    const throttle = (this.keys.KeyW || this.keys.ArrowUp ? 1 : 0) - (this.keys.KeyS || this.keys.ArrowDown ? 1 : 0);
    // NOTE: with this game's heading convention (dx=sin(heading),
    // dz=cos(heading), same as CameraRig/PhysicsController), *increasing*
    // heading turns the vehicle to its LEFT, not its right — verified
    // numerically against PhysicsController's already-fixed strafe basis
    // (see that file's comment). So Left/A must be the input that
    // *increases* steer, and Right/D must *decrease* it, for the vehicle
    // to actually turn toward the side the player pressed. This was
    // previously inverted (D/Right turned the vehicle left, A/Left turned
    // it right) — fixed here.
    const steer = (this.keys.KeyA || this.keys.ArrowLeft ? 1 : 0) - (this.keys.KeyD || this.keys.ArrowRight ? 1 : 0);
    const handbrake = !!this.keys.Space;

    entry.controller.update(dt, { throttle, steer, handbrake });
    const t = entry.controller.getTransform();

    this._engineTickTimer = (this._engineTickTimer || 0) + dt;
    if (this._engineTickTimer > 0.4) {
      this._engineTickTimer = 0;
      this.audio?.playEngineTick(Math.min(1, Math.abs(t.speed) / entry.controller.tuning.maxSpeed));
    }

    // Sit the player rig at the vehicle rather than hiding it entirely —
    // the on-foot physics body is left exactly where it was parked and
    // gets restored on exit, this is purely visual.
    this.playerRig.group.position.set(t.x, t.y + entry.seatHeight, t.z);
    this.playerRig.group.visible = true;
    applyDrivingPose(this.playerRig.bones);

    // Camera keeps its normal free-look (mouse yaw/pitch), just orbiting
    // the vehicle's position instead of the on-foot physics position —
    // this is what lets you look around / drive-by shoot while driving
    // in a straight line, same as the reference game.
    this.cameraRig.update({ x: t.x, y: t.y + entry.seatHeight, z: t.z }, this._nearbyCollidables || []);
    // cameraRig.update() just pointed the character rig at the mouse's
    // free-look yaw (correct for on-foot) — override with the vehicle's
    // OWN heading instead, so free-looking around doesn't spin the car.
    this.playerRig.group.rotation.y = t.heading + Math.PI;

    if (this.socket && Math.abs(t.speed) > 0.1 && now - this.lastEmitAt > MOVE_EMIT_INTERVAL_MS) {
      this.lastEmitAt = now;
      this.socket.emit('player:move', { x: t.x / this.scale, y: t.z / this.scale, vx: 0, vz: 0, facing: 'down' });
    }

    if (now - this.lastMinimapEmitAt > MINIMAP_EMIT_INTERVAL_MS) {
      this.lastMinimapEmitAt = now;
      gameEvents.emit('minimap:update', {
        self: { x: t.x / this.scale, y: t.z / this.scale, facing: this.cameraRig.facingYaw },
        others: Array.from(this.remotePlayers.values()).map((e) => ({ x: e.targetX / this.scale, y: e.targetZ / this.scale })),
      });
    }

    gameEvents.emit('vehicle:update', {
      name: entry.def.name,
      kind: entry.kind,
      speedKmh: Math.round(Math.abs(t.speed) * 3.6),
      reversing: t.speed < -0.1,
    });
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

  /** Vehicle position while driving, on-foot physics position otherwise — used anywhere "where is the player" matters (culling, NPC streaming, minimap, etc). */
  _getEffectivePosition() {
    if (this.isDriving && this.vehicleSystem.drivenEntry) {
      return this.vehicleSystem.drivenEntry.controller.getTransform();
    }
    return this.physics.getPosition();
  }

  _updateCulling(now) {
    if (now - this.lastCullAt < CULL_TICK_MS) return;
    this.lastCullAt = now;
    const pos = this._getEffectivePosition();

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

    this.npcSystem.applyCulling(pos, HOUSE_RENDER_DIST);
    this.vehicleSystem.applyCulling(pos, BUILDING_RENDER_DIST);

    // Keep the sun's shadow frustum centered near the player so shadows
    // stay sharp anywhere across a 60,000+ pixel-wide map.
    this.sun.position.set(pos.x + 40, pos.y + 70, pos.z + 20);
    this.sunTarget.position.set(pos.x, pos.y, pos.z);
  }

  /**
   * Swings each building's front door — and each house's yard gate —
   * open as the player nears it, and eases them back closed as they
   * leave. Purely visual (see addFenceAndGate/doorHinge in
   * BuildingBuilder.js: neither is a physics collider), driven off the
   * same footprint data every other proximity check already uses, so it
   * can't desync from or interfere with the existing building/crime
   * interaction prompts.
   */
  _updateDoorsAndGates(pos, dt) {
    const DOOR_OPEN_DIST = 3.2;
    const GATE_OPEN_DIST = 5.5;
    const DOOR_OPEN_ANGLE = -1.75; // ~100°, swings inward
    const GATE_OPEN_ANGLE = -1.9; // ~109°, swings inward off the path
    const SWING_SPEED = 3.2; // rad/s-ish ease rate

    const animateHinge = (hinge, openTarget, angle) => {
      const target = openTarget ? angle : 0;
      hinge.rotation.y += (target - hinge.rotation.y) * Math.min(1, dt * SWING_SPEED);
    };

    [...this.buildingEntries, ...this.houseEntries].forEach((entry) => {
      if (!entry.doorHinge && !entry.gateHinge) return;
      // Skip anything not currently rendered (culled far away) — no
      // point animating a hinge nobody can see, and this keeps the cost
      // of this pass tied to the already-culled visible set.
      if (!entry.group.visible) return;

      const fp = entry.footprint;
      const d = Math.hypot(fp.x - pos.x, fp.z - pos.z);

      if (entry.doorHinge) animateHinge(entry.doorHinge, d < DOOR_OPEN_DIST + fp.halfD, DOOR_OPEN_ANGLE);
      if (entry.gateHinge) animateHinge(entry.gateHinge, d < GATE_OPEN_DIST + fp.halfD, GATE_OPEN_ANGLE);
    });
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

  /**
   * Same proximity pattern as _updateBuildingProximity above, but for the
   * 100+ individually-owned houses (houseEntries) rather than the shared
   * building types — each one is identified by its own id/name (see
   * house:enter's payload) since, unlike a building `type`, there's no
   * single shared UI panel keyed by type for these; GamePage opens
   * HousePanel with whichever house id/name it's given.
   */
  _updateHouseProximity() {
    const pos = this.physics.getPosition();
    let nearest = null;
    let nearestDist = Infinity;
    this.houseEntries.forEach((entry) => {
      const fp = entry.footprint;
      const withinX = Math.abs(pos.x - fp.x) < fp.halfW + 2.2;
      const withinZ = Math.abs(pos.z - fp.z) < fp.halfD + 2.2;
      if (withinX && withinZ) {
        const d = Math.hypot(fp.x - pos.x, fp.z - pos.z);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = entry.data;
        }
      }
    });

    const nearestId = nearest ? nearest.id : null;
    if (nearestId !== this.currentHouseId) {
      if (this.currentHouseId) gameEvents.emit('house:leave', { id: this.currentHouseId });
      this.currentHouseId = nearestId;
      if (nearest) gameEvents.emit('house:enter', { id: nearest.id, name: nearest.name });
    }
  }

  // ---------------------------------------------------------------- WEAPON
  _updateWeapon(dt, pos) {
    this.weaponSystem.update(dt);
    if (this._firePressed) {
      if (this.weaponSystem.isAutomaticNow()) {
        this.weaponSystem.tryFire({ x: pos.x, z: pos.z });
      } else if (!this._fireHandledForThisPress) {
        this.weaponSystem.tryFire({ x: pos.x, z: pos.z });
        this._fireHandledForThisPress = true;
      }
    } else {
      this._fireHandledForThisPress = false;
    }
  }

  /** @returns {number|null} average % change of stock-category items right now, or null if no data yet */
  _computeMarketTrend() {
    const items = this.billboardSystem?.marketItems?.filter((i) => i.category === 'stock');
    if (!items || !items.length) return null;
    const changes = items.map((i) => ((i.currentPrice - i.previousPrice) / i.previousPrice) * 100);
    return changes.reduce((a, b) => a + b, 0) / changes.length;
  }

  // ----------------------------------------------------------- CRIME
  /**
   * Finds the nearest matching physical location for each crime action
   * (a shop for shoplifting, a house for burglary, a wandering NPC for
   * pickpocketing, etc.) and emits 'crime:opportunity' only when the
   * player is actually standing at one — this is what CrimePanel uses to
   * only let you attempt a crime you're physically at, instead of any
   * crime from anywhere.
   */
  _updateCrimeProximity() {
    const pos = this.physics.getPosition();
    let found = null;

    for (const [actionKey, loc] of Object.entries(CRIME_LOCATIONS)) {
      if (loc.kind === 'building') {
        for (const entry of this.buildingEntries) {
          if (!loc.types.includes(entry.data.type)) continue;
          const fp = entry.footprint;
          const d = Math.hypot(fp.x - pos.x, fp.z - pos.z);
          if (d < Math.max(CRIME_INTERACT_DIST, fp.halfW + 1.5, fp.halfD + 1.5)) {
            found = { actionKey, label: entry.data.name };
            break;
          }
        }
      } else if (loc.kind === 'house') {
        for (const entry of this.houseEntries) {
          const fp = entry.footprint;
          const d = Math.hypot(fp.x - pos.x, fp.z - pos.z);
          if (d < Math.max(CRIME_INTERACT_DIST, fp.halfW + 1.2, fp.halfD + 1.2)) {
            found = { actionKey, label: entry.data.name };
            break;
          }
        }
      } else if (loc.kind === 'npc') {
        const nearestCivilian = this.npcSystem.active.find((n) => {
          if (n.role !== 'civilian') return false;
          const d = Math.hypot(n.rig.group.position.x - pos.x, n.rig.group.position.z - pos.z);
          return d < CRIME_INTERACT_DIST;
        });
        if (nearestCivilian) found = { actionKey, label: 'a passerby' };
      }
      if (found) break;
    }

    const changed = found?.actionKey !== this.currentCrimeOpportunity?.actionKey;
    if (changed) {
      this.currentCrimeOpportunity = found;
      gameEvents.emit('crime:opportunity', found);
    }
  }

  _checkBusted(pos, now) {
    if (now - this._bustedAt < 15000) return; // cooldown so it can't spam-fire
    const chaser = this.npcSystem.getNearestPolice({ x: pos.x, z: pos.z }, BUST_DIST);
    if (chaser && chaser.chasing) {
      this._bustedAt = now;
      this.npcSystem.alertedUntil = 0;
      gameEvents.emit('crime:busted');
      this.audio?.playBusted();
    }
  }

  /** Called by the crime UI after a risky/failed attempt to send nearby police after the player. */
  alertPoliceNear() {
    const pos = this.physics.getPosition();
    this.npcSystem.alertNear(pos.x, pos.z);
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
    window.removeEventListener('mouseup', this._onMouseUp);
    this.renderer.domElement.removeEventListener('mousedown', this._onMouseDown);
    this.renderer.domElement.removeEventListener('contextmenu', this._onContextMenu);

    if (this.socket) {
      this.socket.off('world:snapshot', this._onSnapshot);
      this.socket.off('player:joined', this._onJoined);
      this.socket.off('player:moved', this._onMoved);
      this.socket.off('player:left', this._onLeft);
    }
    gameEvents.off('crime:alertPolice', this._onAlertPolice);
    gameEvents.off('crime:performing', this._onCrimePerforming);
    gameEvents.off('politics:start', this._onPoliticsStart);
    gameEvents.off('audio:setMuted', this._onAudioMuteToggle);

    this.cameraRig?.dispose();
    this.physics?.dispose();
    this.npcSystem?.dispose();
    this.weaponSystem?.dispose();
    this.vehicleSystem?.dispose();
    this.billboardSystem?.dispose();
    this.worldEventSystem?.dispose();
    this.audio?.dispose();

    this.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          // Defensive: only dispose things that are actually disposable —
          // see the matching comment in CharacterPreview3D.jsx.
          if (m?.map && typeof m.map.dispose === 'function') m.map.dispose();
          if (typeof m?.dispose === 'function') m.dispose();
        });
      }
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
