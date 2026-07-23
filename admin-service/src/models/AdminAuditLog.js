const mongoose = require('mongoose');

const AdminAuditLogSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminUser' },
    logType: { type: String, enum: ['admin_activity', 'admin_audit'], required: true },
    action: { type: String, required: true }, // e.g. 'ADMIN_LOGIN', 'PRICE_OVERRIDE', 'WALLET_CREDIT', 'USER_SUSPENDED'
    ip: String,
    userAgent: String,
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

AdminAuditLogSchema.index({ createdAt: 1 });
AdminAuditLogSchema.index({ admin: 1, createdAt: -1 });

module.exports = mongoose.model('AdminAuditLog', AdminAuditLogSchema);
