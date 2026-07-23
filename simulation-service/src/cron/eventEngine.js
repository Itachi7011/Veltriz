const WorldEvent = require('../models/WorldEvent');
const { economyPublic } = require('../services/economyClient');
const { activateEvent, revertEvent } = require('../services/eventService');
const { EVENT_TYPES, randomMultiplier } = require('../data/eventTemplates');
const { EVENT_TEMPLATES } = require('../data/eventTemplates');
const logger = require('../utils/logger');

const revertExpiredEvents = async () => {
  const expired = await WorldEvent.find({ status: 'active', endAt: { $lte: new Date() } });
  for (const event of expired) {
    await revertEvent(event).catch((err) => logger.error('[event-engine] Revert failed:', err.message));
  }
};

/**
 * Small chance per tick of a random flavor event firing on a random active
 * market item, with no admin involvement — keeps the world feeling alive
 * even when no admin is online to trigger anything manually. Skips an
 * item if it already has an active event, so effects don't stack.
 */
const maybeTriggerRandomEvent = async () => {
  const probability = parseFloat(process.env.RANDOM_EVENT_PROBABILITY) || 0.01;
  if (Math.random() > probability) return;

  try {
    const { data } = await economyPublic.get('/api/market');
    const items = data.items || [];
    if (items.length === 0) return;

    const activeEvents = await WorldEvent.find({ status: 'active' });
    const busyKeys = new Set(activeEvents.map((e) => e.targetItemKey));
    const candidates = items.filter((i) => !busyKeys.has(i.key));
    if (candidates.length === 0) return;

    const item = candidates[Math.floor(Math.random() * candidates.length)];
    const type = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
    const multiplier = randomMultiplier(type);
    const built = EVENT_TEMPLATES[type].build(item.name);

    const event = await WorldEvent.create({
      title: built.title,
      description: built.description,
      type,
      targetItemKey: item.key,
      multiplier,
      durationMinutes: 30 + Math.floor(Math.random() * 90), // 30-120 min
      source: 'random',
      status: 'scheduled',
    });

    await activateEvent(event);
    logger.info(`[event-engine] Random event triggered: ${event.title} on ${item.key}`);
  } catch (err) {
    logger.error('[event-engine] Random event generation failed:', err.message);
  }
};

const tick = async () => {
  await revertExpiredEvents();
  await maybeTriggerRandomEvent();
};

const startEventEngine = () => {
  const intervalMs = parseInt(process.env.EVENT_ENGINE_TICK_INTERVAL_MS, 10) || 60000;
  setInterval(tick, intervalMs);
  logger.info(`[event-engine] Started, ticking every ${intervalMs}ms`);
};

module.exports = { startEventEngine, tick };
