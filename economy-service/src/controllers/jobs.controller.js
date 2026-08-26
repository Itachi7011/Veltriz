const Job = require('../models/Job');
const Employment = require('../models/Employment');
const PlayerSkill = require('../models/PlayerSkill');
const { creditWallet } = require('../utils/walletService');
const { creditShards, debitShards, InsufficientShardsError } = require('../utils/shardService');
const { SALARY_BONUS_PER_LEVEL } = require('./school.controller');
const { getTaxRatePercent } = require('../services/gameWorldClient');
const { getIO } = require('../sockets');

// Small, capped Chrono Shard trickle from ordinary play — see Wallet.js's
// chronoShards field comment for why this is intentionally modest. A
// player who works every shift on cooldown earns roughly 1 shard every
// ~3-4 shifts on average, nowhere near enough to rush every shift for
// free; it just softens the wait sometimes without replacing the sandbox
// Chrono Store as the real source of shards (payments.controller.js).
const SHIFT_SHARD_CHANCE = 0.28;
const SHIFT_SHARD_AMOUNT = 1;

// Chrono Shard cost to rush a shift that's still in progress — 1 shard per
// minute remaining (rounded up), minimum 1. The same formula is
// intentionally duplicated in crime-service's crime.controller.js (see the
// comment there) rather than shared across services, since the two are
// independently deployable and this is three lines of pure math.
const computeRushCost = (remainingMs) => Math.max(1, Math.ceil(remainingMs / 60000));

// ---------------------------------------------------------------------------
// GET /api/jobs
// ---------------------------------------------------------------------------
const listJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ isActive: true }).sort({ baseSalary: 1 });
    return res.json({ success: true, jobs });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/jobs/me
// ---------------------------------------------------------------------------
const getMyEmployment = async (req, res, next) => {
  try {
    const employment = await Employment.findOne({ user: req.user.id, status: 'active' }).populate('job');
    return res.json({ success: true, employment: employment || null });
  } catch (err) {
    next(err);
  }
};

const RESIGNATION_COOLDOWN_MS = 10 * 60 * 1000; // 10 min before you can re-apply to a job you just quit

