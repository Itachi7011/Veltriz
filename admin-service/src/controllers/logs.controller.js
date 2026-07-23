const AuditLogRef = require('../models/AuditLogRef');
const AdminAuditLog = require('../models/AdminAuditLog');

// ---------------------------------------------------------------------------
// GET /api/logs/players?page=&limit=&action=
// ---------------------------------------------------------------------------
const listPlayerLogs = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const filter = {};
    if (req.query.action) filter.action = req.query.action;

    const [logs, total] = await Promise.all([
      AuditLogRef.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      AuditLogRef.countDocuments(filter),
    ]);

    return res.json({ success: true, logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/logs/admin?page=&limit=&action=
// ---------------------------------------------------------------------------
const listAdminLogs = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const filter = {};
    if (req.query.action) filter.action = req.query.action;

    const [logs, total] = await Promise.all([
      AdminAuditLog.find(filter).populate('admin', 'username').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      AdminAuditLog.countDocuments(filter),
    ]);

    return res.json({ success: true, logs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

module.exports = { listPlayerLogs, listAdminLogs };
