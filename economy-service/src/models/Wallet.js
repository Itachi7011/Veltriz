const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
    balance: { type: Number, required: true, default: 0, min: 0 }, // Veltriz Coins (VC) — earned in-world
    currency: { type: String, default: 'VC' },

    // Chrono Shards (CS) — the game's time-management currency (see
    // utils/shardService.js). Earned in small amounts through normal play
    // (a shift collected, a crime pulled off, a daily login) or bought in
    // small bundles through the sandbox payment system (controllers/
    // payments.controller.js). Spent to skip/rush a timed task — a job
    // shift in progress, a crime cooldown — instead of waiting it out.
    // Deliberately a SEPARATE balance from VC: it's a convenience currency,
    // not wealth, and keeping it out of `balance` means it can never be
    // taxed, gambled, or laundered through any of the VC-based systems.
    chronoShards: { type: Number, required: true, default: 0, min: 0 },

    background: {
      type: String,
      enum: ['poor', 'middle', 'rich'],
      default: 'poor',
    },
    isLocked: { type: Boolean, default: false }, // admin can freeze a wallet (fraud/investigation)
  },
  { timestamps: true }
);

module.exports = mongoose.model('Wallet', WalletSchema);