// ---------------------------------------------------------------------------
// POST /api/jobs/apply  { jobKey }
// ---------------------------------------------------------------------------
const applyToJob = async (req, res, next) => {
  try {
    const { jobKey } = req.body;
    const job = await Job.findOne({ key: jobKey, isActive: true });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    // Tier 2+ jobs are promotion-only — never a direct apply target. The
    // client (JobPanel.jsx, LocationCareers.jsx) already hides the Apply
    // button for these, but that's cosmetic; this is the real gate. Without
    // it, anyone who learns a tier-3 job's key (e.g. from network traffic)
    // could hire straight into 'harbor_master' or 'ceo' and skip every
    // promotion requirement below it.
    if (job.tier > 1) {
      return res.status(400).json({
        success: false,
        message: `${job.title} is a promotion-only role — start at tier 1 in the ${job.careerTrack || 'same'} track and work your way up.`,
      });
    }

    const existing = await Employment.findOne({ user: req.user.id });
    if (existing?.status === 'active') {
      return res.status(409).json({ success: false, message: 'Already employed. Quit your current job first.' });
    }

    // Resignation cooldown — stops immediately re-quitting/re-applying to
    // farm a fresh shiftsAtCurrentTier reset or dodge a cooldown.
    if (existing?.status === 'quit' && existing.job.toString() === job._id.toString()) {
      const elapsed = Date.now() - new Date(existing.updatedAt).getTime();
      if (elapsed < RESIGNATION_COOLDOWN_MS) {
        return res.status(429).json({
          success: false,
          message: 'You recently resigned from this job. They need some time before rehiring you.',
          remainingSeconds: Math.ceil((RESIGNATION_COOLDOWN_MS - elapsed) / 1000),
        });
      }
    }

    const employment = await Employment.findOneAndUpdate(
      { user: req.user.id },
      {
        user: req.user.id,
        job: job._id,
        startedAt: new Date(),
        lastWorkedAt: undefined,
        shiftsAtCurrentTier: 0,
        status: 'active',
        pendingShift: null, // defensive — a fresh hire never starts mid-shift, even if a
        // previous employment record was ended some other way than quitJob (which
        // already clears this itself)
      },
      { upsert: true, new: true }
    ).populate('job');

    return res.status(201).json({ success: true, message: `Hired as ${job.title}`, employment });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/jobs/work/start  — begins a shift. Pay is computed and LOCKED
// IN right now (bonus roll, skill bonus, current tax rate all baked into
// `pendingShift.salary`), then the player has to wait job.cooldownMinutes
// of real time before /collect will pay out — see Employment.js's
// pendingShift comment for why cooldownMinutes now means "how long this
// shift takes" rather than its old meaning of "gap before the next one".
// ---------------------------------------------------------------------------
const startShift = async (req, res, next) => {
  try {
    const employment = await Employment.findOne({ user: req.user.id, status: 'active' }).populate('job');
    if (!employment) return res.status(400).json({ success: false, message: 'You are not employed' });

    if (employment.pendingShift) {
      return res.status(409).json({
        success: false,
        message: 'A shift is already in progress.',
        completesAt: employment.pendingShift.completesAt,
      });
    }

    const isBonus = Math.random() < (employment.job.bonusChance ?? 0.12);
    const baseSalary = isBonus
      ? Math.round(employment.job.baseSalary * (employment.job.bonusMultiplier ?? 1.75))
      : employment.job.baseSalary;

    const skill = await PlayerSkill.findOne({ user: req.user.id });
    const skillBonusMultiplier = 1 + (skill?.skillLevel || 0) * SALARY_BONUS_PER_LEVEL;
    const taxRatePercent = await getTaxRatePercent();
    const salary = Math.round(baseSalary * skillBonusMultiplier * (1 - taxRatePercent / 100));

    const durationMs = (employment.job.cooldownMinutes || 60) * 60 * 1000;
    const startedAt = new Date();
    const completesAt = new Date(startedAt.getTime() + durationMs);

    employment.pendingShift = { startedAt, completesAt, salary, isBonus };
    await employment.save();

    return res.json({
      success: true,
      message: `Clocked in as ${employment.job.title}. Back in ${employment.job.cooldownMinutes} minute(s).`,
      pendingShift: employment.pendingShift,
      durationSeconds: Math.round(durationMs / 1000),
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/jobs/work/collect — pays out a shift ONLY once completesAt has
// passed. The salary/bonus were already locked in at /start, so nothing
// here can be gamed by a tax-rate or skill-level change mid-shift.
// ---------------------------------------------------------------------------
const collectShift = async (req, res, next) => {
  try {
    const employment = await Employment.findOne({ user: req.user.id, status: 'active' }).populate('job');
    if (!employment) return res.status(400).json({ success: false, message: 'You are not employed' });

    const shift = employment.pendingShift;
    if (!shift) return res.status(400).json({ success: false, message: 'No shift in progress — start one first.' });

    const remainingMs = new Date(shift.completesAt).getTime() - Date.now();
    if (remainingMs > 0) {
      return res.status(429).json({
        success: false,
        message: 'Shift still in progress.',
        remainingSeconds: Math.ceil(remainingMs / 1000),
        rushCostShards: computeRushCost(remainingMs),
      });
    }

    const wallet = await creditWallet(req.user.id, shift.salary, {
      type: 'SALARY',
      description: shift.isBonus ? `Shift completed (bonus!): ${employment.job.title}` : `Shift completed: ${employment.job.title}`,
      meta: { jobKey: employment.job.key, isBonus: shift.isBonus },
    });

    let shardsEarned = 0;
    let chronoShardsAfter;
    if (Math.random() < SHIFT_SHARD_CHANCE) {
      shardsEarned = SHIFT_SHARD_AMOUNT;
      const shardWallet = await creditShards(req.user.id, shardsEarned, {
        type: 'EARNED',
        description: `Found a Chrono Shard on shift: ${employment.job.title}`,
      });
      chronoShardsAfter = shardWallet.chronoShards;
    }

    employment.lastWorkedAt = new Date();
    employment.totalShiftsWorked += 1;
    employment.shiftsAtCurrentTier += 1;
    employment.totalEarned += shift.salary;
    employment.pendingShift = null;
    await employment.save();

    getIO()?.to(`user:${req.user.id}`).emit('wallet:update', {
      balance: wallet.balance,
      ...(chronoShardsAfter !== undefined ? { chronoShards: chronoShardsAfter } : {}),
    });

    const canPromote =
      !!employment.job.nextTierKey &&
      employment.job.promotionShiftsRequired != null &&
      employment.shiftsAtCurrentTier >= employment.job.promotionShiftsRequired;

    return res.json({
      success: true,
      message: shift.isBonus ? `Great work! You earned a bonus: ${shift.salary} VC` : `You earned ${shift.salary} VC`,
      salary: shift.salary,
      isBonus: shift.isBonus,
      shardsEarned,
      balance: wallet.balance,
      shiftsAtCurrentTier: employment.shiftsAtCurrentTier,
      promotionShiftsRequired: employment.job.promotionShiftsRequired ?? null,
      canPromote,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/jobs/work/rush — spend Chrono Shards to finish the current
// shift instantly and collect in the same call. This is the ONE place in
// the whole time-management system that actually spends shards on jobs —
// everywhere else (GameHUD's countdowns, JobPanel.jsx) is just UI around
// this and /collect.
// ---------------------------------------------------------------------------
const rushShift = async (req, res, next) => {
  try {
    const employment = await Employment.findOne({ user: req.user.id, status: 'active' }).populate('job');
    if (!employment) return res.status(400).json({ success: false, message: 'You are not employed' });

    const shift = employment.pendingShift;
    if (!shift) return res.status(400).json({ success: false, message: 'No shift in progress — start one first.' });

    const remainingMs = new Date(shift.completesAt).getTime() - Date.now();
    if (remainingMs <= 0) {
      return res.status(400).json({ success: false, message: 'This shift is already finished — just collect it.' });
    }

    const cost = computeRushCost(remainingMs);
    try {
      await debitShards(req.user.id, cost, {
        type: 'SPEEDUP',
        description: `Rushed a shift: ${employment.job.title}`,
        meta: { jobKey: employment.job.key, remainingMs },
      });
    } catch (err) {
      if (err instanceof InsufficientShardsError) {
        return res.status(400).json({ success: false, message: `Need ${cost} Chrono Shards to rush this — you don't have enough.`, cost });
      }
      throw err;
    }

    employment.pendingShift.completesAt = new Date();
    await employment.save();

    // Same payout path as a normal /collect, now that completesAt is now-or-earlier.
    return collectShift(req, res, next);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/jobs/rush-cost — lets the client show "Rush for N shards" before
// committing to the spend.
// ---------------------------------------------------------------------------
const getRushCost = async (req, res, next) => {
  try {
    const employment = await Employment.findOne({ user: req.user.id, status: 'active' });
    if (!employment?.pendingShift) return res.json({ success: true, cost: null });

    const remainingMs = Math.max(0, new Date(employment.pendingShift.completesAt).getTime() - Date.now());
    return res.json({ success: true, cost: remainingMs > 0 ? computeRushCost(remainingMs) : 0, remainingMs });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/jobs/quit
// ---------------------------------------------------------------------------
const quitJob = async (req, res, next) => {
  try {
    // Quitting mid-shift forfeits it — no payout for a shift you walked
    // out on, same as real life. $unset clears pendingShift back to its
    // schema default (null) rather than leaving stale start/complete times
    // a future re-hire could accidentally inherit.
    const employment = await Employment.findOneAndUpdate(
      { user: req.user.id, status: 'active' },
      { status: 'quit', $unset: { pendingShift: 1 } },
      { new: true }
    );
    if (!employment) return res.status(400).json({ success: false, message: 'You are not employed' });
    return res.json({ success: true, message: 'You quit your job' });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/jobs/promote — move to the next tier in the same career track
// ---------------------------------------------------------------------------
const promoteJob = async (req, res, next) => {
  try {
    const employment = await Employment.findOne({ user: req.user.id, status: 'active' }).populate('job');
    if (!employment) return res.status(400).json({ success: false, message: 'You are not employed' });

    // A pendingShift's salary/title were locked in against the CURRENT
    // job at /start — promoting mid-shift would leave that snapshot
    // pointing at a job the employee no longer technically holds by the
    // time /collect runs. Simplest correct fix: finish the shift first.
    if (employment.pendingShift) {
      return res.status(400).json({ success: false, message: 'Finish your current shift before promoting.' });
    }

    const currentJob = employment.job;
    if (!currentJob.nextTierKey) {
      return res.status(400).json({ success: false, message: 'You are already at the top of this career track' });
    }
    if (
      currentJob.promotionShiftsRequired == null ||
      employment.shiftsAtCurrentTier < currentJob.promotionShiftsRequired
    ) {
      const remaining = (currentJob.promotionShiftsRequired || 0) - employment.shiftsAtCurrentTier;
      return res.status(400).json({
        success: false,
        message: `Not eligible yet — work ${Math.max(remaining, 0)} more shift(s) at your current tier first.`,
      });
    }

    const nextJob = await Job.findOne({ key: currentJob.nextTierKey, isActive: true });
    if (!nextJob) {
      return res.status(404).json({ success: false, message: 'Next tier job is not currently available' });
    }

    employment.job = nextJob._id;
    employment.shiftsAtCurrentTier = 0;
    employment.totalPromotions += 1;
    await employment.save();
    await employment.populate('job');

    return res.json({
      success: true,
      message: `Congratulations! You've been promoted to ${nextJob.title}.`,
      employment,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listJobs,
  getMyEmployment,
  applyToJob,
  startShift,
  collectShift,
  rushShift,
  getRushCost,
  quitJob,
  promoteJob,
};
