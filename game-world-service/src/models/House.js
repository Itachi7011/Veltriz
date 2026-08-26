const mongoose = require('mongoose');

/**
 * Geometry (x/y/width/height/color) stays in worldData.js's static,
 * procedurally-generated house list — it never changes at runtime. This
 * collection exists ONLY to track what worldData.js can't: which houses
 * are owned, by whom. Synced from worldData.js by seed/seedHouses.js
 * (upsert by houseId, so re-running it after adding new house types to the
 * map is always safe — it never touches existing ownership).
 */
const HouseSchema = new mongoose.Schema(
  {
    houseId: { type: String, required: true, unique: true }, // matches a worldData.js house's `id`
    houseType: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    zone: { type: String }, // 'old_meridian' | 'neo_meridian' — display/filtering only, ownership logic doesn't care
    owner: { type: String, default: null }, // auth-service user id, or null if unowned
    purchasedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('House', HouseSchema);
