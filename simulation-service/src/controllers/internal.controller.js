const WorldEvent = require('../models/WorldEvent');
const { activateEvent, revertEvent } = require('../services/eventService');
const { EVENT_TEMPLATES, randomMultiplier } = require('../data/eventTemplates');

// ---------------------------------------------------------------------------
// GET /api/internal/events?status=&page=&limit=
// ---------------------------------------------------------------------------
const listAllEvents = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const [events, total] = await Promise.all([
      WorldEvent.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      WorldEvent.countDocuments(filter),
    ]);

    return res.json({ success: true, events, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/internal/events  — admin triggers an event, applied immediately
// ---------------------------------------------------------------------------
const triggerEvent = async (req, res, next) => {
  try {
    const { type, targetItemKey, durationMinutes, adminId } = req.body;
    const multiplier = req.body.multiplier ?? randomMultiplier(type);
    const template = EVENT_TEMPLATES[type];

    // Title/description default from the template using the item KEY (the
    // human-readable item NAME gets swapped in once activateEvent fetches
    // it from economy-service) — admin can still override both.
    const fallback = template.build(targetItemKey);

    const event = await WorldEvent.create({
      title: req.body.title || fallback.title,
      description: req.body.description || fallback.description,
      type,
      targetItemKey,
      multiplier,
      durationMinutes,
      source: 'admin',
      createdByAdminId: adminId,
      status: 'scheduled',
    });

    await activateEvent(event);

    return res.status(201).json({ success: true, message: 'Event triggered', event });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/internal/events/:id/revert  — admin manually ends an event early
// ---------------------------------------------------------------------------
const forceRevertEvent = async (req, res, next) => {
  try {
    const event = await WorldEvent.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.status !== 'active') {
      return res.status(400).json({ success: false, message: `Event is not active (status: ${event.status})` });
    }

    await revertEvent(event);
    return res.json({ success: true, message: 'Event reverted', event });
  } catch (err) {
    next(err);
  }
};

module.exports = { listAllEvents, triggerEvent, forceRevertEvent };
