const mongoose = require('mongoose');

const PlayerInsuranceSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, unique: true },
    healthInsuranceActive: { type: Boolean, default: false },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlayerInsurance', PlayerInsuranceSchema);
