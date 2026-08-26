const CrimeRecord = require('../models/CrimeRecord');
const logger = require('../utils/logger');

const DECAY_AMOUNT = Number(process.env.HEAT_DECAY_AMOUNT) || 2;
const DECAY_INTERVAL_MS = Number(process.env.HEAT_DECAY_INTERVAL_MS) || 120000;

/**
 * Heat should never be a permanent state — without this, a player who
 * gets caught once stays at reduced odds forever unless an admin manually
 * resets them. Runs on a plain interval (not a cron schedule string) since
 * the decay tick is meant to be tunable in seconds/minutes via env, not
 * fixed to clock times.
 */
const startHeatDecay = () => {
  setInterval(async () => {
    try {
      await CrimeRecord.updateMany(
        { heat: { $gt: 0 } },
        [{ $set: { heat: { $max: [0, { $subtract: ['$heat', DECAY_AMOUNT] }] } } }]
      );
    } catch (err) {
      logger.error('[crime-service] Heat decay tick failed:', err.message);
    }
  }, DECAY_INTERVAL_MS);

  logger.info(`[crime-service] Heat decay running: -${DECAY_AMOUNT} heat every ${DECAY_INTERVAL_MS / 1000}s`);
};

module.exports = { startHeatDecay };
