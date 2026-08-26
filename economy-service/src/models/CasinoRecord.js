const mongoose = require('mongoose');

const CasinoRecordSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, unique: true },
    lastBetAt: { type: Date },
    totalWagered: { type: Number, default: 0 },
    totalWon: { type: Number, default: 0 },
    totalLost: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CasinoRecord', CasinoRecordSchema);
