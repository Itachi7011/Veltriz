require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { startNpcEngine } = require('./cron/npcEngine');
const { startEventEngine } = require('./cron/eventEngine');
const { run: seedNpcs } = require('./seed/seedNpcs');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5004;

// Population seeding needs economy-service's /api/jobs to already be up,
// which may not be true the instant this service boots (different
// containers/processes starting in parallel) — so this retries quietly in
// the background instead of blocking or crashing this service's own
// startup. It's a no-op once NPCs exist (see seedNpcs.js's count guard),
// so it's safe to keep retrying.
const seedNpcsWithRetry = (attempt = 1) => {
  seedNpcs()
    .then(() => logger.info('[simulation-service] Default NPC population verified/seeded'))
    .catch((err) => {
      if (attempt >= 8) {
        logger.error('[simulation-service] Giving up on NPC auto-seed:', err.message);
        return;
      }
      setTimeout(() => seedNpcsWithRetry(attempt + 1), 5000);
    });
};

const start = async () => {
  await connectDB();

  startNpcEngine();
  startEventEngine();
  seedNpcsWithRetry();

  app.listen(PORT, () => {
    logger.info(`[simulation-service] ${process.env.APP_NAME || 'Veltriz'} simulation-service running on port ${PORT}`);
  });
};

start();

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});
