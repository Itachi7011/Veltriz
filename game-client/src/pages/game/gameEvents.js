import Phaser from 'phaser';

/**
 * A single shared EventEmitter used to communicate between the Phaser
 * scene (imperative, canvas-based) and the React UI layer (HUD, panels).
 * The scene emits things like 'building:enter' when the player walks into
 * a building's interaction zone; React listens and shows the right panel.
 * Panels emit back 'panel:closed' so the scene can re-enable movement.
 */
const gameEvents = new Phaser.Events.EventEmitter();

export default gameEvents;
