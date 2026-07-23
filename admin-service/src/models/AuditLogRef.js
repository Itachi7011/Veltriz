const mongoose = require('mongoose');

/**
 * Read-only view into auth-service's `auditlogs` collection (user
 * signups/logins/security events). Admin-service never writes here —
 * it's purely for the admin dashboard's activity/audit screens.
 */
const AuditLogRefSchema = new mongoose.Schema(
  {
    user: mongoose.Schema.Types.ObjectId,
    logType: String,
    action: String,
    ip: String,
    userAgent: String,
    meta: mongoose.Schema.Types.Mixed,
    createdAt: Date,
  },
  { collection: 'auditlogs', strict: false, timestamps: false }
);

module.exports = mongoose.model('AuditLogRef', AuditLogRefSchema);
