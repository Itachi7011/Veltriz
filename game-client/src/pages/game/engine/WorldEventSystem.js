import { animateCharacter } from './CharacterModel';
import { buildFactionFlag } from './FactionFlags';
import { POLITICAL_PARTIES, GANGS, twoRivals } from './FactionData';
import gameEvents from '../gameEvents';

/**
 * Everything that happens in the world beyond individual NPC wandering:
 * civic gatherings, rival political-party clashes, gang turf wars, and
 * economic-distress crowds outside financial buildings. Two ways in:
 *  - the player starts one at their location (PoliticsPanel → 'politics:start')
 *  - the world starts them on its own on a timer (see maybeAutoStart()),
 *    so the city feels alive even when the player isn't doing anything
 *
 * Combat between rival NPCs (clashes/gang wars) reuses the same
 * non-graphic health/knockdown system as player combat — no gore, a
 * stylized "down" state — see NpcSystem.applyDamage. Political parties
 * and gangs are original to Veltriz; see FactionData.js.
 */

const SOLO_CONFIGS = {
  rally: {
    label: 'Rally', radius: 22, duration: 90000, formation: 'crowd',
    phrases: ['We want change!', 'Veltriz deserves better!', 'Sign the petition!', 'Our voice matters!'],
  },
  food_distribution: {
    label: 'Food Distribution', radius: 18, duration: 80000, formation: 'queue',
    phrases: ['Thank you so much.', 'Bless you for this.', 'Finally, a hot meal.'],
  },
  gathering: {
    label: 'Mass Gathering', radius: 20, duration: 60000, formation: 'crowd',
    phrases: ['Good to see everyone.', 'What a turnout!', 'Great day for this.'],
  },
};

const CLASH_CONFIGS = {
  political_clash: {
    label: 'Political Clash', radius: 26, duration: 75000, callsPolice: true,
    phrases: ["This isn't right!", 'Stand your ground!', 'We won\u2019t back down!', 'Enough!'],
    combatDamage: [4, 9],
    combatIntervalMs: 1600,
  },
  gang_war: {
    label: 'Gang Turf War', radius: 24, duration: 65000, callsPolice: true,
    phrases: ['This is our block!', 'Back off!', 'You don\u2019t belong here!'],
    combatDamage: [8, 16],
    combatIntervalMs: 1300,
  },
};

const ECONOMIC_CONFIG = {
  label: 'Economic Unrest', radius: 20, duration: 70000, formation: 'crowd', agitated: true,
  phrases: ['My savings are gone!', 'What is the bank doing?!', 'We need answers!', 'This market is a disaster!'],
};

export const MANUAL_EVENT_TYPES = [
  { key: 'rally', label: 'Rally' },
  { key: 'gathering', label: 'Mass Gathering' },
  { key: 'food_distribution', label: 'Food Distribution' },
  { key: 'political_clash', label: 'Political Clash' },
  { key: 'gang_war', label: 'Gang Turf War' },
];

const FINANCIAL_TYPES = ['bank', 'stock_exchange', 'credit_union'];
const AUTO_CHECK_INTERVAL_MS = 25000;
const AUTO_START_CHANCE = 0.35;
const AUTO_COOLDOWN_MS = 120000;

export class WorldEventSystem {
  constructor({ npcSystem, buildingEntries, scale }) {
    this.npcSystem = npcSystem;
    this.buildingEntries = buildingEntries;
    this.scale = scale;
    this.activeEvent = null;
    this._lastSubtitleAt = 0;
    this._policeAlerted = false;
    this._lastAutoCheckAt = 0;
    this._lastAutoStartAt = -Infinity;
    this._lastEconomicTriggerAt = -Infinity;
  }

  isActive() {
    return !!this.activeEvent;
  }

  start(type, x, z) {
    if (SOLO_CONFIGS[type]) return this._startSolo(type, x, z);
    if (CLASH_CONFIGS[type]) return this._startClash(type, x, z);
    return false;
  }

  startEconomicDistress(x, z) {
    this.clear();
    const now = performance.now();
    const attendees = this._nearbyCivilians(x, z, ECONOMIC_CONFIG.radius, 24);
    if (!attendees.length) return false;

    this.activeEvent = { type: 'economic_distress', x, z, config: ECONOMIC_CONFIG, startedAt: now, attendees };
    attendees.forEach((npc, i) => {
      npc.eventRef = this.activeEvent;
      npc.eventSpot = this._crowdSpot(x, z, i);
      npc.target = npc.eventSpot;
    });
    gameEvents.emit('politics:eventStarted', { type: ECONOMIC_CONFIG.label, count: attendees.length });
    gameEvents.emit('worldevent:active', this._publicState());
    return true;
  }

