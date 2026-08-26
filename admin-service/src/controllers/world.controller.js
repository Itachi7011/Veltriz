const simulationClient = require('../services/simulationServiceClient');
const AdminAuditLog = require('../models/AdminAuditLog');

const log = (fields) => AdminAuditLog.create(fields).catch(() => {});

// ---------------------------------------------------------------------------
// GET /api/simulation/events?status=
// ---------------------------------------------------------------------------
const listEvents = async (req, res, next) => {
  try {
    const { data } = await simulationClient.get('/api/internal/events', { params: req.query });
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/simulation/events — admin manually triggers a world event
// ---------------------------------------------------------------------------
const triggerEvent = async (req, res, next) => {
  try {
    const { data } = await simulationClient.post('/api/internal/events', {
      ...req.body,
      adminId: req.admin.id,
    });
    await log({ admin: req.admin.id, logType: 'admin_audit', action: 'WORLD_EVENT_TRIGGERED', ip: req.ip, meta: req.body });
    return res.status(201).json(data);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/simulation/events/:id/revert
// ---------------------------------------------------------------------------
const revertEvent = async (req, res, next) => {
  try {
    const { data } = await simulationClient.post(`/api/internal/events/${req.params.id}/revert`);
    await log({ admin: req.admin.id, logType: 'admin_audit', action: 'WORLD_EVENT_REVERTED', ip: req.ip, meta: { eventId: req.params.id } });
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/simulation/npcs/summary
// ---------------------------------------------------------------------------
const getNpcSummary = async (req, res, next) => {
  try {
    const { data } = await simulationClient.get('/api/npcs/summary');
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/simulation/news?page=&limit=
// ---------------------------------------------------------------------------
const listNews = async (req, res, next) => {
  try {
    const { data } = await simulationClient.get('/api/news', { params: req.query });
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

module.exports = { listEvents, triggerEvent, revertEvent, getNpcSummary, listNews };
