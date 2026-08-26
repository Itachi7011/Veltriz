require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { startHeatDecay } = require('./cron/heatDecay');
const { run: seedCrimeActions } = require('./seed/seedCrimeActions');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5005;

const start = async () => {
  await connectDB();

  try {
    await seedCrimeActions();
    logger.info('[crime-service] Default crime actions verified/seeded');
  } catch (err) {
    logger.error('[crime-service] Auto-seed failed (server will still start):', err.message);
  }

  startHeatDecay();

  app.listen(PORT, () => {
    logger.info(`[crime-service] ${process.env.APP_NAME || 'Veltriz'} crime-service running on port ${PORT}`);
  });
};

start();

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});
