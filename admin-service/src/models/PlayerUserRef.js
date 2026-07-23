const mongoose = require('mongoose');

/**
 * This is NOT a duplicate data store — it points at the exact same 'users'
 * collection that auth-service's User model writes to (same MongoDB
 * cluster/database, shared by design per project scope: "admin can
 * control/change anything in the game").
 *
 * Deliberately declares ONLY the fields admin tooling needs to read/update
 * (identity + moderation fields) and NEVER touches `password`,
 * `emailVerifyTokenHash`, or `resetPasswordTokenHash` — those stay
 * exclusively owned by auth-service's business logic. This model should
 * only ever be used for: listing users, viewing profile info, and
 * updating `status` / clearing `loginAttempts` + `lockUntil` (unlocking
 * an account an admin wants to manually restore).
 */
const PlayerUserRefSchema = new mongoose.Schema(
  {
    username: String,
    displayName: String,
    email: String,
    avatarUrl: String,
    isEmailVerified: Boolean,
    authProvider: String,
    role: String,
    status: { type: String, enum: ['active', 'suspended', 'banned', 'deleted'] },
    loginAttempts: Number,
    lockUntil: Date,
    lastLoginAt: Date,
    lastLoginIp: String,
    createdAt: Date,
    updatedAt: Date,
  },
  { collection: 'users', strict: false, timestamps: false }
);

module.exports = mongoose.model('PlayerUserRef', PlayerUserRefSchema);
