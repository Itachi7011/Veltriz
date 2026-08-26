const axios = require('axios');
const logger = require('../utils/logger');

const gameWorldInternal = axios.create({
  baseURL: process.env.GAME_WORLD_SERVICE_URL,
  timeout: 10000,
  headers: {
    'X-Internal-Api-Key': process.env.INTERNAL_API_KEY,
  },
});

/**
 * Reads the Mayor's current tax rate for startShift's salary calculation
 * (see jobs.controller.js). Fails OPEN (returns 0% tax) on any error —
 * politics being unreachable should never block a player from getting
 * paid. A short timeout keeps a slow/down game-world-service from stalling
 * every single shift completion.
 */
const getTaxRatePercent = async () => {
  try {
    const { data } = await gameWorldInternal.get('/api/internal/government', { timeout: 3000 });
    return data.taxRatePercent || 0;
  } catch (err) {
    logger.warn('[economy-service] Could not fetch tax rate, defaulting to 0%:', err.message);
    return 0;
  }
};

module.exports = { gameWorldInternal, getTaxRatePercent };
