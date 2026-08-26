const Election = require('../models/Election');
const Government = require('../models/Government');
const logger = require('../utils/logger');

const TERM_LENGTH_MS = 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000; // check once a minute — elections run in hours/days, no need for anything faster

/**
 * The same resolution logic also runs lazily inside
 * government.controller.js#resolveIfEnded (so results are correct even if
 * this cron is momentarily behind), but doing it here too means an election
 * resolves close to on-time even if nobody happens to open City Hall right
 * when the window closes.
 */
const startElectionCycle = () => {
  setInterval(async () => {
    try {
      const election = await Election.findOne().sort({ termNumber: -1 });
      if (!election) {
        await Election.create({ termNumber: 1, votingEndsAt: new Date(Date.now() + TERM_LENGTH_MS) });
        return;
      }

      if (election.status === 'open' && Date.now() >= new Date(election.votingEndsAt).getTime()) {
        const winner = [...election.candidates].sort((a, b) => b.votes - a.votes)[0] || null;
        election.status = 'completed';
        election.winner = winner?.user || null;
        await election.save();

        if (winner) {
          let gov = await Government.findById('singleton');
          if (!gov) gov = await Government.create({ _id: 'singleton' });
          gov.mayor = winner.user;
          gov.mayorName = winner.displayName;
          gov.termNumber = election.termNumber;
          gov.electedAt = new Date();
          await gov.save();
          logger.info(`[game-world-service] Election resolved — new Mayor: ${winner.displayName}`);
        }

        await Election.create({
          termNumber: election.termNumber + 1,
          votingEndsAt: new Date(Date.now() + TERM_LENGTH_MS),
        });
      }
    } catch (err) {
      logger.error('[game-world-service] Election cycle tick failed:', err.message);
    }
  }, CHECK_INTERVAL_MS);

  logger.info('[game-world-service] Election cycle running (24h terms)');
};

module.exports = { startElectionCycle };
