import { buildCharacter, animateCharacter, applyPhonePose, clearPhonePose, SKIN_TONES, HAIR_COLORS, HAIR_STYLES } from './CharacterModel';
import gameEvents from '../gameEvents';

const AMBIENT_PHRASES = [
  'Nice day out, isn\u2019t it?',
  'Excuse me.',
  'Watch it!',
  'Have a good one.',
  'Long day at work.',
  'Is that the new SUV?',
  'Did you hear about the rally downtown?',
  'Careful, it\u2019s slippery.',
];

/**
 * Ambient pedestrian population.
 *
 * Honest scope note: simulation-service's `Npc` records are abstract
 * economic actors (a job, a wealth number, a personality vector) with no
 * position at all — they were never meant to be rendered, and giving them
 * real synced positions/movement across every client would mean building
 * a full server-authoritative crowd simulation (a project on its own).
 * What was actually missing and reported ("I can't see any of them") is a
 * LIVING WORLD — people visibly walking around. This system provides
 * that: a client-side population that spawns/despawns as you move (so an
 * arbitrarily large map only ever costs what's near you), each one
 * randomized in gender, skin tone, hair, outfit, and a height/build
 * variance standing in for age, with simple wander AI that avoids walking
 * through buildings.
 *
 * A small fraction are tagged `role: 'police'`, spawned near police
 * stations, in uniform colors — used by the crime system's chase/bust
 * mechanic (see GameEngine's crime handling).
 */

const ACTIVE_TARGET = 34;
const SPAWN_RADIUS = [22, 95];
const DESPAWN_RADIUS = 130;
const WANDER_RADIUS = 14;
const WALK_SPEED = 1.15;
const POLICE_CHASE_SPEED = 3.6;
const POLICE_FRACTION = 0.12;
const RETRY_SPAWN_ATTEMPTS = 10;

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomAppearance(role) {
  const gender = Math.random() < 0.5 ? 'male' : 'female';
  // Height/build variance stands in for age — shorter+smaller reads as
  // younger, taller+bigger as an older adult, without new geometry.
  const buildScale = 0.86 + Math.random() * 0.28;
  const isElderly = buildScale > 1.08 && Math.random() < 0.4;

  if (role === 'police') {
    return {
      gender,
      skinTone: randomFrom(SKIN_TONES),
      hairColor: isElderly ? '#c9c9c9' : randomFrom(HAIR_COLORS),
      hairStyle: randomFrom(['short', 'buzz']),
      outfitColor: '#1e3a8a',
      pantsColor: '#111827',
      shoeColor: '#0b0e14',
      buildScale,
      // A fresh random seed per spawn — without this, two police NPCs
      // that happen to roll the same skin/hair/outfit combo (common,
      // since the uniform locks most of the palette) would render with
      // literally the same face. Biased toward square/long archetypes so
      // police as a group read as a bit more square-jawed/stern than the
      // general population, while any two individual officers still look
      // like different people.
      faceSeed: Math.floor(Math.random() * 2 ** 31),
      faceArchetypePool: ['square', 'long', 'oval'],
    };
  }

  return {
    gender,
    skinTone: randomFrom(SKIN_TONES),
    hairColor: isElderly ? '#c9c9c9' : randomFrom(HAIR_COLORS),
    hairStyle: randomFrom(HAIR_STYLES),
    outfitColor: randomFrom(['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#94a3b8', '#f97316', '#14b8a6']),
    pantsColor: randomFrom(['#232842', '#1f2937', '#3f3f46', '#44403c']),
    buildScale,
    // Civilians draw from every archetype, unrestricted — this is the
    // general population, so it should look like one.
    faceSeed: Math.floor(Math.random() * 2 ** 31),
  };
}

export class NpcSystem {
  constructor({ scene, mapConfig, scale, colliders }) {
    this.scene = scene;
    this.mapConfig = mapConfig;
    this.scale = scale;
    this.colliders = colliders; // shared building/house collision list from PhysicsController
    this.active = [];
    this._lastMaintainAt = 0;

    this.policeAnchors = (mapConfig.buildings || [])
      .filter((b) => b.type === 'police_station')
      .map((b) => ({ x: b.x * scale, z: b.y * scale }));

    this.alertedUntil = 0;
    this.alertOrigin = null;
    this._lastAmbientChatterAt = 0;
  }

