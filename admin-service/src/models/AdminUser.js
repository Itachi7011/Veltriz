const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const AdminUserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },

    role: { type: String, enum: ['admin', 'superadmin'], default: 'admin' },
    avatarUrl: { type: String, default: '' },

    status: { type: String, enum: ['active', 'suspended'], default: 'active' },

    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },

    resetPasswordTokenHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    lastLoginAt: { type: Date },
    lastLoginIp: { type: String },
  },
  { timestamps: true }
);

AdminUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
  this.password = await bcrypt.hash(this.password, rounds);
  next();
});

AdminUserSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

AdminUserSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

AdminUserSchema.methods.generatePasswordResetToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1h
  return rawToken;
};

AdminUserSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    username: this.username,
    email: this.email,
    role: this.role,
    avatarUrl: this.avatarUrl,
    status: this.status,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('AdminUser', AdminUserSchema);
