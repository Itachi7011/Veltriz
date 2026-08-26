const PlayerInsurance = require('../models/PlayerInsurance');
const { debitWallet, InsufficientFundsError } = require('../utils/walletService');

const PREMIUM = 100; // VC per period
const COVERAGE_DAYS = 3;
const HEALTH_DISCOUNT_PERCENT = 25; // applied in market.controller.js#buyItem for category 'medicine'

const isActive = (insurance) => !!insurance?.healthInsuranceActive && insurance.expiresAt && new Date(insurance.expiresAt) > new Date();

// ---------------------------------------------------------------------------
// GET /api/insurance/me
// ---------------------------------------------------------------------------
const getMyInsurance = async (req, res, next) => {
  try {
    const insurance = await PlayerInsurance.findOne({ user: req.user.id });
    return res.json({
      success: true,
      active: isActive(insurance),
      expiresAt: insurance?.expiresAt || null,
      premium: PREMIUM,
      coverageDays: COVERAGE_DAYS,
      discountPercent: HEALTH_DISCOUNT_PERCENT,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/insurance/subscribe — pay premium, activate/extend coverage
// ---------------------------------------------------------------------------
const subscribe = async (req, res, next) => {
  try {
    try {
      await debitWallet(req.user.id, PREMIUM, { type: 'INSURANCE_PREMIUM', description: 'Insurance: health premium' });
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        return res.status(400).json({ success: false, message: `Not enough VC — premium is ${PREMIUM} VC.` });
      }
      throw err;
    }

    let insurance = await PlayerInsurance.findOne({ user: req.user.id });
    const base = isActive(insurance) ? new Date(insurance.expiresAt) : new Date();
    const expiresAt = new Date(base.getTime() + COVERAGE_DAYS * 24 * 60 * 60 * 1000);

    if (!insurance) {
      insurance = await PlayerInsurance.create({ user: req.user.id, healthInsuranceActive: true, expiresAt });
    } else {
      insurance.healthInsuranceActive = true;
      insurance.expiresAt = expiresAt;
      await insurance.save();
    }

    return res.json({
      success: true,
      message: `Covered until ${expiresAt.toDateString()} — ${HEALTH_DISCOUNT_PERCENT}% off Hospital purchases.`,
      expiresAt,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyInsurance, subscribe, isActive, HEALTH_DISCOUNT_PERCENT };
