const CrimeAction = require('../models/CrimeAction');
const CrimeRecord = require('../models/CrimeRecord');
const {
  creditWalletForCrime,
  debitWalletForFine,
  checkHasWeapon,
  InsufficientFundsError,
  debitShardsForRush,
  creditShardsForCrime,
  InsufficientShardsError,
} = require('../services/economyClient');

const DANGEROUS_HEAT_THRESHOLD = 70;
const MAX_HEAT = 100;
const FINE_PER_HEAT_POINT = 5; // VC — paying off heat at the Police Station
const LEGAL_FEE_PER_HEAT_POINT = 3; // VC — cheaper, but only a chance at the Courthouse
const COURTHOUSE_SUCCESS_CHANCE = 0.5;
const ARMED_SUCCESS_BONUS = 0.1; // +10 percentage points if the player owns any weapon-category item

// Same modest trickle as economy-service's job shifts (jobs.controller.js's
// SHIFT_SHARD_CHANCE) — a successful crime has a small chance to also turn
// up a Chrono Shard, kept deliberately rare so this never becomes a
// meaningful shard-farming loop.
const CRIME_SHARD_CHANCE = 0.15;
const CRIME_SHARD_AMOUNT = 1;

const getOrCreateRecord = async (userId) => {
  let record = await CrimeRecord.findOne({ user: userId });
  if (!record) {
    record = await CrimeRecord.create({ user: userId });
  }
  return record;
};

// Riskier crimes (lower baseSuccessChance) draw more heat per attempt, and a
// failed attempt always draws more than a success (you got noticed either
// way, but getting caught draws far more attention).
const computeHeatGain = (action, wasSuccess) => {
  const riskFactor = 1 - action.baseSuccessChance; // 0 (safe) .. 1 (very risky)
  const base = wasSuccess ? 5 + riskFactor * 15 : 10 + riskFactor * 20;
  return Math.round(base);
};

const cooldownRemainingSeconds = (record, action) => {
  const lastAt = record.lastAttempts?.get(action.key);
  if (!lastAt) return 0;
  const cooldownMs = action.cooldownMinutes * 60 * 1000;
  const elapsed = Date.now() - new Date(lastAt).getTime();
  const remainingMs = cooldownMs - elapsed;
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
};

