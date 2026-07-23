const { economyPublic, economyInternal } = require('./economyClient');
const NewsArticle = require('../models/NewsArticle');
const { EVENT_TEMPLATES } = require('../data/eventTemplates');
const logger = require('../utils/logger');

const getMarketItem = async (itemKey) => {
  const { data } = await economyPublic.get('/api/market');
  return data.items.find((i) => i.key === itemKey) || null;
};

/**
 * Activates a scheduled event: captures the item's current base price
 * (for a clean revert later), applies the multiplier via economy-service's
 * existing internal price-override endpoint (both the live price AND the
 * base-price anchor, so the effect is felt instantly, not just drifted
 * into over time), and publishes a news article.
 */
const activateEvent = async (event) => {
  const item = await getMarketItem(event.targetItemKey);
  if (!item) {
    event.status = 'failed';
    await event.save();
    logger.warn(`[event-service] Cannot activate event ${event._id}: item ${event.targetItemKey} not found`);
    return;
  }

  const originalBasePrice = item.basePrice;
  const newPrice = Math.max(1, Math.round(originalBasePrice * event.multiplier));

  await economyInternal.post('/api/internal/market-items/adjust-price', {
    itemKey: event.targetItemKey,
    newPrice,
    newBasePrice: newPrice,
  });

  event.originalBasePrice = originalBasePrice;
  event.status = 'active';
  event.startAt = new Date();
  event.endAt = new Date(Date.now() + event.durationMinutes * 60 * 1000);
  await event.save();

  const template = EVENT_TEMPLATES[event.type];
  const built = template.build(item.name);

  await NewsArticle.create({
    headline: built.newsHeadline,
    body: built.newsBody,
    category: 'economy',
    relatedEvent: event._id,
  });

  logger.info(`[event-service] Activated "${event.title}" on ${event.targetItemKey}: ${originalBasePrice} -> ${newPrice}`);
};

/**
 * Reverts an active event once its duration has elapsed: restores the
 * item's original base price and live price, and publishes a short
 * "things are stabilizing" news article.
 */
const revertEvent = async (event) => {
  const item = await getMarketItem(event.targetItemKey);

  if (item && event.originalBasePrice) {
    await economyInternal.post('/api/internal/market-items/adjust-price', {
      itemKey: event.targetItemKey,
      newPrice: event.originalBasePrice,
      newBasePrice: event.originalBasePrice,
    });
  }

  event.status = 'reverted';
  await event.save();

  await NewsArticle.create({
    headline: `${item ? item.name : event.targetItemKey} prices stabilize`,
    body: `Following the recent "${event.title}", prices have returned closer to normal levels as the situation eased.`,
    category: 'economy',
    relatedEvent: event._id,
  });

  logger.info(`[event-service] Reverted "${event.title}" on ${event.targetItemKey}`);
};

module.exports = { getMarketItem, activateEvent, revertEvent };
