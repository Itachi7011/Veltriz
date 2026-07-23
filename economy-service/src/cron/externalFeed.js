const axios = require('axios');
const EconomyState = require('../models/EconomyState');
const logger = require('../utils/logger');

/**
 * Fetches a real USD->INR exchange rate from frankfurter.app — a genuinely
 * free, no-API-key-required service backed by European Central Bank data.
 * This is a REFERENCE signal only, shown on the admin dashboard so the
 * admin can eyeball real-world movement — it never auto-updates in-game
 * prices. That stays a deliberate admin action (see adjustPrice), per the
 * design doc's "admin controls prices in realtime" requirement.
 *
 * If the request fails (no internet, service down), we just log and skip —
 * this must never crash the service.
 */
const fetchExternalReference = async () => {
  if (process.env.ENABLE_EXTERNAL_REFERENCE_FEED !== 'true') return;

  try {
    const { data } = await axios.get('https://api.frankfurter.app/latest', {
      params: { from: 'USD', to: 'INR' },
      timeout: 8000,
    });

    const rate = data?.rates?.INR;
    if (!rate) throw new Error('Unexpected response shape from frankfurter.app');

    await EconomyState.findByIdAndUpdate(
      'global',
      {
        externalReferenceRates: {
          USD_INR: rate,
          fetchedAt: new Date(),
        },
      },
      { upsert: true }
    );

    logger.info(`[external-feed] USD/INR reference updated: ${rate}`);
  } catch (err) {
    logger.warn('[external-feed] Failed to fetch reference rate (non-fatal):', err.message);
  }
};

const startExternalFeed = () => {
  if (process.env.ENABLE_EXTERNAL_REFERENCE_FEED !== 'true') {
    logger.info('[external-feed] Disabled via env');
    return;
  }
  const intervalMs = parseInt(process.env.EXTERNAL_FEED_INTERVAL_MS, 10) || 3600000;
  fetchExternalReference(); // run once at startup
  setInterval(fetchExternalReference, intervalMs);
  logger.info(`[external-feed] Started, refreshing every ${intervalMs}ms`);
};

module.exports = { startExternalFeed, fetchExternalReference };
