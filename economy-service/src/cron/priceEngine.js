const MarketItem = require('../models/MarketItem');
const MarketPrice = require('../models/MarketPrice');
const logger = require('../utils/logger');
const { getIO } = require('../sockets');

/**
 * Random-walk price tick, bounded by the item's volatilityPercent (falls
 * back to PRICE_MAX_DRIFT_PERCENT). This is intentionally simple for Phase 1
 * — the full "real API + admin multiplier + demand/supply" formula from
 * the design doc's Part 3/11 comes once we have enough real trading volume
 * to make demand/supply meaningful. For now, admin price overrides (see
 * internal.controller.js `adjustPrice`) are the primary lever, and this
 * engine just keeps the market feeling "alive" between overrides.
 */
const tickPrices = async () => {
  try {
    const globalMaxDrift = parseFloat(process.env.PRICE_MAX_DRIFT_PERCENT) || 2;
    const items = await MarketItem.find({ isActive: true });

    for (const item of items) {
      const maxDrift = (item.volatilityPercent ?? globalMaxDrift) / 100;
      // random value in [-maxDrift, +maxDrift]
      const driftPercent = (Math.random() * 2 - 1) * maxDrift;

      let priceDoc = await MarketPrice.findOne({ item: item._id });
      if (!priceDoc) {
        priceDoc = await MarketPrice.create({
          item: item._id,
          currentPrice: item.basePrice,
          previousPrice: item.basePrice,
        });
        continue;
      }

      const newPrice = Math.max(
        1,
        Math.round(priceDoc.currentPrice * (1 + driftPercent) * 100) / 100
      );

      priceDoc.previousPrice = priceDoc.currentPrice;
      priceDoc.currentPrice = newPrice;
      priceDoc.lastTickAt = new Date();
      priceDoc.history.push({ price: newPrice, at: new Date() });
      if (priceDoc.history.length > 200) {
        priceDoc.history = priceDoc.history.slice(-200);
      }
      await priceDoc.save();

      getIO()?.emit('market:price_update', { itemKey: item.key, currentPrice: newPrice });
    }
  } catch (err) {
    logger.error('[price-engine] Tick failed:', err.message);
  }
};

const startPriceEngine = () => {
  const intervalMs = parseInt(process.env.PRICE_TICK_INTERVAL_MS, 10) || 60000;
  setInterval(tickPrices, intervalMs);
  logger.info(`[price-engine] Started, ticking every ${intervalMs}ms`);
};

module.exports = { startPriceEngine, tickPrices };
