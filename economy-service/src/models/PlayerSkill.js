const mongoose = require('mongoose');

const PlayerSkillSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, unique: true },
    skillLevel: { type: Number, default: 0, min: 0, max: 5 },
    lastStudyAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlayerSkill', PlayerSkillSchema);