  _nearbyCivilians(x, z, radius, cap) {
    const now = performance.now();
    return this.npcSystem.active
      .filter((n) => n.role !== 'police' && n.downedUntil <= now && !n.eventRef)
      .filter((n) => Math.hypot(n.rig.group.position.x - x, n.rig.group.position.z - z) < radius * 2.4)
      .slice(0, cap);
  }

  _startSolo(type, x, z) {
    this.clear();
    const config = SOLO_CONFIGS[type];
    const attendees = this._nearbyCivilians(x, z, config.radius, 24);
    if (!attendees.length) return false;

    const now = performance.now();
    this.activeEvent = { type, x, z, config, startedAt: now, attendees };
    attendees.forEach((npc, i) => {
      npc.eventRef = this.activeEvent;
      npc.eventSpot = this._spotFor(config, x, z, i);
      npc.target = npc.eventSpot;
    });
    gameEvents.emit('politics:eventStarted', { type: config.label, count: attendees.length });
    gameEvents.emit('worldevent:active', this._publicState());
    return true;
  }

  _startClash(type, x, z) {
    this.clear();
    const config = CLASH_CONFIGS[type];
    const attendees = this._nearbyCivilians(x, z, config.radius, 26);
    if (attendees.length < 4) return false;

    const now = performance.now();
    const pool = type === 'gang_war' ? GANGS : POLITICAL_PARTIES;
    const [factionA, factionB] = twoRivals(pool);

    this.activeEvent = {
      type, x, z, config, startedAt: now, attendees, factionA, factionB,
      lastCombatAt: 0,
    };

    attendees.forEach((npc, i) => {
      const faction = i % 2 === 0 ? factionA : factionB;
      const side = i % 2 === 0 ? -1 : 1;
      npc.eventRef = this.activeEvent;
      npc.faction = faction;
      npc.eventSpot = this._sideSpot(x, z, i, side);
      npc.target = npc.eventSpot;
      npc.flagSprite = buildFactionFlag(faction);
      npc.flagSprite.position.set(0, 2.15, 0);
      npc.rig.group.add(npc.flagSprite);
      npc.flagSprite.visible = true;
    });

    gameEvents.emit('politics:eventStarted', { type: config.label, count: attendees.length });
    gameEvents.emit('worldevent:active', this._publicState());
    return true;
  }

  _spotFor(config, x, z, i) {
    if (config.formation === 'queue') return { x: x - (i + 1) * 1.15, z: z + (i % 2 === 0 ? 0.3 : -0.3) };
    return this._crowdSpot(x, z, i);
  }

  _crowdSpot(x, z, i) {
    const angle = (i / 7) * Math.PI * 2 + Math.floor(i / 7) * 0.35;
    const ring = 3.5 + Math.floor(i / 7) * 2.4;
    return { x: x + Math.cos(angle) * ring, z: z + Math.sin(angle) * ring };
  }

  _sideSpot(x, z, i, side) {
    const row = Math.floor(i / 2 / 6);
    const col = Math.floor(i / 2) % 6;
    return {
      x: x + (col - 2.5) * 1.4,
      z: z + side * (4 + row * 1.6),
    };
  }

  update(dt, now) {
    if (!this.activeEvent) return;
    const ev = this.activeEvent;

    if (now - ev.startedAt > ev.config.duration) {
      this.clear();
      return;
    }

    if (ev.config.callsPolice && !this._policeAlerted && now - ev.startedAt > 10000) {
      this._policeAlerted = true;
      this.npcSystem.alertNear(ev.x, ev.z);
    }

    ev.attendees.forEach((npc) => {
      if (npc.downedUntil > now) return;
      const pos = npc.rig.group.position;
      const dx = npc.eventSpot.x - pos.x;
      const dz = npc.eventSpot.z - pos.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 0.4) {
        const step = Math.min(dist, 1.3 * dt);
        pos.x += (dx / dist) * step;
        pos.z += (dz / dist) * step;
        npc.rig.group.rotation.y = Math.atan2(dx, dz);
        animateCharacter(npc.rig.bones, { time: now / 1000, speedFactor: 0.4 });
      } else if (!ev.factionA) {
        const fx = ev.x - pos.x;
        const fz = ev.z - pos.z;
        if (Math.hypot(fx, fz) > 0.5) npc.rig.group.rotation.y = Math.atan2(fx, fz);
        const freq = ev.config.agitated ? 7 : 3;
        const amp = ev.config.agitated ? 0.5 : 0.25;
        const bob = Math.sin((now / 1000) * freq + pos.x * 3) * amp;
        npc.rig.bones.upperArmLeft.rotation.x = -0.7 - Math.max(0, bob);
        npc.rig.bones.upperArmRight.rotation.x = -0.7 - Math.max(0, -bob);
        npc.rig.bones.hips.rotation.y = bob * 0.08;
      } else {
        const oppositeZ = ev.z - (pos.z - ev.z);
        npc.rig.group.rotation.y = Math.atan2(ev.x - pos.x, oppositeZ - pos.z);
        const bob = Math.sin((now / 1000) * 6 + pos.x * 2) * 0.4;
        npc.rig.bones.upperArmRight.rotation.x = -1.1 - Math.max(0, bob);
      }
    });

