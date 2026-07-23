require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { scheduleCleanupJob } = require('./jobs/cleanup');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  scheduleCleanupJob();

  app.listen(PORT, () => {
    logger.info(`[auth-service] ${process.env.APP_NAME || 'Veltriz'} auth-service running on port ${PORT}`);
  });
};

start();

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});
