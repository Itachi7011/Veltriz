const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const Job = require('../models/Job');
const MarketItem = require('../models/MarketItem');
const MarketPrice = require('../models/MarketPrice');
const EconomyState = require('../models/EconomyState');
const Inventory = require('../models/Inventory');
const PaymentProduct = require('../models/PaymentProduct');
const PaymentTransaction = require('../models/PaymentTransaction');
const { creditWallet, debitWallet, InsufficientFundsError } = require('../utils/walletService');
const { debitShards, creditShards, InsufficientShardsError } = require('../utils/shardService');
const { getIO } = require('../sockets');

// ---------------------------------------------------------------------------
// GET /api/internal/inventory/:userId/has-weapon — called by crime-service
// to decide whether to apply its "armed" success-chance bonus. Deliberately
// tiny and boolean-only: crime-service never learns WHICH weapon a player
// owns, just whether they own one.
// ---------------------------------------------------------------------------
const hasWeapon = async (req, res, next) => {
  try {
    const weaponItems = await MarketItem.find({ category: 'weapon' }).select('key');
    const weaponKeys = weaponItems.map((i) => i.key);

    const inventory = await Inventory.findOne({
      user: req.params.userId,
      items: { $elemMatch: { itemKey: { $in: weaponKeys }, quantity: { $gt: 0 } } },
    });

    return res.json({ success: true, hasWeapon: !!inventory });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/internal/overview
// ---------------------------------------------------------------------------
const getOverview = async (req, res, next) => {
  try {
    const [state, walletCount, jobCount, itemCount, totalWallets, totalShards] = await Promise.all([
      EconomyState.findById('global'),
      Wallet.countDocuments(),
      Job.countDocuments({ isActive: true }),
      MarketItem.countDocuments({ isActive: true }),
      Wallet.aggregate([{ $group: { _id: null, sum: { $sum: '$balance' } } }]),
      Wallet.aggregate([{ $group: { _id: null, sum: { $sum: '$chronoShards' } } }]),
    ]);

    return res.json({
      success: true,
      overview: {
        totalCoinsInCirculation: totalWallets[0]?.sum || 0,
        totalChronoShardsInCirculation: totalShards[0]?.sum || 0,
        inflationIndex: state?.inflationIndex ?? 1.0,
        totalWallets: walletCount,
        activeJobs: jobCount,
        activeMarketItems: itemCount,
        externalReferenceRates: state?.externalReferenceRates || null,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/internal/wallets/:userId
// ---------------------------------------------------------------------------
const getWalletByUserId = async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({ user: req.params.userId });
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });

    const transactions = await Transaction.find({ user: req.params.userId })
      .sort({ createdAt: -1 })
      .limit(20);

    return res.json({ success: true, wallet, recentTransactions: transactions });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/internal/wallets?page=&limit=&search=
// ---------------------------------------------------------------------------
const listWallets = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);

    const [wallets, total] = await Promise.all([
      Wallet.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Wallet.countDocuments(),
    ]);

    return res.json({ success: true, wallets, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/internal/wallets/:userId/credit  { amount, reason }
// ---------------------------------------------------------------------------
const adminCreditWallet = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;

    const wallet = await creditWallet(userId, amount, {
      type: 'ADMIN_CREDIT',
      description: reason,
      meta: { adminAction: true },
    });

    getIO()?.to(`user:${userId}`).emit('wallet:update', { balance: wallet.balance });

    return res.json({ success: true, message: 'Wallet credited', wallet });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/internal/wallets/:userId/debit  { amount, reason }
// ---------------------------------------------------------------------------
const adminDebitWallet = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;

    let wallet;
    try {
      wallet = await debitWallet(userId, amount, {
        type: 'ADMIN_DEBIT',
        description: reason,
        meta: { adminAction: true },
      });
    } catch (e) {
      if (e instanceof InsufficientFundsError) {
        return res.status(400).json({ success: false, message: 'User has insufficient balance for this debit' });
      }
      throw e;
    }

    getIO()?.to(`user:${userId}`).emit('wallet:update', { balance: wallet.balance });

    return res.json({ success: true, message: 'Wallet debited', wallet });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/internal/wallets/:userId/lock    POST /api/internal/wallets/:userId/unlock
// ---------------------------------------------------------------------------
const setWalletLock = (locked) => async (req, res, next) => {
  try {
    const wallet = await Wallet.findOneAndUpdate(
      { user: req.params.userId },
      { isLocked: locked },
      { new: true }
    );
    if (!wallet) return res.status(404).json({ success: false, message: 'Wallet not found' });
    return res.json({ success: true, message: `Wallet ${locked ? 'locked' : 'unlocked'}`, wallet });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Jobs management (admin CRUD)
// ---------------------------------------------------------------------------
const listJobsAdmin = async (req, res, next) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    return res.json({ success: true, jobs });
  } catch (err) {
    next(err);
  }
};

const upsertJob = async (req, res, next) => {
  try {
    const job = await Job.findOneAndUpdate(
      { key: req.body.key },
      { $set: req.body },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return res.json({ success: true, message: 'Job saved', job });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Market items management (admin CRUD) + manual price override
// ---------------------------------------------------------------------------
const listMarketItemsAdmin = async (req, res, next) => {
  try {
    const items = await MarketItem.find().sort({ createdAt: -1 });
    const prices = await MarketPrice.find({ item: { $in: items.map((i) => i._id) } });
    const priceMap = new Map(prices.map((p) => [p.item.toString(), p]));

    const combined = items.map((item) => ({
      ...item.toObject(),
      currentPrice: priceMap.get(item._id.toString())?.currentPrice ?? item.basePrice,
    }));

    return res.json({ success: true, items: combined });
  } catch (err) {
    next(err);
  }
};

const upsertMarketItem = async (req, res, next) => {
  try {
    const item = await MarketItem.findOneAndUpdate(
      { key: req.body.key },
      { $set: req.body },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    // Ensure a MarketPrice doc exists, seeded at basePrice
    await MarketPrice.findOneAndUpdate(
      { item: item._id },
      { $setOnInsert: { currentPrice: item.basePrice, previousPrice: item.basePrice } },
      { upsert: true }
    );

    return res.json({ success: true, message: 'Market item saved', item });
  } catch (err) {
    next(err);
  }
};

/**
 * Direct price override — this is the "admin controls prices in realtime"
 * feature the whole project hinges on. Setting newPrice overrides the LIVE
 * fluctuating price immediately; setting newBasePrice moves the anchor the
 * price engine drifts around (gentler, takes effect over time).
 */
const adjustPrice = async (req, res, next) => {
  try {
    const { itemKey, newPrice, newBasePrice } = req.body;
    const item = await MarketItem.findOne({ key: itemKey });
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    if (newBasePrice) {
      item.basePrice = newBasePrice;
      await item.save();
    }

    if (newPrice) {
      const priceDoc = await MarketPrice.findOneAndUpdate(
        { item: item._id },
        {
          previousPrice: (await MarketPrice.findOne({ item: item._id }))?.currentPrice,
          currentPrice: newPrice,
          lastAdminOverrideAt: new Date(),
          $push: { history: { $each: [{ price: newPrice, at: new Date() }], $slice: -200 } },
        },
        { new: true, upsert: true }
      );

      // Broadcast the override to every connected player immediately
      getIO()?.emit('market:price_update', { itemKey, currentPrice: priceDoc.currentPrice });
    }

    return res.json({ success: true, message: 'Price updated', item });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/internal/payment-products — the full catalog, active + inactive,
// for the admin Chrono Store page. Mirrors listMarketItemsAdmin above.
// ---------------------------------------------------------------------------
const listPaymentProductsAdmin = async (req, res, next) => {
  try {
    const products = await PaymentProduct.find().sort({ sortOrder: 1, createdAt: -1 });
    return res.json({ success: true, products });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/internal/payment-products — create or edit a Chrono Store
// bundle. Mirrors upsertMarketItem above (findOneAndUpdate by key, upsert).
// This is the ONLY way to add/edit products now besides re-running
// seed/seedPaymentProducts.js — that seed script remains useful for a fresh
// environment, this endpoint is for live tuning without a redeploy.
// ---------------------------------------------------------------------------
const upsertPaymentProduct = async (req, res, next) => {
  try {
    const product = await PaymentProduct.findOneAndUpdate(
      { key: req.body.key },
      { $set: req.body },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return res.json({ success: true, message: 'Product saved', product });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/internal/payment-transactions?page=1&limit=25&status=&userId=
// Every sandbox purchase attempt, success or failure, across every player —
// the admin equivalent of a payment gateway's transactions dashboard. Kept
// separate from the player-scoped GET /api/payments/history (payments.
// controller.js), which only ever shows a player their own purchases.
// ---------------------------------------------------------------------------
const listPaymentTransactionsAdmin = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 25, 100);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.userId) filter.user = req.query.userId;

    const [transactions, total] = await Promise.all([
      PaymentTransaction.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      PaymentTransaction.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      transactions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/internal/wallets/:userId/debit-shards  { amount, reason }
// Same trusted-service pattern as the VC credit/debit above — lets any
// backend (today: crime-service, to rush a cooldown) spend a player's
// Chrono Shards without owning the Wallet model itself. Never mints shards
// this way; only spends existing ones (see utils/shardService.js#debitShards).
// ---------------------------------------------------------------------------
const debitShardsInternal = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;

    let wallet;
    try {
      wallet = await debitShards(userId, amount, { type: 'SPEEDUP', description: reason, meta: { crossService: true } });
    } catch (e) {
      if (e instanceof InsufficientShardsError) {
        return res.status(400).json({ success: false, message: 'User has insufficient Chrono Shards for this debit' });
      }
      throw e;
    }

    getIO()?.to(`user:${userId}`).emit('wallet:update', { chronoShards: wallet.chronoShards });

    return res.json({ success: true, message: 'Chrono Shards debited', chronoShards: wallet.chronoShards });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/internal/wallets/:userId/credit-shards  { amount, reason }
// Mirrors debitShardsInternal above — lets a trusted backend (crime-service,
// for its own small "you found a shard" bonus on a successful crime) mint a
// small amount of Chrono Shards, same way ADMIN_CREDIT does for VC.
// ---------------------------------------------------------------------------
const creditShardsInternal = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;

    const wallet = await creditShards(userId, amount, { type: 'EARNED', description: reason, meta: { crossService: true } });

    getIO()?.to(`user:${userId}`).emit('wallet:update', { chronoShards: wallet.chronoShards });

    return res.json({ success: true, message: 'Chrono Shards credited', chronoShards: wallet.chronoShards });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getOverview,
  listWallets,
  getWalletByUserId,
  adminCreditWallet,
  adminDebitWallet,
  debitShardsInternal,
  creditShardsInternal,
  lockWallet: setWalletLock(true),
  unlockWallet: setWalletLock(false),
  listJobsAdmin,
  upsertJob,
  listMarketItemsAdmin,
  upsertMarketItem,
  adjustPrice,
  listPaymentProductsAdmin,
  upsertPaymentProduct,
  listPaymentTransactionsAdmin,
  hasWeapon,
};
