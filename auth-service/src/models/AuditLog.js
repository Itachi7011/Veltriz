const mongoose = require('mongoose');

// Generic log used for both "activity" (routine actions) and "audit"
// (security-sensitive actions) — differentiated by `logType`.
// Retention is enforced by a scheduled cleanup job (see jobs/cleanup.js)
// rather than a single fixed TTL, since retention days are configurable
// per log category via env vars.
const AuditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    logType: {
      type: String,
      enum: ['user_activity', 'user_audit'],
      required: true,
    },
    action: { type: String, required: true }, // e.g. 'LOGIN_SUCCESS', 'PASSWORD_RESET', 'SIGNUP'
    ip: { type: String },
    userAgent: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: 1 });
AuditLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
