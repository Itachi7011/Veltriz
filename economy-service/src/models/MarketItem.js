const mongoose = require('mongoose');

const MarketItemSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. 'food', 'fuel', 'gold'
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['commodity', 'tool', 'luxury'],
      default: 'commodity',
    },
    basePrice: { type: Number, required: true }, // admin-set anchor price
    volatilityPercent: { type: Number, default: 2 }, // per-item override of global drift cap
    sellRateMultiplier: { type: Number, default: 0.85 }, // sell-back price = currentPrice * this
    icon: { type: String, default: 'package' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MarketItem', MarketItemSchema);
