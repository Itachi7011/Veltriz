const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. 'worker', 'clerk'
    title: { type: String, required: true },
    description: { type: String },
    sector: {
      type: String,
      enum: ['industry', 'commerce', 'technology', 'services', 'healthcare', 'government'],
      default: 'services',
    },
    baseSalary: { type: Number, required: true }, // Veltriz Coins per shift, admin-adjustable
    cooldownMinutes: { type: Number, default: 60 }, // real-minutes between shifts
    icon: { type: String, default: 'briefcase' }, // lucide-react icon name, used by frontend
    isActive: { type: Boolean, default: true },

    // If set, this job is hireable directly from that location's panel in
    // game-client (e.g. 'electronics', 'casino', 'stock_exchange') in
    // addition to always being listed at the generic Job Center. Unset for
    // the original generic career-track jobs, which aren't tied to one
    // physical place.
    locationType: { type: String },

    // ---- Career progression ----
    // Jobs with the same careerTrack form a promotion chain, ordered by tier
    // (1 = entry level). nextTierKey points to the next Job.key in the
    // chain, or null/unset if this is the top of the track.
    careerTrack: { type: String }, // e.g. 'retail', 'engineering'
    tier: { type: Number, default: 1, min: 1 },
    nextTierKey: { type: String },
    promotionShiftsRequired: { type: Number }, // shifts needed at THIS tier before promoting

    // Chance (0-1) of a bonus payout ("employee of the month") on any given shift
    bonusChance: { type: Number, default: 0.12, min: 0, max: 1 },
    bonusMultiplier: { type: Number, default: 1.75, min: 1 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Job', JobSchema);
