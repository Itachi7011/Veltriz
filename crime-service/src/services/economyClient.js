const axios = require('axios');
const logger = require('../utils/logger');

const economyInternal = axios.create({
  baseURL: process.env.ECONOMY_SERVICE_URL,
  timeout: 10000,
  headers: {
    'X-Internal-Api-Key': process.env.INTERNAL_API_KEY,
  },
});

/**
 * Pays out a successful crime attempt by crediting the player's wallet in
 * economy-service. Reuses economy-service's existing admin-credit endpoint —
 * that route only checks the shared internal key, not the caller's identity,
 * so any trusted backend service (not just admin-service) can call it.
 *
 * Never throws: a wallet-credit failure shouldn't corrupt the crime attempt
 * response the player already saw. Errors are logged; ops can reconcile
 * from crime-service's own totalEarned ledger if this ever happens.
 */
const creditWalletForCrime = async (userId, amount, description) => {
  try {
    await economyInternal.post(`/api/internal/wallets/${userId}/credit`, {
      amount,
      reason: description,
    });
    return true;
  } catch (err) {
    logger.error(`[crime-service] Failed to credit wallet for user ${userId}:`, err.message);
    return false;
  }
};

class InsufficientFundsError extends Error {}

/**
 * Debits the player's wallet to pay off a heat fine at the Police Station
 * (see controllers/crime.controller.js#payFine). Unlike creditWalletForCrime,
 * this DOES throw on failure — heat must not be reduced if payment fails.
 */
const debitWalletForFine = async (userId, amount, description) => {
  try {
    await economyInternal.post(`/api/internal/wallets/${userId}/debit`, {
      amount,
      reason: description,
    });
  } catch (err) {
    if (err.response?.status === 400) {
      throw new InsufficientFundsError(err.response.data?.message || 'Insufficient balance');
    }
    logger.error(`[crime-service] Failed to debit wallet for user ${userId}:`, err.message);
    throw err;
  }
};

class InsufficientShardsError extends Error {}

/**
 * Spends Chrono Shards to rush a crime cooldown — see
 * crime.controller.js#rushCooldown. Same trusted server-to-server call
 * economy-service's jobs.controller.js uses internally for the exact same
 * "rush a timer" purpose, just crossing a service boundary here since
 * crime-service doesn't own the Wallet model.
 */
const debitShardsForRush = async (userId, amount, description) => {
  try {
    await economyInternal.post(`/api/internal/wallets/${userId}/debit-shards`, {
      amount,
      reason: description,
    });
  } catch (err) {
    if (err.response?.status === 400) {
      throw new InsufficientShardsError(err.response.data?.message || 'Insufficient Chrono Shards');
    }
    logger.error(`[crime-service] Failed to debit shards for user ${userId}:`, err.message);
    throw err;
  }
};

/**
 * Checks whether the player owns any weapon-category item, for Dustridge
 * County's "more violence" theme to actually touch a mechanic — see
 * crime.controller.js#attemptCrime, where this adds a flat success-chance
 * bonus. Fails closed (returns false) on any error: if economy-service is
 * unreachable, a crime attempt should proceed at normal odds, not error
 * out or silently grant a bonus nobody can verify.
 */
const checkHasWeapon = async (userId) => {
  try {
    const { data } = await economyInternal.get(`/api/internal/inventory/${userId}/has-weapon`, { timeout: 3000 });
    return !!data.hasWeapon;
  } catch (err) {
    logger.warn(`[crime-service] Could not check weapon ownership for user ${userId}, defaulting to false:`, err.message);
    return false;
  }
};

/**
 * Small, capped Chrono Shard trickle on a successful crime — see
 * crime.controller.js#attemptCrime. Never throws: a shard-credit hiccup
 * shouldn't fail a crime attempt the player already saw succeed.
 */
const creditShardsForCrime = async (userId, amount, description) => {
  try {
    await economyInternal.post(`/api/internal/wallets/${userId}/credit-shards`, {
      amount,
      reason: description,
    });
    return true;
  } catch (err) {
    logger.warn(`[crime-service] Failed to credit shards for user ${userId}:`, err.message);
    return false;
  }
};

module.exports = {
  creditWalletForCrime,
  InsufficientFundsError,
  debitWalletForFine,
  checkHasWeapon,
  debitShardsForRush,
  creditShardsForCrime,
  InsufficientShardsError,
};
