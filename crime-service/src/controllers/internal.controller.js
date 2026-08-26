const CrimeAction = require('../models/CrimeAction');
const CrimeRecord = require('../models/CrimeRecord');

// ---------------------------------------------------------------------------
// GET /api/internal/actions — ALL actions (active + inactive), for the
// admin CRUD table.
// ---------------------------------------------------------------------------
const listActionsAdmin = async (req, res, next) => {
  try {
    const actions = await CrimeAction.find().sort({ createdAt: -1 });
    return res.json({ success: true, actions });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/internal/actions — upsert by key
// ---------------------------------------------------------------------------
const upsertAction = async (req, res, next) => {
  try {
    const action = await CrimeAction.findOneAndUpdate(
      { key: req.body.key },
      { $set: req.body },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return res.json({ success: true, message: 'Crime action saved', action });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/internal/heat?page=&limit=&minHeat=  — sorted highest heat first
// ---------------------------------------------------------------------------
const listHeat = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
    const minHeat = req.query.minHeat ? Number(req.query.minHeat) : undefined;

    const filter = minHeat != null && !Number.isNaN(minHeat) ? { heat: { $gte: minHeat } } : {};

    const [records, total] = await Promise.all([
      CrimeRecord.find(filter)
        .sort({ heat: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      CrimeRecord.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      records,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/internal/heat/:userId/reset
// ---------------------------------------------------------------------------
const resetHeat = async (req, res, next) => {
  try {
    const record = await CrimeRecord.findOneAndUpdate(
      { user: req.params.userId },
      { heat: 0 },
      { new: true }
    );
    if (!record) return res.status(404).json({ success: false, message: 'No crime record for this user' });
    return res.json({ success: true, message: 'Heat reset', record });
  } catch (err) {
    next(err);
  }
};

module.exports = { listActionsAdmin, upsertAction, listHeat, resetHeat };
