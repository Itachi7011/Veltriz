const mongoose = require('mongoose');

// A purchasable Chrono Shard bundle. Deliberately modeled after how a real
// IAP catalog looks (key/name/price/grantedAmount/bonus) so swapping the
// payment PROVIDER later (see services/paymentProviders/) never requires
// touching this schema — only the provider that processes the charge
// changes, not what's being sold.
const PaymentProductSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    shardAmount: { type: Number, required: true, min: 1 }, // base Chrono Shards granted
    bonusShardAmount: { type: Number, default: 0 }, // extra shards on top (bigger bundles get a bonus)
    priceUSD: { type: Number, required: true, min: 0 }, // sandbox — no real charge is ever made
    icon: { type: String, default: 'gem' },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PaymentProduct', PaymentProductSchema);
