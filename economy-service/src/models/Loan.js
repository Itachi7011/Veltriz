const mongoose = require('mongoose');

const LoanSchema = new mongoose.Schema(
  {
    user: { type: String, required: true, unique: true }, // one active loan at a time, like the House model's one-house rule
    principal: { type: Number, required: true },
    balance: { type: Number, required: true }, // principal + accrued interest, minus repayments
    interestRatePercent: { type: Number, required: true }, // per accrual tick, see cron/loanInterest.js
    takenAt: { type: Date, default: Date.now },
    lastAccrualAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Loan', LoanSchema);
