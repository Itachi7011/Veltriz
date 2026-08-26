const crimeClient = require('../services/crimeServiceClient');
const AdminAuditLog = require('../models/AdminAuditLog');

const log = (fields) => AdminAuditLog.create(fields).catch(() => {});

// ---------------------------------------------------------------------------
// GET /api/crime-control/actions
// ---------------------------------------------------------------------------
const listActions = async (req, res, next) => {
  try {
    const { data } = await crimeClient.get('/api/internal/actions');
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/crime-control/actions — upsert
// ---------------------------------------------------------------------------
const upsertAction = async (req, res, next) => {
  try {
    const { data } = await crimeClient.post('/api/internal/actions', req.body);
    await log({ admin: req.admin.id, logType: 'admin_audit', action: 'CRIME_ACTION_SAVED', ip: req.ip, meta: req.body });
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/crime-control/heat?page=&limit=&minHeat=
// ---------------------------------------------------------------------------
const listHeat = async (req, res, next) => {
  try {
    const { data } = await crimeClient.get('/api/internal/heat', { params: req.query });
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/crime-control/heat/:userId/reset
// ---------------------------------------------------------------------------
const resetHeat = async (req, res, next) => {
  try {
    const { data } = await crimeClient.post(`/api/internal/heat/${req.params.userId}/reset`);
    await log({ admin: req.admin.id, logType: 'admin_audit', action: 'CRIME_HEAT_RESET', ip: req.ip, meta: { targetUser: req.params.userId } });
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

module.exports = { listActions, upsertAction, listHeat, resetHeat };
