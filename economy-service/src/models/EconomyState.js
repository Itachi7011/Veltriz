const mongoose = require('mongoose');

// Singleton document (there is only ever ONE row here — enforced by
// always using the fixed id 'global' in the controller). Tracks
// world-level economy metrics the admin dashboard displays and can
// nudge — this is intentionally simple for Phase 1 (Part 3 of the
// design doc's full inflation/GDP engine comes in a later phase).
const EconomyStateSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'global' },
    totalCoinsInCirculation: { type: Number, default: 0 },
    inflationIndex: { type: Number, default: 1.0 }, // multiplier applied on top of base prices
    externalReferenceRates: {
      USD_INR: Number,
      fetchedAt: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EconomyState', EconomyStateSchema);
