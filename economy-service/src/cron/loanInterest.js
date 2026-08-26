const Loan = require('../models/Loan');
const logger = require('../utils/logger');
const { ACCRUAL_RATE_PERCENT, ACCRUAL_INTERVAL_MS } = require('../controllers/creditunion.controller');

/**
 * Compounds every open loan's balance by ACCRUAL_RATE_PERCENT on each tick.
 * Deliberately simple: no forced garnishment or credit-score penalty for an
 * overdue loan yet (being upfront about that gap) — the real stakes right
 * now are that ignoring it makes the balance grow, same as real
 * compounding debt, without needing a whole collections system to make
 * that meaningful.
 */
const startLoanInterest = () => {
  setInterval(async () => {
    try {
      await Loan.updateMany({}, [
        { $set: { balance: { $multiply: ['$balance', 1 + ACCRUAL_RATE_PERCENT / 100] }, lastAccrualAt: new Date() } },
      ]);
    } catch (err) {
      logger.error('[economy-service] Loan interest tick failed:', err.message);
    }
  }, ACCRUAL_INTERVAL_MS);

  logger.info(`[economy-service] Loan interest running: +${ACCRUAL_RATE_PERCENT}% every ${ACCRUAL_INTERVAL_MS / 60000}min`);
};

module.exports = { startLoanInterest };
