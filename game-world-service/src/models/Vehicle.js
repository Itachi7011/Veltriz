const mongoose = require('mongoose');

/**
 * Vehicle OWNERSHIP records — the catalog itself lives in
 * data/vehicleTypes.js (static, like MarketItem is for economy-service).
 * Unlike House.js, this is NOT one row per pre-placed map instance (a
 * vehicle isn't drawn anywhere on the map at a fixed x/y) — it's an
 * inventory-style row per unit owned, so a player can own several
 * vehicles at once (a garage), unlike the one-house-at-a-time rule Real
 * Estate enforces.
 */
const VehicleSchema = new mongoose.Schema(
  {
    owner: { type: String, required: true, index: true }, // auth-service user id
    vehicleKey: { type: String, required: true }, // matches a VEHICLE_TYPES key
    name: { type: String, required: true },
    terrain: { type: String, enum: ['land', 'water'], required: true },
    pricePaid: { type: Number, required: true },
    purchasedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vehicle', VehicleSchema);
