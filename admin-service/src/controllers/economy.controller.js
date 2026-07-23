const economyClient = require('../services/economyServiceClient');
const AdminAuditLog = require('../models/AdminAuditLog');

const log = (fields) => AdminAuditLog.create(fields).catch(() => {});

// ---------------------------------------------------------------------------
// GET /api/economy/overview
// ---------------------------------------------------------------------------
const getOverview = async (req, res, next) => {
  try {
    const { data } = await economyClient.get('/api/internal/overview');
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/economy/wallets?page=&limit=
// ---------------------------------------------------------------------------
const listWallets = async (req, res, next) => {
  try {
    const { data } = await economyClient.get('/api/internal/wallets', { params: req.query });
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/economy/wallets/:userId/credit  { amount, reason }
// ---------------------------------------------------------------------------
const creditWallet = async (req, res, next) => {
  try {
    const { data } = await economyClient.post(`/api/internal/wallets/${req.params.userId}/credit`, req.body);
    await log({
      admin: req.admin.id,
      logType: 'admin_audit',
      action: 'WALLET_CREDIT',
      ip: req.ip,
      meta: { targetUser: req.params.userId, ...req.body },
    });
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/economy/wallets/:userId/debit  { amount, reason }
// ---------------------------------------------------------------------------
const debitWallet = async (req, res, next) => {
  try {
    const { data } = await economyClient.post(`/api/internal/wallets/${req.params.userId}/debit`, req.body);
    await log({
      admin: req.admin.id,
      logType: 'admin_audit',
      action: 'WALLET_DEBIT',
      ip: req.ip,
      meta: { targetUser: req.params.userId, ...req.body },
    });
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/economy/wallets/:userId/lock  |  /unlock
// ---------------------------------------------------------------------------
const lockWallet = async (req, res, next) => {
  try {
    const { data } = await economyClient.post(`/api/internal/wallets/${req.params.userId}/lock`);
    await log({ admin: req.admin.id, logType: 'admin_audit', action: 'WALLET_LOCKED', ip: req.ip, meta: { targetUser: req.params.userId } });
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

const unlockWallet = async (req, res, next) => {
  try {
    const { data } = await economyClient.post(`/api/internal/wallets/${req.params.userId}/unlock`);
    await log({ admin: req.admin.id, logType: 'admin_audit', action: 'WALLET_UNLOCKED', ip: req.ip, meta: { targetUser: req.params.userId } });
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------
const listJobs = async (req, res, next) => {
  try {
    const { data } = await economyClient.get('/api/internal/jobs');
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

const upsertJob = async (req, res, next) => {
  try {
    const { data } = await economyClient.post('/api/internal/jobs', req.body);
    await log({ admin: req.admin.id, logType: 'admin_audit', action: 'JOB_SAVED', ip: req.ip, meta: req.body });
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Market items + prices
// ---------------------------------------------------------------------------
const listMarketItems = async (req, res, next) => {
  try {
    const { data } = await economyClient.get('/api/internal/market-items');
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

const upsertMarketItem = async (req, res, next) => {
  try {
    const { data } = await economyClient.post('/api/internal/market-items', req.body);
    await log({ admin: req.admin.id, logType: 'admin_audit', action: 'MARKET_ITEM_SAVED', ip: req.ip, meta: req.body });
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

const adjustPrice = async (req, res, next) => {
  try {
    const { data } = await economyClient.post('/api/internal/market-items/adjust-price', req.body);
    await log({ admin: req.admin.id, logType: 'admin_audit', action: 'PRICE_OVERRIDE', ip: req.ip, meta: req.body });
    return res.json(data);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOverview,
  listWallets,
  creditWallet,
  debitWallet,
  lockWallet,
  unlockWallet,
  listJobs,
  upsertJob,
  listMarketItems,
  upsertMarketItem,
  adjustPrice,
};
