const mongoose = require('mongoose');

const AdminRefreshTokenSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    userAgent: { type: String },
    ip: { type: String },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
  },
  { timestamps: true }
);

AdminRefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AdminRefreshToken', AdminRefreshTokenSchema);
