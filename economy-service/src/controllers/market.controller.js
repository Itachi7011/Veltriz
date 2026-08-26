const MarketItem = require('../models/MarketItem');
const MarketPrice = require('../models/MarketPrice');
const Inventory = require('../models/Inventory');
const PlayerInsurance = require('../models/PlayerInsurance');
const { creditWallet, debitWallet, InsufficientFundsError } = require('../utils/walletService');
const { gameWorldInternal } = require('../services/gameWorldClient');
const { isActive: isInsuranceActive, HEALTH_DISCOUNT_PERCENT } = require('./insurance.controller');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// GET /api/market
// ---------------------------------------------------------------------------
const listMarket = async (req, res, next) => {
  try {
    const items = await MarketItem.find({ isActive: true });
    const prices = await MarketPrice.find({ item: { $in: items.map((i) => i._id) } });
    const priceByItemId = new Map(prices.map((p) => [p.item.toString(), p]));

    const combined = items.map((item) => {
      const price = priceByItemId.get(item._id.toString());
      return {
        key: item.key,
        name: item.name,
        category: item.category,
        icon: item.icon,
        basePrice: item.basePrice,
        currentPrice: price ? price.currentPrice : item.basePrice,
        previousPrice: price ? price.previousPrice : item.basePrice,
        sellPrice: Math.round((price ? price.currentPrice : item.basePrice) * item.sellRateMultiplier),
        sparkline: price ? price.history.slice(-30).map((h) => h.price) : [],
        consumable: item.consumable,
        effectEnergy: item.effectEnergy,
        effectHappiness: item.effectHappiness,
      };
    });

    return res.json({ success: true, items: combined });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/market/inventory
// ---------------------------------------------------------------------------
const getInventory = async (req, res, next) => {
  try {
    const inventory = await Inventory.findOne({ user: req.user.id });
    return res.json({ success: true, items: inventory?.items || [] });
  } catch (err) {
    next(err);
  }
};

const getCurrentPrice = async (itemKey) => {
  const item = await MarketItem.findOne({ key: itemKey, isActive: true });
  if (!item) return null;
  const price = await MarketPrice.findOne({ item: item._id });
  return { item, currentPrice: price ? price.currentPrice : item.basePrice };
};

// ---------------------------------------------------------------------------
// POST /api/market/buy  { itemKey, quantity }
// ---------------------------------------------------------------------------
const buyItem = async (req, res, next) => {
  try {
    const { itemKey, quantity } = req.body;
    const found = await getCurrentPrice(itemKey);
    if (!found) return res.status(404).json({ success: false, message: 'Item not found' });

    let unitPrice = found.currentPrice;

    // Insurance Office's health premium discounts every medicine purchase —
    // a real cross-feature price effect, not just a number shown in the
    // Insurance panel. See insurance.controller.js.
    if (found.item.category === 'medicine') {
      const insurance = await PlayerInsurance.findOne({ user: req.user.id });
      if (isInsuranceActive(insurance)) {
        unitPrice = Math.round(unitPrice * (1 - HEALTH_DISCOUNT_PERCENT / 100));
      }
    }

    const totalCost = Math.round(unitPrice * quantity);

    let wallet;
    try {
      wallet = await debitWallet(req.user.id, totalCost, {
        type: 'MARKET_BUY',
        description: `Bought ${quantity}x ${found.item.name}`,
        meta: { itemKey, quantity, unitPrice },
      });
    } catch (e) {
      if (e instanceof InsufficientFundsError) {
        return res.status(400).json({ success: false, message: 'Insufficient balance' });
      }
      throw e;
    }

    await Inventory.findOneAndUpdate(
      { user: req.user.id, 'items.itemKey': itemKey },
      { $inc: { 'items.$.quantity': quantity } },
      { new: true }
    ).then(async (updated) => {
      if (!updated) {
        await Inventory.findOneAndUpdate(
          { user: req.user.id },
          { $push: { items: { itemKey, quantity } } },
          { upsert: true }
        );
      }
    });

    return res.json({ success: true, message: `Bought ${quantity}x ${found.item.name}`, totalCost, balance: wallet.balance });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/market/sell  { itemKey, quantity }
// ---------------------------------------------------------------------------
const sellItem = async (req, res, next) => {
  try {
    const { itemKey, quantity } = req.body;
    const found = await getCurrentPrice(itemKey);
    if (!found) return res.status(404).json({ success: false, message: 'Item not found' });

    const inventory = await Inventory.findOne({ user: req.user.id, 'items.itemKey': itemKey });
    const owned = inventory?.items.find((i) => i.itemKey === itemKey)?.quantity || 0;
    if (owned < quantity) {
      return res.status(400).json({ success: false, message: `You only own ${owned}x ${found.item.name}` });
    }

    const sellPrice = found.currentPrice * found.item.sellRateMultiplier;
    const totalEarned = Math.round(sellPrice * quantity);

    await Inventory.findOneAndUpdate(
      { user: req.user.id, 'items.itemKey': itemKey },
      { $inc: { 'items.$.quantity': -quantity } }
    );

    const wallet = await creditWallet(req.user.id, totalEarned, {
      type: 'MARKET_SELL',
      description: `Sold ${quantity}x ${found.item.name}`,
      meta: { itemKey, quantity, unitPrice: sellPrice },
    });

    return res.json({ success: true, message: `Sold ${quantity}x ${found.item.name}`, totalEarned, balance: wallet.balance });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/market/use  { itemKey }
// Consumes ONE unit from inventory and applies its effect to the player's
// character stats via game-world-service's internal endpoint.
// ---------------------------------------------------------------------------
const useItem = async (req, res, next) => {
  try {
    const { itemKey } = req.body;

    const item = await MarketItem.findOne({ key: itemKey, isActive: true });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
    if (!item.consumable) {
      return res.status(400).json({ success: false, message: `${item.name} isn't something you can use — try selling it instead.` });
    }

    const inventory = await Inventory.findOne({ user: req.user.id, 'items.itemKey': itemKey });
    const owned = inventory?.items.find((i) => i.itemKey === itemKey)?.quantity || 0;
    if (owned < 1) {
      return res.status(400).json({ success: false, message: `You don't own any ${item.name}` });
    }

    await Inventory.findOneAndUpdate(
      { user: req.user.id, 'items.itemKey': itemKey },
      { $inc: { 'items.$.quantity': -1 } }
    );

    let stats = null;
    try {
      const { data } = await gameWorldInternal.post(`/api/internal/character/${req.user.id}/stats`, {
        energyDelta: item.effectEnergy,
        happinessDelta: item.effectHappiness,
      });
      stats = data.stats;
    } catch (err) {
      // Item is already consumed at this point — log loudly so a missed
      // stat effect can be spotted, same trade-off as crime-service's
      // payout-failure handling (an item's own price is real money already
      // spent; refunding it would just invite double-dipping the effect).
      logger.error(`[market] Stat effect failed for user ${req.user.id}, item ${itemKey}:`, err.message);
    }

    return res.json({
      success: true,
      message: `You used ${item.name}.`,
      effectEnergy: item.effectEnergy,
      effectHappiness: item.effectHappiness,
      stats,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { listMarket, getInventory, buyItem, sellItem, useItem };
