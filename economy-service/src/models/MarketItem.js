const mongoose = require('mongoose');

const MarketItemSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. 'food', 'fuel', 'gold'
    name: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'commodity', 'tool', 'luxury', 'food', 'electronics', 'clothing', 'medicine', 'stock', 'weapon',
        // Port Haven / Veltriz Sea additions — see economy-service's
        // seedJobsAndMarket.js for the actual items in each.
        'seafood', 'crude_oil', 'pearls',
      ],
      default: 'commodity',
    },
    basePrice: { type: Number, required: true }, // admin-set anchor price
    volatilityPercent: { type: Number, default: 2 }, // per-item override of global drift cap
    sellRateMultiplier: { type: Number, default: 0.85 }, // sell-back price = currentPrice * this
    icon: { type: String, default: 'package' },
    isActive: { type: Boolean, default: true },

    // ---- Consumable effects ----
    // If consumable, POST /api/market/use spends one unit from the
    // player's inventory and applies these deltas to their character's
    // stats (via game-world-service's internal endpoint). Non-consumable
    // items (tools, luxury, commodities) leave both at 0 and are purely
    // buy/sell/hold investments.
    consumable: { type: Boolean, default: false },
    effectEnergy: { type: Number, default: 0 }, // can be negative (e.g. a night out costs energy)
    effectHappiness: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MarketItem', MarketItemSchema);
