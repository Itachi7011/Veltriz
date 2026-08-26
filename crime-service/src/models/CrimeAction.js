const mongoose = require('mongoose');

const CrimeActionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // e.g. 'pickpocket', 'carjack'
    title: { type: String, required: true },
    description: { type: String, default: '' },
    icon: { type: String, default: 'venetian-mask' }, // lucide-react icon name, used by frontend

    baseSuccessChance: { type: Number, required: true, min: 0, max: 1 },
    minPayout: { type: Number, required: true, min: 0 },
    maxPayout: { type: Number, required: true, min: 0 },
    cooldownMinutes: { type: Number, default: 10, min: 0 },

    // Heat added per attempt is intentionally NOT admin-editable per action —
    // it's derived from baseSuccessChance (riskier crimes draw more police
    // attention). See crime.controller.js#computeHeatGain. Kept here only so
    // it can be inspected/tuned later without a schema change.
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CrimeAction', CrimeActionSchema);
