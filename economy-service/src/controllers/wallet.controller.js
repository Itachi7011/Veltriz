const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const { creditWallet } = require('../utils/walletService');

const STARTING_BALANCES = {
  poor: () => parseInt(process.env.STARTING_BALANCE_POOR, 10) || 500,
  middle: () => parseInt(process.env.STARTING_BALANCE_MIDDLE, 10) || 2500,
  rich: () => parseInt(process.env.STARTING_BALANCE_RICH, 10) || 15000,
};

// ---------------------------------------------------------------------------
// POST /api/wallet/init  — idempotent, called once at character creation
// ---------------------------------------------------------------------------
const initWallet = async (req, res, next) => {
  try {
    const { background } = req.body;
    const userId = req.user.id;

    let wallet = await Wallet.findOne({ user: userId });
    if (wallet) {
      return res.json({ success: true, message: 'Wallet already exists', wallet });
    }

    wallet = await Wallet.create({ user: userId, balance: 0, background });

    const startingAmount = STARTING_BALANCES[background]();
    wallet = await creditWallet(userId, startingAmount, {
      type: 'STARTING_BALANCE',
      description: `Starting balance for ${background} background`,
    });

    return res.status(201).json({ success: true, message: 'Wallet created', wallet });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/wallet/me
// ---------------------------------------------------------------------------
const getMyWallet = async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) {
      return res.status(404).json({ success: false, message: 'Wallet not found. Create a character first.' });
    }
    return res.json({ success: true, wallet });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/wallet/transactions?page=1&limit=20
// ---------------------------------------------------------------------------
const getTransactions = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const [transactions, total] = await Promise.all([
      Transaction.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Transaction.countDocuments({ user: req.user.id }),
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

module.exports = { initWallet, getMyWallet, getTransactions };
