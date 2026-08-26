const { creditWallet, debitWallet, InsufficientFundsError } = require('../utils/walletService');
const CasinoRecord = require('../models/CasinoRecord');
const { getIO } = require('../sockets');

const MIN_BET = Number(process.env.CASINO_MIN_BET) || 10;
const MAX_BET = Number(process.env.CASINO_MAX_BET) || 500;
const WIN_CHANCE = Number(process.env.CASINO_WIN_CHANCE) || 0.47; // slight house edge, like a real coin-flip table
const COOLDOWN_MS = Number(process.env.CASINO_COOLDOWN_MS) || 3000; // anti-spam, not a real gameplay throttle

const getOrCreateRecord = async (userId) => {
  let record = await CasinoRecord.findOne({ user: userId });
  if (!record) record = await CasinoRecord.create({ user: userId });
  return record;
};

// ---------------------------------------------------------------------------
// GET /api/casino/me
// ---------------------------------------------------------------------------
const getMyStatus = async (req, res, next) => {
  try {
    const record = await getOrCreateRecord(req.user.id);
    const elapsed = record.lastBetAt ? Date.now() - new Date(record.lastBetAt).getTime() : Infinity;
    const remaining = elapsed < COOLDOWN_MS ? Math.ceil((COOLDOWN_MS - elapsed) / 1000) : 0;

    return res.json({
      success: true,
      minBet: MIN_BET,
      maxBet: MAX_BET,
      totalWagered: record.totalWagered,
      totalWon: record.totalWon,
      totalLost: record.totalLost,
      cooldownRemainingSeconds: remaining,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/casino/bet  { amount } — coin flip, win doubles the stake
// ---------------------------------------------------------------------------
const placeBet = async (req, res, next) => {
  try {
    const { amount } = req.body;

    if (amount < MIN_BET || amount > MAX_BET) {
      return res.status(400).json({ success: false, message: `Bet must be between ${MIN_BET} and ${MAX_BET} VC.` });
    }

    const record = await getOrCreateRecord(req.user.id);
    if (record.lastBetAt) {
      const elapsed = Date.now() - new Date(record.lastBetAt).getTime();
      if (elapsed < COOLDOWN_MS) {
        return res
          .status(429)
          .json({ success: false, message: 'Slow down.', remainingSeconds: Math.ceil((COOLDOWN_MS - elapsed) / 1000) });
      }
    }

    let wallet;
    try {
      wallet = await debitWallet(req.user.id, amount, {
        type: 'CASINO_BET',
        description: 'Casino: Coin Flip wager',
      });
    } catch (e) {
      if (e instanceof InsufficientFundsError) {
        return res.status(400).json({ success: false, message: 'Insufficient balance for this bet.' });
      }
      throw e;
    }

    const isWin = Math.random() < WIN_CHANCE;
    let payout = 0;

    if (isWin) {
      payout = amount * 2;
      wallet = await creditWallet(req.user.id, payout, {
        type: 'CASINO_WIN',
        description: 'Casino: Coin Flip win',
      });
      record.totalWon += payout - amount;
    } else {
      record.totalLost += amount;
    }

    record.totalWagered += amount;
    record.lastBetAt = new Date();
    await record.save();

    getIO()?.to(`user:${req.user.id}`).emit('wallet:update', { balance: wallet.balance });

    return res.json({
      success: true,
      outcome: isWin ? 'win' : 'lose',
      amount,
      payout,
      balance: wallet.balance,
      message: isWin ? `The coin lands your way — you win ${payout} VC!` : 'The coin doesn\u2019t land your way this time.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMyStatus, placeBet };
