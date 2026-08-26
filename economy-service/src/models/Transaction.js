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
        // These 8 were already being passed by casino/credit-union/lottery/
        // school controllers before this fix but were MISSING from this
        // enum — every one of those calls was throwing a Mongoose
        // ValidationError and failing outright. Found during the robustness
        // audit; see EXPANSION_NOTES.md.
        'CASINO_BET',
        'CASINO_WIN',
        'INSURANCE_PREMIUM',
        'LOAN_DISBURSEMENT',
        'LOAN_REPAYMENT',
        'LOTTERY_TICKET',
        'LOTTERY_WIN',
        'TUITION',
        // New with the time-management/Chrono Shard system — see
        // models/Wallet.js's chronoShards field and controllers/
        // payments.controller.js / jobs.controller.js's rush-shift flow.
        'SHARD_PURCHASE',
        'SHARD_EARNED',
        'SHARD_SPEEDUP',
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
