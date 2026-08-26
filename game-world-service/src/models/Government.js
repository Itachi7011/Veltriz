const mongoose = require('mongoose');

/**
 * Always exactly one document (upserted by a fixed `_id`) — there's only
 * ever one City Hall, one current administration. `taxRatePercent` is the
 * one real lever the Mayor has: economy-service reads it (via the internal
 * route below) and applies it as a discount on every job's salary. See
 * cron/electionCycle.js for how someone becomes Mayor in the first place.
 */
const GovernmentSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'singleton' },
    mayor: { type: String, default: null }, // userId, or null before the first election resolves
    mayorName: { type: String, default: null },
    termNumber: { type: Number, default: 0 },
    electedAt: { type: Date },
    taxRatePercent: { type: Number, default: 0, min: 0, max: 15 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Government', GovernmentSchema);
