import * as THREE from 'three';
import gameEvents from '../gameEvents';

/**
 * Held tools and weapons.
 *
 * Fictional-game scope note: this is standard game-combat mechanics (a
 * numeric health value, a raycast hit check, a damage number) — the same
 * kind of system in any open-world game with a weapon. It intentionally
 * only ever applies damage to the client-side NPC population (see
 * NpcSystem.js), never to another real player's character: doing real
 * damage to another person's account from a raycast on YOUR OWN client
 * would mean trusting your client to police everyone else, which is a
 * cheating/griefing hole, not a physics problem — that needs a
 * server-authoritative hit-registration service, which is out of scope
 * for a client-side patch. Other players will visibly see what you have
 * equipped and see you swing/fire it, but only NPCs actually take damage.
 *
 * Visuals are deliberately simple procedural low-poly shapes (boxes,
 * cylinders) in the same style as the rest of the world — recognizable
 * silhouettes, not detailed real-world schematics.
 */

const WEAPON_DEFS = {
  unarmed: { name: 'Fists', type: 'melee', damage: 8, range: 1.4, cooldown: 0.5, arcDeg: 70 },
  hammer: { name: 'Hammer', type: 'melee', damage: 22, range: 1.7, cooldown: 0.7, arcDeg: 60 },
  pistol: {
    name: 'Pistol', type: 'ranged', damage: 18, cooldown: 0.22, magSize: 12, reserveMax: 84,
    reloadTime: 1.1, spread: 0.02, automatic: false, recoil: 0.014,
  },
  smg: {
    name: 'SMG', type: 'ranged', damage: 11, cooldown: 0.09, magSize: 30, reserveMax: 180,
    reloadTime: 1.6, spread: 0.045, automatic: true, recoil: 0.009,
  },
  rifle: {
    name: 'Rifle', type: 'ranged', damage: 26, cooldown: 0.13, magSize: 25, reserveMax: 150,
    reloadTime: 1.9, spread: 0.02, automatic: true, recoil: 0.016,
  },
  sniper: {
    name: 'Sniper Rifle', type: 'ranged', damage: 95, cooldown: 1.1, magSize: 5, reserveMax: 30,
    reloadTime: 2.4, spread: 0.006, automatic: false, recoil: 0.05, scoped: true, zoomFov: 18,
  },
};

export const WEAPON_SLOTS = ['unarmed', 'hammer', 'pistol', 'smg', 'rifle', 'sniper'];

// ---- Procedural low-poly weapon/tool models -------------------------------

function metalMat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.6, ...extra });
}
function gripMat() {
  return new THREE.MeshStandardMaterial({ color: '#2b2015', roughness: 0.8 });
}

function buildHammerMesh() {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.34, 8), gripMat());
  handle.rotation.z = Math.PI / 2;
  handle.position.x = 0.05;
  g.add(handle);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.05), metalMat('#8a8f9c'));
  head.position.set(0.22, 0, 0);
  g.add(head);
  const claw = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 4), metalMat('#8a8f9c'));
  claw.rotation.z = Math.PI / 2;
  claw.position.set(0.15, 0, 0);
  g.add(claw);
  return g;
}

