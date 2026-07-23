require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { startNpcEngine } = require('./cron/npcEngine');
const { startEventEngine } = require('./cron/eventEngine');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5004;

const start = async () => {
  await connectDB();

  startNpcEngine();
  startEventEngine();

  app.listen(PORT, () => {
    logger.info(`[simulation-service] ${process.env.APP_NAME || 'Veltriz'} simulation-service running on port ${PORT}`);
  });
};

start();

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});
