const mongoose = require('mongoose');

// Append-only ledger for Chrono Shards, mirroring Transaction.js's design
// (VC's ledger) but kept as its own collection — Transaction.balanceAfter
// means "VC balance after this movement", and overloading that field to
// sometimes mean "shard balance after" would make every existing VC
// transaction reader (admin dashboards, WalletPanel.jsx's history view)
// have to branch on currency to make sense of a single number. Two small,
// unambiguous ledgers beat one ambiguous one.
const ShardTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    type: {
      type: String,
      enum: ['EARNED', 'PURCHASE', 'SPEEDUP', 'ADMIN_CREDIT', 'ADMIN_DEBIT'],
      required: true,
    },
    amount: { type: Number, required: true }, // positive = credit, negative = debit
    balanceAfter: { type: Number, required: true },
    description: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

ShardTransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('ShardTransaction', ShardTransactionSchema);
