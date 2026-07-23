const mongoose = require('mongoose');

// Storing refresh tokens (hashed) lets us:
//  - support multiple simultaneous devices/tabs
//  - revoke a single device ("log out this device")
//  - revoke everything ("log out everywhere" / on password change)
const RefreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    userAgent: { type: String },
    ip: { type: String },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
  },
  { timestamps: true }
);

// TTL index — Mongo auto-deletes expired refresh tokens
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);
