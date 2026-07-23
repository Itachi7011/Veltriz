const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. 'worker', 'clerk'
    title: { type: String, required: true },
    description: { type: String },
    sector: {
      type: String,
      enum: ['industry', 'commerce', 'technology', 'services'],
      default: 'services',
    },
    baseSalary: { type: Number, required: true }, // Veltriz Coins per shift, admin-adjustable
    cooldownMinutes: { type: Number, default: 60 }, // real-minutes between shifts
    icon: { type: String, default: 'briefcase' }, // lucide-react icon name, used by frontend
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Job', JobSchema);
