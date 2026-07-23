const mongoose = require('mongoose');

// Append-only ledger. Never update or delete a transaction — if a reversal
// is needed, create an offsetting transaction instead (Part 3 / Part 11 of
// the design doc call this out explicitly: "immutable ledger architecture").
const TransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    type: {
      type: String,
      enum: [
        'SALARY',
        'MARKET_BUY',
        'MARKET_SELL',
        'ADMIN_CREDIT',
        'ADMIN_DEBIT',
        'TAX',
        'STARTING_BALANCE',
      ],
      required: true,
    },
    amount: { type: Number, required: true }, // positive = credit, negative = debit
    balanceAfter: { type: Number, required: true },
    description: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

TransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', TransactionSchema);
