require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initSockets } = require('./sockets');
const { startPriceEngine } = require('./cron/priceEngine');
const { startExternalFeed } = require('./cron/externalFeed');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5001;

const start = async () => {
  await connectDB();

  const httpServer = http.createServer(app);
  initSockets(httpServer);

  startPriceEngine();
  startExternalFeed();

  httpServer.listen(PORT, () => {
    logger.info(`[economy-service] ${process.env.APP_NAME || 'Veltriz'} economy-service running on port ${PORT}`);
  });
};

start();

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});
