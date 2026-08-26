import Phaser from 'phaser';
import MainScene from './MainScene';

/**
 * Builds the Phaser game config. Matter.js is the physics engine (per the
 * agreed scope: real movement/collision, not just a grid-move click game).
 * Graphics are generated at runtime (see MainScene) — deliberately simple,
 * low-detail "blurry" humanoid shapes rather than sprite art, per scope.
 */
export const createGameConfig = (parentId) => ({
  type: Phaser.AUTO,
  parent: parentId,
  backgroundColor: '#1c2333',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 0 }, // top-down world, no gravity
      debug: false,
    },
  },
  scene: [MainScene],
  render: {
    antialias: true,
    pixelArt: false,
  },
});