function buildGunMesh({ bodyLen, bodyH, hasStock, hasMag, hasScope, barrelLen, hasForegrip }) {
  const g = new THREE.Group();
  const bodyMat = metalMat('#2f333d');

  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyLen, bodyH, 0.06), bodyMat);
  g.add(body);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, barrelLen, 8), metalMat('#1b1e26'));
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(bodyLen / 2 + barrelLen / 2 - 0.02, bodyH * 0.15, 0);
  g.add(barrel);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.13, 0.045), gripMat());
  grip.position.set(-bodyLen * 0.18, -bodyH * 0.55, 0);
  grip.rotation.z = 0.25;
  g.add(grip);

  const trigger = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 10), bodyMat);
  trigger.position.set(-bodyLen * 0.05, -bodyH * 0.35, 0);
  g.add(trigger);

  if (hasMag) {
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.04), metalMat('#1b1e26'));
    mag.position.set(-bodyLen * 0.05, -bodyH * 0.75, 0);
    mag.rotation.z = 0.12;
    g.add(mag);
  }

  if (hasStock) {
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.22, bodyH * 0.7, 0.05), gripMat());
    stock.position.set(-bodyLen / 2 - 0.09, -bodyH * 0.08, 0);
    g.add(stock);
  }

  if (hasForegrip) {
    const fg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.035), gripMat());
    fg.position.set(bodyLen * 0.22, -bodyH * 0.55, 0);
    g.add(fg);
  }

  if (hasScope) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(bodyLen * 0.5, 0.02, 0.03), bodyMat);
    rail.position.set(0, bodyH * 0.55, 0);
    g.add(rail);
    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.22, 10), metalMat('#111318'));
    scopeTube.rotation.z = Math.PI / 2;
    scopeTube.position.set(0.02, bodyH * 0.75, 0);
    g.add(scopeTube);
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.027, 0.027, 0.01, 12),
      new THREE.MeshStandardMaterial({ color: '#0ea5e9', emissive: '#0ea5e9', emissiveIntensity: 0.6, roughness: 0.1 })
    );
    lens.rotation.z = Math.PI / 2;
    lens.position.set(0.02 + 0.115, bodyH * 0.75, 0);
    g.add(lens);
    const bipod = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.02), bodyMat);
    bipod.position.set(bodyLen * 0.35, -bodyH * 0.85, 0.04);
    bipod.rotation.z = 0.3;
    g.add(bipod);
    const bipod2 = bipod.clone();
    bipod2.position.z = -0.04;
    bipod2.rotation.z = -0.3;
    g.add(bipod2);
  }

  // muzzle flash anchor + flash sprite, hidden by default
  const muzzle = new THREE.Object3D();
  muzzle.position.set(bodyLen / 2 + barrelLen - 0.02, bodyH * 0.15, 0);
  g.add(muzzle);
  const flashMat = new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.95 });
  const flash = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 6), flashMat);
  flash.rotation.z = -Math.PI / 2;
  flash.position.x = 0.07;
  flash.visible = false;
  muzzle.add(flash);
  g.userData.muzzle = muzzle;
  g.userData.flash = flash;

  return g;
}

const MODEL_BUILDERS = {
  hammer: buildHammerMesh,
  pistol: () => buildGunMesh({ bodyLen: 0.16, bodyH: 0.1, hasStock: false, hasMag: true, hasScope: false, barrelLen: 0.08, hasForegrip: false }),
  smg: () => buildGunMesh({ bodyLen: 0.28, bodyH: 0.1, hasStock: true, hasMag: true, hasScope: false, barrelLen: 0.1, hasForegrip: true }),
  rifle: () => buildGunMesh({ bodyLen: 0.42, bodyH: 0.11, hasStock: true, hasMag: true, hasScope: false, barrelLen: 0.26, hasForegrip: true }),
  sniper: () => buildGunMesh({ bodyLen: 0.5, bodyH: 0.1, hasStock: true, hasMag: true, hasScope: true, barrelLen: 0.42, hasForegrip: true }),
};

// Per-weapon local transform so it sits naturally in the grip anchor
// (which is already oriented into the palm) instead of floating at an
// odd angle.
const GRIP_TRANSFORM = {
  hammer: { pos: [0, 0, 0], rot: [0, Math.PI / 2, 0], scale: 1 },
  pistol: { pos: [0, 0.02, 0.04], rot: [0, Math.PI / 2, 0], scale: 1 },
  smg: { pos: [0, 0.02, 0.02], rot: [0, Math.PI / 2, 0], scale: 1 },
  rifle: { pos: [0, 0.02, 0.02], rot: [0, Math.PI / 2, 0], scale: 1 },
  sniper: { pos: [0, 0.02, 0.02], rot: [0, Math.PI / 2, 0], scale: 1 },
};

export class WeaponSystem {
  constructor({ scene, camera, cameraRig, bones, npcSystem, playerHeightGetter }) {
    this.scene = scene;
    this.camera = camera;
    this.cameraRig = cameraRig;
    this.bones = bones;
    this.npcSystem = npcSystem;
    this.getPlayerY = playerHeightGetter;

    this.currentKey = 'unarmed';
    this.worldItem = null;
    this.viewModel = null;

    this.magAmmo = 0;
    this.reserveAmmo = 0;
    this.cooldownRemaining = 0;
    this.reloadRemaining = 0;
    this.isReloading = false;
    this.isAiming = false;
    this.meleeSwingT = 0;
    this._baseFov = camera.fov;
    this._targetFov = camera.fov;

    this._recentHits = [];

    this.raycaster = new THREE.Raycaster();
    this.raycaster.camera = camera;

    this.equip('unarmed');
  }

