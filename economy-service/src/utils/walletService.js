const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const EconomyState = require('../models/EconomyState');

class InsufficientFundsError extends Error {
  constructor(message = 'Insufficient balance') {
    super(message);
    this.statusCode = 400;
  }
}

/**
 * Credits a wallet. Uses a single atomic findOneAndUpdate ($inc) so
 * concurrent credits never race/overwrite each other, then writes an
 * immutable ledger entry.
 */
const creditWallet = async (userId, amount, { type, description, meta } = {}) => {
  if (amount <= 0) throw new Error('Credit amount must be positive');

  const wallet = await Wallet.findOneAndUpdate(
    { user: userId },
    { $inc: { balance: amount } },
    { new: true, upsert: false }
  );

  if (!wallet) throw new Error('Wallet not found');

  await Transaction.create({
    user: userId,
    type,
    amount,
    balanceAfter: wallet.balance,
    description,
    meta,
  });

  await EconomyState.findByIdAndUpdate(
    'global',
    { $inc: { totalCoinsInCirculation: amount } },
    { upsert: true }
  );

  return wallet;
};

/**
 * Debits a wallet ONLY if sufficient balance exists. The balance check is
 * baked into the query filter itself (balance: {$gte: amount}) so this is
 * safe under concurrent requests — no separate read-then-write race window.
 */
const debitWallet = async (userId, amount, { type, description, meta } = {}) => {
  if (amount <= 0) throw new Error('Debit amount must be positive');

  const wallet = await Wallet.findOneAndUpdate(
    { user: userId, balance: { $gte: amount }, isLocked: { $ne: true } },
    { $inc: { balance: -amount } },
    { new: true }
  );

  if (!wallet) {
    const existing = await Wallet.findOne({ user: userId });
    if (existing?.isLocked) throw new Error('Wallet is locked');
    throw new InsufficientFundsError();
  }

  await Transaction.create({
    user: userId,
    type,
    amount: -amount,
    balanceAfter: wallet.balance,
    description,
    meta,
  });

  await EconomyState.findByIdAndUpdate(
    'global',
    { $inc: { totalCoinsInCirculation: -amount } },
    { upsert: true }
  );

  return wallet;
};

module.exports = { creditWallet, debitWallet, InsufficientFundsError };
