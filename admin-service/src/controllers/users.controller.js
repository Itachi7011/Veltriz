const PlayerUserRef = require('../models/PlayerUserRef');
const AuditLogRef = require('../models/AuditLogRef');
const AdminAuditLog = require('../models/AdminAuditLog');
const economyClient = require('../services/economyServiceClient');

const log = (fields) => AdminAuditLog.create(fields).catch(() => {});

// ---------------------------------------------------------------------------
// GET /api/users?page=&limit=&search=&status=
// ---------------------------------------------------------------------------
const listUsers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
    const { search, status } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      PlayerUserRef.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      PlayerUserRef.countDocuments(filter),
    ]);

    return res.json({ success: true, users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/users/:id  — profile + wallet + recent activity, all in one call
// ---------------------------------------------------------------------------
const getUserDetail = async (req, res, next) => {
  try {
    const user = await PlayerUserRef.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const recentLogs = await AuditLogRef.find({ user: user._id }).sort({ createdAt: -1 }).limit(20);

    let wallet = null;
    let recentTransactions = [];
    try {
      const { data } = await economyClient.get(`/api/internal/wallets/${user._id}`);
      wallet = data.wallet;
      recentTransactions = data.recentTransactions || [];
    } catch {
      // No wallet yet (e.g. player signed up but hasn't created a character) — not an error state.
      wallet = null;
    }

    return res.json({ success: true, user, wallet, recentTransactions, recentLogs });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/users/:id/status  { status: 'active' | 'suspended' | 'banned' }
// ---------------------------------------------------------------------------
const setUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const user = await PlayerUserRef.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await log({
      admin: req.admin.id,
      logType: 'admin_audit',
      action: 'USER_STATUS_CHANGED',
      ip: req.ip,
      meta: { targetUser: user._id, newStatus: status },
    });

    return res.json({ success: true, message: `User status set to ${status}`, user });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/users/:id/unlock  — clears failed-login lockout
// ---------------------------------------------------------------------------
const unlockUser = async (req, res, next) => {
  try {
    const user = await PlayerUserRef.findByIdAndUpdate(
      req.params.id,
      { loginAttempts: 0, lockUntil: null },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await log({
      admin: req.admin.id,
      logType: 'admin_audit',
      action: 'USER_UNLOCKED',
      ip: req.ip,
      meta: { targetUser: user._id },
    });

    return res.json({ success: true, message: 'Account unlocked', user });
  } catch (err) {
    next(err);
  }
};

module.exports = { listUsers, getUserDetail, setUserStatus, unlockUser };
