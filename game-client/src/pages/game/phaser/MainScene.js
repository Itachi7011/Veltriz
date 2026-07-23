import Phaser from 'phaser';
import gameEvents from '../gameEvents';

const MOVE_SPEED = 3.2;
const MOVE_EMIT_INTERVAL_MS = 90;

/**
 * Builds a deliberately simple/low-detail "blurry" humanoid — a few soft,
 * semi-transparent overlapping circles rather than crisp sprite art. This
 * matches the agreed scope: real physics-driven movement, but no
 * high-fidelity character art (which is out of scope for a solo dev).
 */
const drawBlurryHuman = (scene, { skinTone, outfitColor, hairColor }) => {
  const container = scene.add.container(0, 0);

  // Soft shadow blob under the character sells the "blurry" look
  const shadow = scene.add.ellipse(0, 20, 34, 14, 0x000000, 0.25);

  // Body (soft overlapping ellipses = cheap blur effect, no shader needed)
  const bodyOuter = scene.add.ellipse(0, 6, 34, 40, Phaser.Display.Color.HexStringToColor(outfitColor).color, 0.35);
  const bodyMid = scene.add.ellipse(0, 6, 27, 34, Phaser.Display.Color.HexStringToColor(outfitColor).color, 0.55);
  const bodyCore = scene.add.ellipse(0, 6, 20, 28, Phaser.Display.Color.HexStringToColor(outfitColor).color, 0.9);

  // Head
  const headOuter = scene.add.circle(0, -18, 16, Phaser.Display.Color.HexStringToColor(skinTone).color, 0.4);
  const headCore = scene.add.circle(0, -18, 12, Phaser.Display.Color.HexStringToColor(skinTone).color, 0.95);

  // Hair (simple arc on top of head)
  const hair = scene.add.ellipse(0, -25, 22, 12, Phaser.Display.Color.HexStringToColor(hairColor).color, 0.9);

  container.add([shadow, bodyOuter, bodyMid, bodyCore, headOuter, headCore, hair]);
  return container;
};

