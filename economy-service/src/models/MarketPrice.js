const mongoose = require('mongoose');

const MarketPriceSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'MarketItem', required: true, unique: true },
    currentPrice: { type: Number, required: true },
    previousPrice: { type: Number },
    // Bounded history for sparkline charts on the frontend — capped at 200 points,
    // old points are trimmed by the price engine so this never grows unbounded.
    history: [
      {
        price: Number,
        at: { type: Date, default: Date.now },
      },
    ],
    lastAdminOverrideAt: { type: Date },
    lastTickAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MarketPrice', MarketPriceSchema);
