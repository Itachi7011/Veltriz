const PaymentProduct = require('../models/PaymentProduct');
const PaymentTransaction = require('../models/PaymentTransaction');
const { creditShards } = require('../utils/shardService');
const { getActiveProvider } = require('../services/paymentProviders');

// ---------------------------------------------------------------------------
// GET /api/payments/products — the Chrono Store catalog
// ---------------------------------------------------------------------------
const listProducts = async (req, res, next) => {
  try {
    const products = await PaymentProduct.find({ isActive: true }).sort({ sortOrder: 1 });
    return res.json({ success: true, products, provider: getActiveProvider().name });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/payments/checkout  { productKey, testCardNumber? }
//
// Runs the full purchase flow through whichever provider is active
// (sandbox today). Always creates a PaymentTransaction row — succeeded OR
// failed — before touching the wallet, so there's a complete audit trail
// even for declines, exactly like a real gateway's dashboard would have.
// ---------------------------------------------------------------------------
const checkout = async (req, res, next) => {
  try {
    const { productKey, testCardNumber } = req.body;
    const product = await PaymentProduct.findOne({ key: productKey, isActive: true });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const provider = getActiveProvider();
    const result = await provider.charge({
      userId: req.user.id,
      amountUSD: product.priceUSD,
      productKey: product.key,
      testCardNumber,
    });

    const totalShards = product.shardAmount + (product.bonusShardAmount || 0);

    const paymentTx = await PaymentTransaction.create({
      user: req.user.id,
      productKey: product.key,
      amountUSD: product.priceUSD,
      shardsGranted: result.success ? totalShards : 0,
      provider: provider.name,
      providerRef: result.providerRef,
      status: result.success ? 'succeeded' : 'failed',
      failureReason: result.failureReason,
    });

    if (!result.success) {
      return res.status(402).json({ success: false, message: result.failureReason || 'Payment failed', transaction: paymentTx });
    }

    const wallet = await creditShards(req.user.id, totalShards, {
      type: 'PURCHASE',
      description: `Bought ${product.name} (sandbox payment)`,
      meta: { productKey: product.key, providerRef: result.providerRef },
    });

    return res.json({
      success: true,
      message: `+${totalShards} Chrono Shards!`,
      shardsGranted: totalShards,
      chronoShards: wallet.chronoShards,
      transaction: paymentTx,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/payments/history?page=1&limit=20
// ---------------------------------------------------------------------------
const getHistory = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const [transactions, total] = await Promise.all([
      PaymentTransaction.find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      PaymentTransaction.countDocuments({ user: req.user.id }),
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

module.exports = { listProducts, checkout, getHistory };
