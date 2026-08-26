const axios = require('axios');
const logger = require('../utils/logger');

const economyInternal = axios.create({
  baseURL: process.env.ECONOMY_SERVICE_URL,
  timeout: 10000,
  headers: {
    'X-Internal-Api-Key': process.env.INTERNAL_API_KEY,
  },
});

class InsufficientFundsError extends Error {}

/**
 * Debits a player's wallet in economy-service. Used by the Gym (workout
 * fee), Cinema (ticket price), and Real Estate Agency (house purchase) — any
 * paid action this service owns whose cost has to actually leave the
 * player's real wallet. Always throws on failure (never fire-and-forget
 * like crime-service's payout call) — none of these three should ever
 * apply their effect (stats change / house ownership) if payment failed.
 */
const debitWallet = async (userId, amount, description) => {
  try {
    await economyInternal.post(`/api/internal/wallets/${userId}/debit`, {
      amount,
      reason: description,
    });
  } catch (err) {
    if (err.response?.status === 400) {
      throw new InsufficientFundsError(err.response.data?.message || 'Insufficient balance');
    }
    logger.error(`[game-world-service] Wallet debit failed for user ${userId}:`, err.message);
    throw err;
  }
};

/**
 * Credits a player's wallet in economy-service. Used by Real Estate's resale
 * (see realestate.controller.js#sellHouse). Fire-and-forget-safe isn't
 * appropriate here either — if the credit call fails we do NOT want to have
 * already cleared the house's owner, so the caller awaits this and only
 * proceeds on success.
 */
const creditWallet = async (userId, amount, description) => {
  await economyInternal.post(`/api/internal/wallets/${userId}/credit`, {
    amount,
    reason: description,
  });
};

module.exports = { debitWallet, creditWallet, InsufficientFundsError };
