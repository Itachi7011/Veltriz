const Government = require('../models/Government');
const Election = require('../models/Election');
const Character = require('../models/Character');
const { debitWallet, InsufficientFundsError } = require('../services/economyClient');

const FILING_FEE = 200; // VC, to run for Mayor
const TERM_LENGTH_MS = 24 * 60 * 60 * 1000; // 24 real-hours per election window
const MAX_TAX_RATE = 15;

const getGovernment = async () => {
  let gov = await Government.findById('singleton');
  if (!gov) gov = await Government.create({ _id: 'singleton' });
  return gov;
};

/**
 * Lazily resolves the current election if its window has passed, and opens
 * the next one. Called at the top of every politics endpoint instead of
 * relying purely on a cron, so results are always correct even if the cron
 * hasn't ticked yet — the cron (see cron/electionCycle.js) just does this
 * proactively in the background so it usually never has to happen here.
 */
const resolveIfEnded = async () => {
  let election = await Election.findOne().sort({ termNumber: -1 });

  if (!election) {
    election = await Election.create({ termNumber: 1, votingEndsAt: new Date(Date.now() + TERM_LENGTH_MS) });
    return election;
  }

  if (election.status === 'open' && Date.now() >= new Date(election.votingEndsAt).getTime()) {
    const winner = [...election.candidates].sort((a, b) => b.votes - a.votes)[0] || null;
    election.status = 'completed';
    election.winner = winner?.user || null;
    await election.save();

    if (winner) {
      const gov = await getGovernment();
      gov.mayor = winner.user;
      gov.mayorName = winner.displayName;
      gov.termNumber = election.termNumber;
      gov.electedAt = new Date();
      // Tax rate deliberately carries over rather than resetting — a new
      // Mayor inherits the previous policy until they choose to change it,
      // same as how real administrations don't reset every law on day one.
      await gov.save();
    }

    election = await Election.create({
      termNumber: election.termNumber + 1,
      votingEndsAt: new Date(Date.now() + TERM_LENGTH_MS),
    });
  }

  return election;
};

// ---------------------------------------------------------------------------
// GET /api/government/me — full City Hall status for the panel
// ---------------------------------------------------------------------------
const getStatus = async (req, res, next) => {
  try {
    const [gov, election] = await Promise.all([getGovernment(), resolveIfEnded()]);

    return res.json({
      success: true,
      government: {
        mayor: gov.mayor,
        mayorName: gov.mayorName,
        termNumber: gov.termNumber,
        electedAt: gov.electedAt,
        taxRatePercent: gov.taxRatePercent,
      },
      election: {
        termNumber: election.termNumber,
        candidates: election.candidates.map((c) => ({ user: c.user, displayName: c.displayName, slogan: c.slogan, votes: c.votes })),
        votingEndsAt: election.votingEndsAt,
        hasVoted: election.voters.includes(req.user.id),
        isCandidate: election.candidates.some((c) => c.user === req.user.id),
      },
      isMayor: gov.mayor === req.user.id,
      filingFee: FILING_FEE,
      maxTaxRate: MAX_TAX_RATE,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/government/file  { slogan? } — pay the filing fee, join the race
// ---------------------------------------------------------------------------
const fileAsCandidate = async (req, res, next) => {
  try {
    const election = await resolveIfEnded();
    if (election.candidates.some((c) => c.user === req.user.id)) {
      return res.status(409).json({ success: false, message: "You're already running this term." });
    }

    const character = await Character.findOne({ user: req.user.id });
    if (!character) return res.status(404).json({ success: false, message: 'Create a character first' });

    try {
      await debitWallet(req.user.id, FILING_FEE, 'City Hall: election filing fee');
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        return res.status(400).json({ success: false, message: `Not enough VC — filing costs ${FILING_FEE} VC.` });
      }
      throw err;
    }

    election.candidates.push({
      user: req.user.id,
      displayName: character.displayName || 'A citizen',
      slogan: (req.body.slogan || '').slice(0, 120),
      votes: 0,
    });
    await election.save();

    return res.json({ success: true, message: "You're officially on the ballot." });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/government/vote  { candidateUserId }
// ---------------------------------------------------------------------------
const vote = async (req, res, next) => {
  try {
    const election = await resolveIfEnded();
    if (election.voters.includes(req.user.id)) {
      return res.status(409).json({ success: false, message: "You've already voted this term." });
    }

    const candidate = election.candidates.find((c) => c.user === req.body.candidateUserId);
    if (!candidate) return res.status(404).json({ success: false, message: 'Candidate not found' });

    candidate.votes += 1;
    election.voters.push(req.user.id);
    await election.save();

    return res.json({ success: true, message: `Voted for ${candidate.displayName}.` });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/government/policy  { taxRatePercent } — Mayor only
// ---------------------------------------------------------------------------
const setPolicy = async (req, res, next) => {
  try {
    const gov = await getGovernment();
    if (gov.mayor !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Only the Mayor can set policy.' });
    }

    const rate = Number(req.body.taxRatePercent);
    if (Number.isNaN(rate) || rate < 0 || rate > MAX_TAX_RATE) {
      return res.status(400).json({ success: false, message: `Tax rate must be 0-${MAX_TAX_RATE}%.` });
    }

    gov.taxRatePercent = rate;
    await gov.save();

    return res.json({ success: true, message: `Tax rate set to ${rate}%.`, taxRatePercent: rate });
  } catch (err) {
    next(err);
  }
};

module.exports = { getStatus, fileAsCandidate, vote, setPolicy };
