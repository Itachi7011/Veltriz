const mongoose = require('mongoose');

const CrimeRecordSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, unique: true }, // auth-service user id (string, cross-service — no ref)

    heat: { type: Number, default: 0, min: 0, max: 100 },

    totalAttempts: { type: Number, default: 0 },
    totalSuccesses: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },

    // actionKey -> Date of the last attempt at that specific action, used to
    // compute per-action cooldowns independently (so being on cooldown for
    // "pickpocket" doesn't block "carjack").
    lastAttempts: { type: Map, of: Date, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CrimeRecord', CrimeRecordSchema);
