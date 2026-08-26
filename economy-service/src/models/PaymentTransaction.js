const mongoose = require('mongoose');

// One row per checkout attempt, success or failure — kept even for
// failures so a real provider's webhook retries / disputes / refunds have
// somewhere to land later without a schema change. `provider` and
// `providerRef` exist NOW so that swapping 'sandbox' for 'stripe' later is
// a data migration, not a schema migration — see services/paymentProviders/
// for the abstraction this plugs into.
const PaymentTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    productKey: { type: String, required: true },
    amountUSD: { type: Number, required: true },
    shardsGranted: { type: Number, required: true },
    provider: { type: String, default: 'sandbox' }, // 'sandbox' today; 'stripe'/'razorpay'/etc. later
    providerRef: { type: String }, // the sandbox provider's fake charge id; a real gateway's session/charge id later
    status: { type: String, enum: ['succeeded', 'failed'], required: true },
    failureReason: { type: String },
  },
  { timestamps: true }
);

PaymentTransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentTransaction', PaymentTransactionSchema);
