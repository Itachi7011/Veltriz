const mongoose = require('mongoose');

const WorldEventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: {
      type: String,
      enum: ['shortage', 'boom', 'crisis', 'bonus'],
      required: true,
    },
    targetItemKey: { type: String, required: true }, // a MarketItem.key in economy-service

    multiplier: { type: Number, required: true }, // e.g. 1.4 = +40%, 0.6 = -40%
    originalBasePrice: { type: Number }, // captured at activation, for a clean revert
    durationMinutes: { type: Number, required: true },

    status: {
      type: String,
      enum: ['scheduled', 'active', 'reverted', 'failed'],
      default: 'scheduled',
    },

    startAt: { type: Date, default: Date.now },
    endAt: { type: Date },

    source: { type: String, enum: ['admin', 'random'], default: 'admin' },
    createdByAdminId: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorldEvent', WorldEventSchema);