  equip(key) {
    if (!WEAPON_DEFS[key]) return;
    if (this.worldItem) {
      this.worldItem.parent?.remove(this.worldItem);
      this.worldItem = null;
    }
    if (this.viewModel) {
      this.camera.remove(this.viewModel);
      this.viewModel = null;
    }

    this.currentKey = key;
    const def = WEAPON_DEFS[key];
    this.isReloading = false;
    this.reloadRemaining = 0;
    this.isAiming = false;
    this._targetFov = this._baseFov;

    if (key !== 'unarmed') {
      const builder = MODEL_BUILDERS[key];
      const transform = GRIP_TRANSFORM[key] || { pos: [0, 0, 0], rot: [0, 0, 0], scale: 1 };

      const worldModel = builder();
      worldModel.position.set(...transform.pos);
      worldModel.rotation.set(...transform.rot);
      worldModel.scale.setScalar(transform.scale);
      this.bones.gripRight.add(worldModel);
      this.worldItem = worldModel;

      // Separate camera-attached viewmodel: the whole character (and
      // anything parented to it, including the world item above) is
      // hidden in first-person mode, so without this you'd be holding an
      // invisible weapon while looking down the sights.
      const vm = builder();
      vm.scale.setScalar(1.35);
      vm.position.set(0.16, -0.14, -0.32);
      vm.rotation.set(0, Math.PI / 2 + 0.05, 0);
      vm.visible = this.cameraRig.mode === 'first';
      this.camera.add(vm);
      this.viewModel = vm;
    }

    if (def.type === 'ranged') {
      this.magAmmo = def.magSize;
      this.reserveAmmo = def.reserveMax;
    } else {
      this.magAmmo = 0;
      this.reserveAmmo = 0;
    }

    this._emitStatus();
  }

  _emitStatus() {
    const def = WEAPON_DEFS[this.currentKey];
    gameEvents.emit('weapon:update', {
      key: this.currentKey,
      name: def.name,
      type: def.type,
      magAmmo: this.magAmmo,
      reserveAmmo: this.reserveAmmo,
      isReloading: this.isReloading,
      isAiming: this.isAiming,
      scoped: !!def.scoped,
    });
  }

  startReload() {
    const def = WEAPON_DEFS[this.currentKey];
    if (def.type !== 'ranged' || this.isReloading) return;
    if (this.magAmmo >= def.magSize || this.reserveAmmo <= 0) return;
    this.isReloading = true;
    this.reloadRemaining = def.reloadTime;
    this._emitStatus();
  }

  isAutomaticNow() {
    const def = WEAPON_DEFS[this.currentKey];
    return def.type === 'ranged' && !!def.automatic;
  }

  setAiming(aiming) {
    const def = WEAPON_DEFS[this.currentKey];
    this.isAiming = aiming && def.type === 'ranged';
    this._targetFov = this.isAiming && def.scoped ? def.zoomFov : this._baseFov;
    if (this.viewModel) this.viewModel.visible = this.cameraRig.mode === 'first' && !(this.isAiming && def.scoped);
    this._emitStatus();
  }

  /** Called every frame regardless of input, to tick cooldowns/reload/fov/flash. */
  update(dt) {
    if (this.cooldownRemaining > 0) this.cooldownRemaining -= dt;

    if (this.isReloading) {
      this.reloadRemaining -= dt;
      if (this.reloadRemaining <= 0) {
        const def = WEAPON_DEFS[this.currentKey];
        const needed = def.magSize - this.magAmmo;
        const take = Math.min(needed, this.reserveAmmo);
        this.magAmmo += take;
        this.reserveAmmo -= take;
        this.isReloading = false;
        this._emitStatus();
      }
    }

    // Smooth FOV zoom for the sniper scope.
    if (Math.abs(this.camera.fov - this._targetFov) > 0.05) {
      this.camera.fov += (this._targetFov - this.camera.fov) * Math.min(1, dt * 12);
      this.camera.updateProjectionMatrix();
    }

    if (this.viewModel) {
      const def = WEAPON_DEFS[this.currentKey];
      this.viewModel.visible = this.cameraRig.mode === 'first' && !(this.isAiming && def.scoped);
    }

    if (this.meleeSwingT > 0) {
      this.meleeSwingT = Math.max(0, this.meleeSwingT - dt);
      const t = this.meleeSwingT / 0.35;
      const swing = Math.sin(t * Math.PI) * 1.1;
      this.bones.upperArmRight.rotation.x = -swing;
      this.bones.forearmRight.rotation.x = -swing * 0.4;
    }

    if (this._flashUntil && performance.now() > this._flashUntil) {
      if (this.worldItem?.userData?.flash) this.worldItem.userData.flash.visible = false;
      if (this.viewModel?.userData?.flash) this.viewModel.userData.flash.visible = false;
      this._flashUntil = null;
    }

    // Old hit-window entries expire — used only for the "too much
    // violence too fast draws police" escalation, not for damage math.
    const cutoff = performance.now() - 8000;
    this._recentHits = this._recentHits.filter((t) => t > cutoff);
  }

