const Wallet = require('../models/Wallet');
const ShardTransaction = require('../models/ShardTransaction');

class InsufficientShardsError extends Error {
  constructor(message = 'Not enough Chrono Shards') {
    super(message);
    this.statusCode = 400;
  }
}

/**
 * Credits Chrono Shards. Same atomic findOneAndUpdate($inc) pattern as
 * walletService.js#creditWallet, for the same reason: concurrent credits
 * (e.g. a purchase confirming right as a job shift pays out its small
 * "found a shard" bonus) must never race/overwrite each other.
 */
const creditShards = async (userId, amount, { type, description, meta } = {}) => {
  if (amount <= 0) throw new Error('Shard credit amount must be positive');

  const wallet = await Wallet.findOneAndUpdate(
    { user: userId },
    { $inc: { chronoShards: amount } },
    { new: true, upsert: false }
  );
  if (!wallet) throw new Error('Wallet not found');

  await ShardTransaction.create({
    user: userId,
    type,
    amount,
    balanceAfter: wallet.chronoShards,
    description,
    meta,
  });

  return wallet;
};

/**
 * Debits Chrono Shards, only if the balance covers it — filter-baked check,
 * same race-free approach as walletService.js#debitWallet.
 */
const debitShards = async (userId, amount, { type, description, meta } = {}) => {
  if (amount <= 0) throw new Error('Shard debit amount must be positive');

  const wallet = await Wallet.findOneAndUpdate(
    { user: userId, chronoShards: { $gte: amount } },
    { $inc: { chronoShards: -amount } },
    { new: true }
  );

  if (!wallet) throw new InsufficientShardsError();

  await ShardTransaction.create({
    user: userId,
    type,
    amount: -amount,
    balanceAfter: wallet.chronoShards,
    description,
    meta,
  });

  return wallet;
};

module.exports = { creditShards, debitShards, InsufficientShardsError };