export default class MainScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainScene' });
    this.remotePlayers = new Map(); // userId -> { container, targetX, targetY }
    this.buildingZones = [];
    this.lastEmitAt = 0;
    this.currentBuildingType = null;
  }

  init(data) {
    this.mapConfig = data.mapConfig;
    this.character = data.character;
    this.socket = data.socket;
  }

  create() {
    const { width, height, buildings = [], obstacles = [] } = this.mapConfig;

    this.matter.world.setBounds(0, 0, width, height);
    this.cameras.main.setBounds(0, 0, width, height);

    // ---- Ground ----
    this.add.rectangle(width / 2, height / 2, width, height, 0x232a3f);
    this.add.grid(width / 2, height / 2, width, height, 64, 64, undefined, undefined, 0x2c3450, 0.4);

    // ---- Buildings (visual + interaction sensor zone) ----
    buildings.forEach((b) => {
      const rect = this.add.rectangle(b.x, b.y, b.width, b.height, 0x3a4266, 1).setStrokeStyle(3, 0x7c3aed, 0.7);
      this.add
        .text(b.x, b.y, b.name, {
          fontFamily: 'Segoe UI, Arial',
          fontSize: '15px',
          color: '#e8eaff',
          align: 'center',
          wordWrap: { width: b.width - 16 },
        })
        .setOrigin(0.5);

      // Static solid body so players can't walk through the building
      this.matter.add.rectangle(b.x, b.y, b.width, b.height, { isStatic: true, label: `solid:${b.id}` });

      // Slightly larger SENSOR zone around it for "you're near this building" interaction
      const sensor = this.matter.add.rectangle(b.x, b.y, b.width + 60, b.height + 60, {
        isStatic: true,
        isSensor: true,
        label: `zone:${b.type}`,
      });
      this.buildingZones.push(sensor);
    });

    // ---- Obstacles (plain solid blocks) ----
    obstacles.forEach((o) => {
      this.add.rectangle(o.x, o.y, o.width, o.height, 0x4a5170);
      this.matter.add.rectangle(o.x, o.y, o.width, o.height, { isStatic: true, label: 'solid:obstacle' });
    });

    // ---- Local player ----
    const spawnX = this.character?.position?.x ?? this.mapConfig.spawnPoint.x;
    const spawnY = this.character?.position?.y ?? this.mapConfig.spawnPoint.y;

    const playerVisual = drawBlurryHuman(this, this.character?.appearance || {
      skinTone: '#c68863',
      outfitColor: '#3b82f6',
      hairColor: '#2b2b2b',
    });

    this.playerContainer = this.matter.add.gameObject(playerVisual, {
      shape: { type: 'circle', radius: 18 },
      friction: 0.02,
      frictionAir: 0.25,
      label: 'player',
      inertia: Infinity, // prevents the body from spinning on collision
    });
    this.playerContainer.setPosition(spawnX, spawnY);

    // Nameplate above local player
    this.nameplate = this.add
      .text(spawnX, spawnY - 44, this.character?.displayName || 'Citizen', {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '13px',
        color: '#ffffff',
        backgroundColor: '#00000066',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5);

    this.cameras.main.startFollow(this.playerContainer, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);

    // ---- Input ----
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });

    // ---- Building enter/leave detection ----
    this.matter.world.on('collisionstart', (event) => {
      event.pairs.forEach(({ bodyA, bodyB }) => {
        const zoneBody = bodyA.label?.startsWith('zone:') ? bodyA : bodyB.label?.startsWith('zone:') ? bodyB : null;
        const otherBody = zoneBody === bodyA ? bodyB : bodyA;
        if (zoneBody && otherBody.label === 'player') {
          this.currentBuildingType = zoneBody.label.replace('zone:', '');
          gameEvents.emit('building:enter', { type: this.currentBuildingType });
        }
      });
    });

    this.matter.world.on('collisionend', (event) => {
      event.pairs.forEach(({ bodyA, bodyB }) => {
        const zoneBody = bodyA.label?.startsWith('zone:') ? bodyA : bodyB.label?.startsWith('zone:') ? bodyB : null;
        const otherBody = zoneBody === bodyA ? bodyB : bodyA;
        if (zoneBody && otherBody.label === 'player') {
          this.currentBuildingType = null;
          gameEvents.emit('building:leave', { type: zoneBody.label.replace('zone:', '') });
        }
      });
    });

    // ---- Multiplayer socket wiring ----
    if (this.socket) {
      this.socket.emit('world:join', {
        mapId: this.mapConfig.id,
        displayName: this.character?.displayName,
        x: spawnX,
        y: spawnY,
      });

      this.socket.on('world:snapshot', ({ players }) => {
        players.forEach((p) => this.addRemotePlayer(p));
      });
      this.socket.on('player:joined', (p) => this.addRemotePlayer(p));
      this.socket.on('player:moved', (p) => this.updateRemotePlayer(p));
      this.socket.on('player:left', ({ userId }) => this.removeRemotePlayer(userId));
    }

    // ---- Pause-safety: let React know the scene finished creating ----
    gameEvents.emit('scene:ready');

    this.events.on('shutdown', () => this.cleanupSocketListeners());
  }

  addRemotePlayer(p) {
    if (this.remotePlayers.has(p.userId)) return;
    const visual = drawBlurryHuman(this, { skinTone: '#e0ac69', outfitColor: '#22c55e', hairColor: '#2b2b2b' });
    visual.setPosition(p.x, p.y);
    const nameplate = this.add
      .text(p.x, p.y - 44, p.displayName || 'Citizen', {
        fontFamily: 'Segoe UI, Arial',
        fontSize: '12px',
        color: '#dfe3ff',
        backgroundColor: '#00000055',
        padding: { x: 5, y: 2 },
      })
      .setOrigin(0.5);
    this.remotePlayers.set(p.userId, { container: visual, nameplate, targetX: p.x, targetY: p.y });
  }

  updateRemotePlayer(p) {
    const entry = this.remotePlayers.get(p.userId);
    if (!entry) {
      this.addRemotePlayer(p);
      return;
    }
    entry.targetX = p.x;
    entry.targetY = p.y;
  }

  removeRemotePlayer(userId) {
    const entry = this.remotePlayers.get(userId);
    if (!entry) return;
    entry.container.destroy();
    entry.nameplate.destroy();
    this.remotePlayers.delete(userId);
  }

  cleanupSocketListeners() {
    if (!this.socket) return;
    this.socket.off('world:snapshot');
    this.socket.off('player:joined');
    this.socket.off('player:moved');
    this.socket.off('player:left');
  }

  update(time) {
    if (!this.playerContainer?.body) return;

    const left = this.cursors.left.isDown || this.wasd.left.isDown;
    const right = this.cursors.right.isDown || this.wasd.right.isDown;
    const up = this.cursors.up.isDown || this.wasd.up.isDown;
    const down = this.cursors.down.isDown || this.wasd.down.isDown;

    let vx = 0;
    let vy = 0;
    if (left) vx -= 1;
    if (right) vx += 1;
    if (up) vy -= 1;
    if (down) vy += 1;

    if (vx !== 0 && vy !== 0) {
      // normalize diagonal movement so it isn't faster than cardinal movement
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }

    this.matter.setVelocity(this.playerContainer.body, vx * MOVE_SPEED, vy * MOVE_SPEED);

    // Keep nameplate glued above the player
    this.nameplate.setPosition(this.playerContainer.x, this.playerContainer.y - 44);

    // Emit movement over the socket, throttled
    if ((vx !== 0 || vy !== 0) && this.socket && time - this.lastEmitAt > MOVE_EMIT_INTERVAL_MS) {
      this.lastEmitAt = time;
      let facing = 'down';
      if (up) facing = 'up';
      else if (down) facing = 'down';
      else if (left) facing = 'left';
      else if (right) facing = 'right';

      this.socket.emit('player:move', {
        x: this.playerContainer.x,
        y: this.playerContainer.y,
        vx,
        vy,
        facing,
      });
    }

    // Smoothly interpolate remote players toward their last known position
    this.remotePlayers.forEach((entry) => {
      const dx = entry.targetX - entry.container.x;
      const dy = entry.targetY - entry.container.y;
      entry.container.x += dx * 0.25;
      entry.container.y += dy * 0.25;
      entry.nameplate.setPosition(entry.container.x, entry.container.y - 44);
    });
  }
}
