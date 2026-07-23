const mongoose = require('mongoose');

const CharacterSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
    displayName: { type: String, required: true, trim: true, maxlength: 40 },

    country: { type: String, required: true }, // country code, e.g. 'IN'
    city: { type: String, required: true }, // city code, e.g. 'DEL'
    background: { type: String, enum: ['poor', 'middle', 'rich'], required: true },

    // Deliberately simple "blurry" avatar — a few color/style knobs the
    // frontend renders as a low-detail sprite, no uploaded art needed.
    appearance: {
      skinTone: { type: String, default: '#c68863' },
      outfitColor: { type: String, default: '#3b82f6' },
      hairColor: { type: String, default: '#2b2b2b' },
    },

    mapId: { type: String, default: 'delhi_cp_district' },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },

    // Coarse life stats — expanded in later phases (Part 8 of the design doc).
    // Kept minimal here on purpose.
    stats: {
      energy: { type: Number, default: 100, min: 0, max: 100 },
      happiness: { type: Number, default: 70, min: 0, max: 100 },
    },

    lastSavedAt: { type: Date, default: Date.now },
    lastOnlineAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Character', CharacterSchema);
