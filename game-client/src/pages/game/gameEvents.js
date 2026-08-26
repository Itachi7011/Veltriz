/**
 * A tiny dependency-free EventEmitter used to communicate between the
 * imperative Three.js game engine (canvas-based) and the React UI layer
 * (HUD, panels). The engine emits things like 'building:enter' when the
 * player walks into a building's interaction zone; React listens and
 * shows the right panel. Panels emit back 'panel:closed' so the engine
 * can re-enable movement.
 *
 * (Previously this wrapped Phaser.Events.EventEmitter; the game no
 * longer uses Phaser at all, so this is now a small standalone class
 * with the same on/off/emit surface.)
 */
class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(event, handler) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(handler);
    return this;
  }

  off(event, handler) {
    this._listeners.get(event)?.delete(handler);
    return this;
  }

  emit(event, payload) {
    this._listeners.get(event)?.forEach((handler) => handler(payload));
    return this;
  }
}

const gameEvents = new EventBus();

export default gameEvents;
