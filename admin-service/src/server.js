require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { scheduleCleanupJob } = require('./jobs/cleanup');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5003;

const start = async () => {
  await connectDB();
  scheduleCleanupJob();

  app.listen(PORT, () => {
    logger.info(`[admin-service] ${process.env.APP_NAME || 'Veltriz Admin'} running on port ${PORT}`);
  });
};

start();

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});
