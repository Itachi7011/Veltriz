const mongoose = require('mongoose');

const WalletSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
    balance: { type: Number, required: true, default: 0, min: 0 },
    currency: { type: String, default: 'VC' }, // Veltriz Coins
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
