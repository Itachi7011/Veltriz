const mongoose = require('mongoose');

const CharacterSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, required: true, unique: true, index: true },
    displayName: { type: String, required: true, trim: true, maxlength: 40 },

    country: { type: String, required: true }, // country code, e.g. 'IN'
    city: { type: String, required: true }, // city code, e.g. 'DEL'
    background: { type: String, enum: ['poor', 'middle', 'rich'], required: true },

    // Drives a real jointed 3D character model client-side (proper body,
    // hands, face, hair) — not a flat sprite anymore, so this now also
    // tracks gender/hairstyle/pants/shoes instead of just 3 color knobs.
    appearance: {
      gender: { type: String, enum: ['male', 'female'], default: 'male' },
      skinTone: { type: String, default: '#c68863' },
      outfitColor: { type: String, default: '#3b82f6' },
      hairColor: { type: String, default: '#2b2b2b' },
      hairStyle: { type: String, enum: ['short', 'buzz', 'long', 'ponytail', 'bald'], default: 'short' },
      pantsColor: { type: String, default: '#232842' },
      shoeColor: { type: String, default: '#171a26' },
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

    // Separate cooldown tracker from Park's relax, so being on cooldown at
    // one doesn't affect the other — see character.controller.js.
    lastGymAt: { type: Date },
    lastRelaxAt: { type: Date },
    lastCinemaAt: { type: Date },
    lastRelocateAt: { type: Date },

    lastSavedAt: { type: Date, default: Date.now },
    lastOnlineAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Character', CharacterSchema);