    if (ev.factionA) this._updateClashCombat(ev, now);

    if (now - this._lastSubtitleAt > 4200 && ev.attendees.length) {
      this._lastSubtitleAt = now;
      const npc = ev.attendees[Math.floor(Math.random() * ev.attendees.length)];
      const phrase = ev.config.phrases[Math.floor(Math.random() * ev.config.phrases.length)];
      const name = npc.faction ? npc.faction.name : 'Citizen';
      gameEvents.emit('subtitle:show', { name, text: phrase });
    }
  }

  _updateClashCombat(ev, now) {
    if (now - ev.lastCombatAt < ev.config.combatIntervalMs) return;
    ev.lastCombatAt = now;

    const arrived = ev.attendees.filter((n) => {
      if (n.downedUntil > now) return false;
      return Math.hypot(n.rig.group.position.x - n.eventSpot.x, n.rig.group.position.z - n.eventSpot.z) < 0.6;
    });
    const sideA = arrived.filter((n) => n.faction.key === ev.factionA.key);
    const sideB = arrived.filter((n) => n.faction.key === ev.factionB.key);
    if (!sideA.length || !sideB.length) return;

    const exchanges = Math.min(3, Math.min(sideA.length, sideB.length));
    for (let i = 0; i < exchanges; i++) {
      const defender = sideB[Math.floor(Math.random() * sideB.length)];
      const [min, max] = ev.config.combatDamage;
      this.npcSystem.applyDamage(defender, min + Math.random() * (max - min));
      gameEvents.emit('weapon:hit', { downed: defender.hp <= 0 });
      const defender2 = sideA[Math.floor(Math.random() * sideA.length)];
      this.npcSystem.applyDamage(defender2, min + Math.random() * (max - min));
    }
  }

  /** Called every frame by GameEngine — decides on its own whether to start something. */
  maybeAutoStart(now, marketTrendPercent) {
    if (this.activeEvent) return;
    if (now - this._lastAutoCheckAt < AUTO_CHECK_INTERVAL_MS) return;
    this._lastAutoCheckAt = now;
    if (now - this._lastAutoStartAt < AUTO_COOLDOWN_MS) return;

    if (marketTrendPercent !== null && marketTrendPercent <= -8 && now - this._lastEconomicTriggerAt > AUTO_COOLDOWN_MS * 2) {
      const spot = this._findFinancialSpot();
      if (spot && this.startEconomicDistress(spot.x, spot.z)) {
        this._lastAutoStartAt = now;
        this._lastEconomicTriggerAt = now;
        return;
      }
    }

    if (Math.random() > AUTO_START_CHANCE) return;
    const npc = this.npcSystem.active[Math.floor(Math.random() * this.npcSystem.active.length)];
    if (!npc) return;
    const pos = npc.rig.group.position;
    const roll = Math.random();
    const type = roll < 0.35 ? 'rally' : roll < 0.55 ? 'gathering' : roll < 0.75 ? 'political_clash' : roll < 0.9 ? 'gang_war' : 'food_distribution';
    if (this.start(type, pos.x, pos.z)) this._lastAutoStartAt = now;
  }

  _findFinancialSpot() {
    const candidates = this.buildingEntries.filter((e) => FINANCIAL_TYPES.includes(e.data.type));
    if (!candidates.length) return null;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return { x: pick.footprint.x, z: pick.footprint.z };
  }

  _publicState() {
    if (!this.activeEvent) return null;
    return {
      type: this.activeEvent.type,
      label: this.activeEvent.config.label,
      x: this.activeEvent.x / this.scale,
      z: this.activeEvent.z / this.scale,
    };
  }

  clear() {
    if (!this.activeEvent) return;
    this.activeEvent.attendees.forEach((npc) => {
      delete npc.eventRef;
      delete npc.eventSpot;
      delete npc.faction;
      if (npc.flagSprite) {
        npc.rig.group.remove(npc.flagSprite);
        npc.flagSprite.material?.dispose?.();
        delete npc.flagSprite;
      }
    });
    gameEvents.emit('politics:eventEnded');
    gameEvents.emit('worldevent:active', null);
    this.activeEvent = null;
    this._policeAlerted = false;
  }

  dispose() {
    this.clear();
  }
}
