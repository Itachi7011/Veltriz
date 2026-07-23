const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 24,
      match: /^[a-zA-Z0-9_]+$/,
    },
    displayName: { type: String, trim: true, maxlength: 40 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 8,
      select: false, // never returned by default
    },
    authProvider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },
    googleId: { type: String, unique: true, sparse: true },

    avatarUrl: { type: String, default: '' },

    isEmailVerified: { type: Boolean, default: false },
    emailVerifyTokenHash: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },

    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    // Security / lockout
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },

    // Coarse role — fine-grained game permissions live in game-world-service.
    // 'player' is the only role issued by this service; admin accounts are
    // created exclusively by admin-service in its own AdminUser collection.
    role: { type: String, enum: ['player'], default: 'player' },

    status: {
      type: String,
      enum: ['active', 'suspended', 'banned', 'deleted'],
      default: 'active',
    },

    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
  },
  { timestamps: true }
);

// ---- Password hashing ----
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
  next();
});

UserSchema.methods.comparePassword = function (candidate) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

// ---- Account lockout helpers ----
UserSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// ---- Token generation (email verify / password reset) ----
// We store only a hash in DB and email the raw token — same pattern as
// password reset best practice, so a DB leak alone can't be used to take over accounts.
UserSchema.methods.generateEmailVerifyToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.emailVerifyTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.emailVerifyExpires = Date.now() + 24 * 60 * 60 * 1000; // 24h
  return rawToken;
};

UserSchema.methods.generatePasswordResetToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1h
  return rawToken;
};

UserSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    username: this.username,
    displayName: this.displayName,
    email: this.email,
    avatarUrl: this.avatarUrl,
    isEmailVerified: this.isEmailVerified,
    authProvider: this.authProvider,
    status: this.status,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', UserSchema);