  _blockedAt(x, z, radius = 0.32) {
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
      if (!this._blockedAt(x, z, 0.6)) return { x, z };
    }
    return null;
  }

  _pickWanderTarget(anchor) {
    for (let i = 0; i < RETRY_SPAWN_ATTEMPTS; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * WANDER_RADIUS;
      const x = anchor.x + Math.cos(angle) * dist;
      const z = anchor.z + Math.sin(angle) * dist;
      if (!this._blockedAt(x, z, 0.4)) return { x, z };
    }
    return { ...anchor };
  }

  _spawnOne(playerPos) {
    const isPolice = this.policeAnchors.length > 0 && Math.random() < POLICE_FRACTION;
    let spawn;
    if (isPolice && Math.random() < 0.6) {
      const anchor = randomFrom(this.policeAnchors);
      spawn = { x: anchor.x + (Math.random() - 0.5) * 8, z: anchor.z + (Math.random() - 0.5) * 8 };
    } else {
      spawn = this._pickSpawnPoint(playerPos);
    }
    if (!spawn) return;

    const appearance = randomAppearance(isPolice ? 'police' : 'civilian');
    const rig = buildCharacter(appearance);
    rig.group.position.set(spawn.x, 0, spawn.z);
    this.scene.add(rig.group);

    const entry = {
      rig,
      role: isPolice ? 'police' : 'civilian',
      anchor: { ...spawn },
      target: this._pickWanderTarget(spawn),
      idleUntil: 0,
      speed: WALK_SPEED * (0.8 + Math.random() * 0.4),
      hp: 100,
      maxHp: 100,
      downedUntil: 0,
    };

    // Tag every mesh in the rig so a raycast hit can be traced back to
    // the NPC that owns it (see WeaponSystem.fire()).
    rig.group.traverse((obj) => {
      if (obj.isMesh) obj.userData.npcEntry = entry;
    });

    this.active.push(entry);
  }

  /**
   * Applies damage to an NPC (from WeaponSystem). Non-graphic by design —
   * a health bar depleting and a "down" pose, no gore. Below 0 HP the NPC
   * goes down for a while, stops being interactive, then is removed and
   * a fresh one eventually spawns elsewhere, same as any other despawn.
   */
  applyDamage(npc, amount) {
    if (npc.downedUntil > performance.now()) return;
    npc.hp = Math.max(0, npc.hp - amount);
    npc.hitFlashUntil = performance.now() + 120;
    if (npc.hp <= 0) {
      npc.downedUntil = performance.now() + 6000;
      npc.rig.group.rotation.x = Math.PI / 2.1;
      npc.chasing = false;
    }
  }

  /** Called by the crime system when a police-eligible bust condition fires. */
  alertNear(x, z) {
    this.alertedUntil = performance.now() + 12000;
    this.alertOrigin = { x, z };
  }

  update(dt, playerPos, now) {
    // Spawn/despawn maintenance runs a few times a second, not every
    // frame — it's cheap, but no need to run it 60x/sec.
    if (now - this._lastMaintainAt > 400) {
      this._lastMaintainAt = now;
      this.active = this.active.filter((npc) => {
        if (npc.dead) return false;
        const d = Math.hypot(npc.rig.group.position.x - playerPos.x, npc.rig.group.position.z - playerPos.z);
        if (d > DESPAWN_RADIUS) {
          this.scene.remove(npc.rig.group);
          return false;
        }
        return true;
      });
      while (this.active.length < ACTIVE_TARGET) {
        const before = this.active.length;
        this._spawnOne(playerPos);
        if (this.active.length === before) break; // couldn't find a spot this pass
      }
    }

    const chasing = now < this.alertedUntil;

    // Ambient chatter: every so often, if a civilian is close enough to
    // actually be heard, have them say something generic — keeps the
    // world feeling alive even with nothing special happening.
    if (now - this._lastAmbientChatterAt > 7000) {
      const nearby = this.active.filter((n) => {
        if (n.role !== 'civilian' || n.eventRef || n.downedUntil > now) return false;
        return Math.hypot(n.rig.group.position.x - playerPos.x, n.rig.group.position.z - playerPos.z) < 9;
      });
      if (nearby.length) {
        this._lastAmbientChatterAt = now;
        const phrase = AMBIENT_PHRASES[Math.floor(Math.random() * AMBIENT_PHRASES.length)];
        gameEvents.emit('subtitle:show', { name: 'Passerby', text: phrase });
      }
    }

    this.active.forEach((npc) => {
      if (npc.downedUntil > now) return; // lying down, no AI/animation while down
      if (npc.downedUntil > 0 && npc.downedUntil <= now) {
        // Downed timer just expired — respawn fresh elsewhere rather than
        // awkwardly standing back up in place.
        this.scene.remove(npc.rig.group);
        npc.dead = true;
        return;
      }
      // While assigned to a political event, PoliticalEventSystem owns
      // this NPC's movement/pose entirely (walking to their crowd spot,
      // then standing and reacting) — don't fight it with normal wander.
      if (npc.eventRef) return;

      const pos = npc.rig.group.position;

      if (chasing && npc.role === 'police') {
        const dToAlert = this.alertOrigin ? Math.hypot(pos.x - this.alertOrigin.x, pos.z - this.alertOrigin.z) : Infinity;
        if (dToAlert < 60) {
          npc.target = { x: playerPos.x, z: playerPos.z };
          npc.chasing = true;
          npc.speed = POLICE_CHASE_SPEED;
        }
      } else if (npc.chasing) {
        npc.chasing = false;
        npc.speed = WALK_SPEED;
        npc.target = this._pickWanderTarget(npc.anchor);
      }

      const dx = npc.target.x - pos.x;
      const dz = npc.target.z - pos.z;
      const dist = Math.hypot(dx, dz);

      let speedFactor = 0;
      if (dist > 0.3) {
        const step = Math.min(dist, npc.speed * dt);
        pos.x += (dx / dist) * step;
        pos.z += (dz / dist) * step;
        // +PI here matters: the character rig's own local "front" is
        // local -Z (see CharacterModel.js's headOrientation fix), and
        // Math.atan2(dx,dz) alone gives the angle whose (sin,cos) IS the
        // walk direction itself — applying that directly as rotation.y
        // would point the rig's face at -(dx,dz), i.e. exactly backward
        // from where it's walking. This is the same +PI the player's own
        // rotation.y = yaw + Math.PI already includes (see CameraRig.js);
        // NPCs were missing it, so they visibly walked away from the
        // camera showing their face instead of their back.
        npc.rig.group.rotation.y = Math.atan2(dx, dz) + Math.PI;
        speedFactor = npc.chasing ? 1 : 0.45;
        if (npc.phoneUntil) {
          clearPhonePose(npc.rig.bones);
          npc.phoneUntil = 0;
        }
      } else if (now > npc.idleUntil) {
        npc.idleUntil = now + 2000 + Math.random() * 4000;
        npc.target = this._pickWanderTarget(npc.anchor);
        // A fraction of the time, "check their phone" for a few seconds
        // before wandering off again — small ambient life detail.
        npc.phoneUntil = Math.random() < 0.25 ? now + 2200 + Math.random() * 1800 : 0;
      }

      if (npc.phoneUntil && now < npc.phoneUntil) {
        applyPhonePose(npc.rig.bones);
      } else {
        if (npc.phoneUntil) {
          clearPhonePose(npc.rig.bones);
          npc.phoneUntil = 0;
        }
        animateCharacter(npc.rig.bones, { time: now / 1000, speedFactor });
      }
    });
  }

  /** Distance-based visibility toggle, called from the same cull tick as buildings. */
  applyCulling(playerPos, maxDist) {
    this.active.forEach((npc) => {
      const d = Math.hypot(npc.rig.group.position.x - playerPos.x, npc.rig.group.position.z - playerPos.z);
      npc.rig.group.visible = d < maxDist;
    });
  }

  /** Rig groups usable as raycast targets for WeaponSystem's hitscan. */
  getHittableGroups() {
    const now = performance.now();
    return this.active.filter((n) => n.downedUntil <= now).map((n) => n.rig.group);
  }

  getNearestPolice(playerPos, maxDist = 3) {
    const now = performance.now();
    let nearest = null;
    let nearestDist = maxDist;
    this.active.forEach((npc) => {
      if (npc.role !== 'police' || npc.downedUntil > now) return;
      const d = Math.hypot(npc.rig.group.position.x - playerPos.x, npc.rig.group.position.z - playerPos.z);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = npc;
      }
    });
    return nearest;
  }

  dispose() {
    this.active.forEach((npc) => this.scene.remove(npc.rig.group));
    this.active = [];
  }
}
