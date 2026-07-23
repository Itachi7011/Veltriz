const mongoose = require('mongoose');

const EmploymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    startedAt: { type: Date, default: Date.now },
    lastWorkedAt: { type: Date },
    totalShiftsWorked: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'quit'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Employment', EmploymentSchema);
