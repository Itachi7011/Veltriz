const { resolveDrawIfDue } = require('../controllers/lottery.controller');
const logger = require('../utils/logger');

const CHECK_INTERVAL_MS = 30 * 1000;

const startLotteryDraw = () => {
  setInterval(async () => {
    try {
      await resolveDrawIfDue();
    } catch (err) {
      logger.error('[economy-service] Lottery draw tick failed:', err.message);
    }
  }, CHECK_INTERVAL_MS);

  logger.info('[economy-service] Lottery draw cycle running (30min draws)');
};

module.exports = { startLotteryDraw };