  /** @returns {boolean} whether a shot/swing actually happened (for UI feedback) */
  tryFire(playerPos) {
    const def = WEAPON_DEFS[this.currentKey];
    if (!def) return false;

    if (def.type === 'melee') {
      if (this.cooldownRemaining > 0) return false;
      this.cooldownRemaining = def.cooldown;
      this.meleeSwingT = 0.35;
      return this._resolveMelee(def, playerPos);
    }

    if (this.isReloading || this.cooldownRemaining > 0) return false;
    if (this.magAmmo <= 0) {
      this.startReload();
      return false;
    }
    this.cooldownRemaining = def.cooldown;
    this.magAmmo -= 1;
    this._emitStatus();
    this._muzzleFlash();
    this.cameraRig.addRecoil(def.recoil * (this.isAiming ? 0.5 : 1), (Math.random() - 0.5) * def.recoil * 0.4);
    return this._resolveHitscan(def);
  }

  _muzzleFlash() {
    [this.worldItem, this.viewModel].forEach((m) => {
      const flash = m?.userData?.flash;
      if (flash) flash.visible = true;
    });
    this._flashUntil = performance.now() + 45;
  }

  _resolveMelee(def, playerPos) {
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const arcCos = Math.cos((def.arcDeg * Math.PI) / 360);

    let hitAny = false;
    this.npcSystem.active.forEach((npc) => {
      if (npc.downedUntil > performance.now()) return;
      const toNpc = new THREE.Vector3(npc.rig.group.position.x - playerPos.x, 0, npc.rig.group.position.z - playerPos.z);
      const dist = toNpc.length();
      if (dist > def.range || dist < 0.01) return;
      toNpc.normalize();
      const dot = forward.x * toNpc.x + forward.z * toNpc.z;
      if (dot < arcCos) return;
      this._applyHit(npc, def.damage);
      hitAny = true;
    });
    return hitAny;
  }

  _resolveHitscan(def) {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);

    if (!this.isAiming && def.spread > 0) {
      dir.x += (Math.random() - 0.5) * def.spread;
      dir.y += (Math.random() - 0.5) * def.spread;
      dir.z += (Math.random() - 0.5) * def.spread;
      dir.normalize();
    }

    this.raycaster.set(this.camera.getWorldPosition(new THREE.Vector3()), dir);
    this.raycaster.far = 200;
    const targets = this.npcSystem.getHittableGroups();
    const hits = this.raycaster.intersectObjects(targets, true);
    if (!hits.length) return true;

    const npc = hits[0].object.userData.npcEntry;
    if (npc) this._applyHit(npc, def.damage);
    return true;
  }

  _applyHit(npc, damage) {
    this.npcSystem.applyDamage(npc, damage);
    this._recentHits.push(performance.now());
    gameEvents.emit('weapon:hit', { downed: npc.hp <= 0 });

    // Escalation: a couple of hits in a short window, or any takedown,
    // is exactly the kind of thing that should draw police attention —
    // reuses the same chase mechanic the crime system uses.
    if (npc.hp <= 0 || this._recentHits.length >= 3) {
      gameEvents.emit('crime:alertPolice');
    }
  }

  dispose() {
    if (this.worldItem) this.worldItem.parent?.remove(this.worldItem);
    if (this.viewModel) this.camera.remove(this.viewModel);
    this.camera.fov = this._baseFov;
    this.camera.updateProjectionMatrix();
  }
}

export { WEAPON_DEFS };
