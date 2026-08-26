const Loan = require('../models/Loan');
const { creditWallet, debitWallet, InsufficientFundsError } = require('../utils/walletService');

const MAX_LOAN_AMOUNT = 2000; // VC — flat cap for now, no credit-score system yet (being upfront about that)
const ACCRUAL_RATE_PERCENT = 1; // interest added per accrual tick
const ACCRUAL_INTERVAL_MS = 60 * 60 * 1000; // 1 real-hour per tick — see cron/loanInterest.js

// ---------------------------------------------------------------------------
// GET /api/creditunion/me
// ---------------------------------------------------------------------------
const getMyLoan = async (req, res, next) => {
  try {
    const loan = await Loan.findOne({ user: req.user.id });
    return res.json({
      success: true,
      loan: loan
        ? { principal: loan.principal, balance: Math.round(loan.balance), interestRatePercent: loan.interestRatePercent, takenAt: loan.takenAt }
        : null,
      maxLoanAmount: MAX_LOAN_AMOUNT,
      accrualRatePercent: ACCRUAL_RATE_PERCENT,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/creditunion/borrow  { amount }
// ---------------------------------------------------------------------------
const borrow = async (req, res, next) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0 || amount > MAX_LOAN_AMOUNT) {
      return res.status(400).json({ success: false, message: `Loan amount must be 1-${MAX_LOAN_AMOUNT} VC.` });
    }

    const existing = await Loan.findOne({ user: req.user.id });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Pay off your current loan before taking another.' });
    }

    await Loan.create({
      user: req.user.id,
      principal: amount,
      balance: amount,
      interestRatePercent: ACCRUAL_RATE_PERCENT,
    });

    await creditWallet(req.user.id, amount, { type: 'LOAN_DISBURSEMENT', description: 'Credit Union: loan disbursed' });

    return res.json({ success: true, message: `${amount} VC deposited. Interest accrues hourly until it's repaid.` });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/creditunion/repay  { amount }
// ---------------------------------------------------------------------------
const repay = async (req, res, next) => {
  try {
    const loan = await Loan.findOne({ user: req.user.id });
    if (!loan) return res.status(400).json({ success: false, message: 'You have no loan to repay.' });

    const amount = Math.min(Number(req.body.amount) || 0, Math.round(loan.balance));
    if (amount <= 0) return res.status(400).json({ success: false, message: 'Enter a repayment amount.' });

    try {
      await debitWallet(req.user.id, amount, { type: 'LOAN_REPAYMENT', description: 'Credit Union: loan repayment' });
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        return res.status(400).json({ success: false, message: 'Not enough VC for that repayment.' });
      }
      throw err;
    }

    loan.balance -= amount;
    if (loan.balance <= 0.5) {
      await Loan.deleteOne({ _id: loan._id });
      return res.json({ success: true, message: "Loan fully repaid — you're debt-free.", balance: 0 });
    }

    await loan.save();
    return res.json({ success: true, message: `Repaid ${amount} VC.`, balance: Math.round(loan.balance) });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyLoan, borrow, repay, ACCRUAL_RATE_PERCENT, ACCRUAL_INTERVAL_MS };
