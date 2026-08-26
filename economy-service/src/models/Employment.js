const mongoose = require('mongoose');

const EmploymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    startedAt: { type: Date, default: Date.now },
    lastWorkedAt: { type: Date },
    totalShiftsWorked: { type: Number, default: 0 }, // cumulative across the whole career
    shiftsAtCurrentTier: { type: Number, default: 0 }, // resets on each promotion — gates the NEXT promotion
    totalEarned: { type: Number, default: 0 },
    totalPromotions: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'quit'], default: 'active' },

    // ---- Time-management system: a shift is no longer instant ----
    // Working now takes real time: POST /api/jobs/work/start locks in the
    // pay for this shift and opens a countdown of job.cooldownMinutes;
    // POST /api/jobs/work/collect only pays out once that time has passed
    // (or is rushed early with Chrono Shards — see jobs.controller.js).
    // null whenever no shift is currently in progress.
    pendingShift: {
      type: {
        startedAt: { type: Date },
        completesAt: { type: Date },
        salary: { type: Number }, // locked in at start time (skill bonus + tax already applied)
        isBonus: { type: Boolean },
      },
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Employment', EmploymentSchema);
