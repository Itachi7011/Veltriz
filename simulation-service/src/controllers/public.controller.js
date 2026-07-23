const NewsArticle = require('../models/NewsArticle');
const WorldEvent = require('../models/WorldEvent');
const Npc = require('../models/Npc');

// ---------------------------------------------------------------------------
// GET /api/news?page=&limit=
// ---------------------------------------------------------------------------
const listNews = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

    const [articles, total] = await Promise.all([
      NewsArticle.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      NewsArticle.countDocuments(),
    ]);

    return res.json({ success: true, articles, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/events/active
// ---------------------------------------------------------------------------
const listActiveEvents = async (req, res, next) => {
  try {
    const events = await WorldEvent.find({ status: 'active' }).sort({ startAt: -1 });
    return res.json({ success: true, events });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/npcs/summary  — lightweight aggregate stats, not individual NPC data
// ---------------------------------------------------------------------------
const getNpcSummary = async (req, res, next) => {
  try {
    const [total, employed, totals] = await Promise.all([
      Npc.countDocuments(),
      Npc.countDocuments({ jobKey: { $exists: true, $ne: null } }),
      Npc.aggregate([
        { $group: { _id: null, totalWealth: { $sum: '$wealth' }, totalShifts: { $sum: '$totalShiftsWorked' }, totalPurchases: { $sum: '$totalPurchases' } } },
      ]),
    ]);

    return res.json({
      success: true,
      summary: {
        totalNpcs: total,
        employedNpcs: employed,
        totalSimulatedWealth: totals[0]?.totalWealth || 0,
        totalShiftsWorked: totals[0]?.totalShifts || 0,
        totalPurchases: totals[0]?.totalPurchases || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { listNews, listActiveEvents, getNpcSummary };
