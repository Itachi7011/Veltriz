const Job = require('../models/Job');
const Employment = require('../models/Employment');
const { creditWallet } = require('../utils/walletService');
const { getIO } = require('../sockets');

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

// ---------------------------------------------------------------------------
// POST /api/jobs/apply  { jobKey }
// ---------------------------------------------------------------------------
const applyToJob = async (req, res, next) => {
  try {
    const { jobKey } = req.body;
    const job = await Job.findOne({ key: jobKey, isActive: true });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const existing = await Employment.findOne({ user: req.user.id, status: 'active' });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Already employed. Quit your current job first.' });
    }

    const employment = await Employment.findOneAndUpdate(
      { user: req.user.id },
      {
        user: req.user.id,
        job: job._id,
        startedAt: new Date(),
        lastWorkedAt: undefined,
        status: 'active',
      },
      { upsert: true, new: true }
    ).populate('job');

    return res.status(201).json({ success: true, message: `Hired as ${job.title}`, employment });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/jobs/work  — earn salary for a completed shift, respects cooldown
// ---------------------------------------------------------------------------
const workShift = async (req, res, next) => {
  try {
    const employment = await Employment.findOne({ user: req.user.id, status: 'active' }).populate('job');
    if (!employment) {
      return res.status(400).json({ success: false, message: 'You are not employed' });
    }

    const cooldownMs = (employment.job.cooldownMinutes || 60) * 60 * 1000;
    if (employment.lastWorkedAt) {
      const elapsed = Date.now() - new Date(employment.lastWorkedAt).getTime();
      if (elapsed < cooldownMs) {
        const remainingMs = cooldownMs - elapsed;
        return res.status(429).json({
          success: false,
          message: 'Shift on cooldown',
          remainingSeconds: Math.ceil(remainingMs / 1000),
        });
      }
    }

    const salary = employment.job.baseSalary;
    const wallet = await creditWallet(req.user.id, salary, {
      type: 'SALARY',
      description: `Shift completed: ${employment.job.title}`,
      meta: { jobKey: employment.job.key },
    });

    employment.lastWorkedAt = new Date();
    employment.totalShiftsWorked += 1;
    employment.totalEarned += salary;
    await employment.save();

    // Push a live balance update to this user's own connected sockets
    getIO()?.to(`user:${req.user.id}`).emit('wallet:update', { balance: wallet.balance });

    return res.json({
      success: true,
      message: `You earned ${salary} VC`,
      salary,
      balance: wallet.balance,
      nextShiftAvailableInSeconds: employment.job.cooldownMinutes * 60,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/jobs/quit
// ---------------------------------------------------------------------------
const quitJob = async (req, res, next) => {
  try {
    const employment = await Employment.findOneAndUpdate(
      { user: req.user.id, status: 'active' },
      { status: 'quit' },
      { new: true }
    );
    if (!employment) return res.status(400).json({ success: false, message: 'You are not employed' });
    return res.json({ success: true, message: 'You quit your job' });
  } catch (err) {
    next(err);
  }
};

module.exports = { listJobs, getMyEmployment, applyToJob, workShift, quitJob };