// ---------------------------------------------------------------------------
// GET /api/crime/actions
// ---------------------------------------------------------------------------
const listActions = async (req, res, next) => {
  try {
    const actions = await CrimeAction.find({ isActive: true }).sort({ baseSuccessChance: -1 });
    return res.json({
      success: true,
      actions: actions.map((a) => ({
        key: a.key,
        title: a.title,
        description: a.description,
        icon: a.icon,
        baseSuccessChance: a.baseSuccessChance,
        minPayout: a.minPayout,
        maxPayout: a.maxPayout,
        cooldownMinutes: a.cooldownMinutes,
      })),
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/crime/me
// ---------------------------------------------------------------------------
const getMyStatus = async (req, res, next) => {
  try {
    const [record, actions] = await Promise.all([
      getOrCreateRecord(req.user.id),
      CrimeAction.find({ isActive: true }),
    ]);

    const cooldowns = {};
    actions.forEach((action) => {
      const remaining = cooldownRemainingSeconds(record, action);
      if (remaining > 0) cooldowns[action.key] = remaining;
    });

    return res.json({
      success: true,
      heat: record.heat,
      isDangerous: record.heat >= DANGEROUS_HEAT_THRESHOLD,
      totalAttempts: record.totalAttempts,
      totalSuccesses: record.totalSuccesses,
      totalEarned: record.totalEarned,
      cooldowns,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/crime/attempt  { actionKey }
// ---------------------------------------------------------------------------
const attemptCrime = async (req, res, next) => {
  try {
    const { actionKey } = req.body;

    const action = await CrimeAction.findOne({ key: actionKey, isActive: true });
    if (!action) {
      return res.status(404).json({ success: false, message: 'Crime action not found' });
    }

    const record = await getOrCreateRecord(req.user.id);

    const remainingSeconds = cooldownRemainingSeconds(record, action);
    if (remainingSeconds > 0) {
      return res.status(429).json({
        success: false,
        message: 'This action is on cooldown',
        remainingSeconds,
      });
    }

    const isDangerous = record.heat >= DANGEROUS_HEAT_THRESHOLD;
    const isArmed = await checkHasWeapon(req.user.id);
    let effectiveChance = isDangerous ? action.baseSuccessChance / 2 : action.baseSuccessChance;
    if (isArmed) effectiveChance = Math.min(0.95, effectiveChance + ARMED_SUCCESS_BONUS);
    const isSuccess = Math.random() < effectiveChance;

    const payout = isSuccess
      ? Math.round(action.minPayout + Math.random() * (action.maxPayout - action.minPayout))
      : 0;

    const heatGain = computeHeatGain(action, isSuccess);
    record.heat = Math.min(MAX_HEAT, record.heat + heatGain);
    record.totalAttempts += 1;
    if (isSuccess) {
      record.totalSuccesses += 1;
      record.totalEarned += payout;
    }
    if (!record.lastAttempts) record.lastAttempts = new Map();
    record.lastAttempts.set(action.key, new Date());
    await record.save();

    if (isSuccess && payout > 0) {
      await creditWalletForCrime(req.user.id, payout, `Crime: ${action.title}`);
    }

    let shardsEarned = 0;
    if (isSuccess && Math.random() < CRIME_SHARD_CHANCE) {
      shardsEarned = CRIME_SHARD_AMOUNT;
      await creditShardsForCrime(req.user.id, shardsEarned, `Found a Chrono Shard: ${action.title}`);
    }

    return res.json({
      success: true,
      outcome: isSuccess ? 'success' : 'fail',
      payout,
      shardsEarned,
      wasArmed: isArmed,
      message: isSuccess
        ? `You pulled it off and got away with ${payout} VC.`
        : 'You got caught before you could finish — no payout this time.',
      heatAfter: record.heat,
      nextAttemptAvailableInSeconds: action.cooldownMinutes * 60,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/crime/pay-fine — the Police Station's legal way to clear heat,
// instead of waiting for it to decay on its own. Debits the wallet BEFORE
// reducing heat, so a failed payment never gives a free discount.
// ---------------------------------------------------------------------------
const payFine = async (req, res, next) => {
  try {
    const record = await getOrCreateRecord(req.user.id);

    if (record.heat <= 0) {
      return res.status(400).json({ success: false, message: "You're clean — nothing to pay off." });
    }

    const fine = record.heat * FINE_PER_HEAT_POINT;

    try {
      await debitWalletForFine(req.user.id, fine, 'Police Station: heat fine');
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        return res.status(400).json({ success: false, message: `Not enough VC — the fine is ${fine} VC.` });
      }
      throw err;
    }

    const heatCleared = record.heat;
    record.heat = 0;
    await record.save();

    return res.json({
      success: true,
      message: `Paid ${fine} VC. Your record is clean.`,
      fine,
      heatCleared,
      heatAfter: 0,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/crime/contest-fine — the Courthouse's gamble: a cheaper legal
// fee than the Police Station's guaranteed fine, but only a 50% chance it
// actually clears your heat. Losing the case still costs the legal fee —
// that's the real risk, distinguishing this from Police Station's
// guaranteed-but-pricier option.
// ---------------------------------------------------------------------------
const contestFine = async (req, res, next) => {
  try {
    const record = await getOrCreateRecord(req.user.id);

    if (record.heat <= 0) {
      return res.status(400).json({ success: false, message: "You're clean — nothing to contest." });
    }

    const legalFee = Math.round(record.heat * LEGAL_FEE_PER_HEAT_POINT);

    try {
      await debitWalletForFine(req.user.id, legalFee, 'Courthouse: legal fee');
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        return res.status(400).json({ success: false, message: `Not enough VC — the legal fee is ${legalFee} VC.` });
      }
      throw err;
    }

    const won = Math.random() < COURTHOUSE_SUCCESS_CHANCE;
    const heatCleared = won ? record.heat : 0;
    if (won) {
      record.heat = 0;
      await record.save();
    }

    return res.json({
      success: true,
      won,
      legalFee,
      heatCleared,
      heatAfter: record.heat,
      message: won
        ? `Case won! Paid ${legalFee} VC and your record is clean.`
        : `Case lost — you're out ${legalFee} VC and your heat is unchanged.`,
    });
  } catch (err) {
    next(err);
  }
};

// Same "1 Chrono Shard per remaining minute, minimum 1" formula as
// economy-service's jobs.controller.js#computeRushCost. Intentionally
// duplicated rather than shared across services — these two services are
// independently deployable, and this is three lines of pure math, not
// logic worth a shared package for.
const computeRushCost = (remainingMs) => Math.max(1, Math.ceil(remainingMs / 60000));

// ---------------------------------------------------------------------------
// POST /api/crime/rush-cooldown  { actionKey } — spend Chrono Shards to
// clear a crime action's cooldown early, the same "pay to skip the wait"
// pattern jobs.controller.js#rushShift uses for job shifts. A crime
// cooldown has no in-progress payout to collect (unlike a job shift), so
// this only clears the wait — it doesn't attempt the crime for you.
// ---------------------------------------------------------------------------
const rushCooldown = async (req, res, next) => {
  try {
    const { actionKey } = req.body;
    const action = await CrimeAction.findOne({ key: actionKey, isActive: true });
    if (!action) return res.status(404).json({ success: false, message: 'Crime action not found' });

    const record = await getOrCreateRecord(req.user.id);
    const remainingSeconds = cooldownRemainingSeconds(record, action);
    if (remainingSeconds <= 0) {
      return res.status(400).json({ success: false, message: `${action.title} is already off cooldown.` });
    }

    const cost = computeRushCost(remainingSeconds * 1000);
    try {
      await debitShardsForRush(req.user.id, cost, `Rushed cooldown: ${action.title}`);
    } catch (err) {
      if (err instanceof InsufficientShardsError) {
        return res.status(400).json({ success: false, message: `Need ${cost} Chrono Shards to rush this — you don't have enough.`, cost });
      }
      throw err;
    }

    record.lastAttempts.delete(action.key);
    await record.save();

    return res.json({ success: true, message: `${action.title} is ready again.`, cost });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/crime/rush-cost/:actionKey — lets the client show the cost
// before committing to the spend.
// ---------------------------------------------------------------------------
const getRushCost = async (req, res, next) => {
  try {
    const action = await CrimeAction.findOne({ key: req.params.actionKey, isActive: true });
    if (!action) return res.status(404).json({ success: false, message: 'Crime action not found' });

    const record = await getOrCreateRecord(req.user.id);
    const remainingSeconds = cooldownRemainingSeconds(record, action);
    return res.json({ success: true, cost: remainingSeconds > 0 ? computeRushCost(remainingSeconds * 1000) : 0, remainingSeconds });
  } catch (err) {
    next(err);
  }
};

module.exports = { listActions, getMyStatus, attemptCrime, payFine, contestFine, rushCooldown, getRushCost };
