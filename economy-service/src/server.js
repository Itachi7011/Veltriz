require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initSockets } = require('./sockets');
const { startPriceEngine } = require('./cron/priceEngine');
const { startExternalFeed } = require('./cron/externalFeed');
const { startLoanInterest } = require('./cron/loanInterest');
const { startLotteryDraw } = require('./cron/lotteryDraw');
const { run: seedJobsAndMarket } = require('./seed/seedJobsAndMarket');
const { run: seedPaymentProducts } = require('./seed/seedPaymentProducts');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5001;

const start = async () => {
  await connectDB();

  // Auto-seed default jobs / market items / Chrono Store products on every
  // boot, not just via a manually-run npm script. Every seed upsert is
  // keyed by a stable `key` field, so on a server that already has real
  // (possibly admin-edited) data this is a no-op; on a brand-new database
  // it means the game world is playable immediately — no jobs, no market
  // to buy from, and no store to top up shards from otherwise, which is
  // exactly the "fresh install feels dead" problem admins were hitting.
  try {
    await seedJobsAndMarket();
    await seedPaymentProducts();
    logger.info('[economy-service] Default economy data verified/seeded');
  } catch (err) {
    logger.error('[economy-service] Auto-seed failed (server will still start):', err.message);
  }

  const httpServer = http.createServer(app);
  initSockets(httpServer);

  startPriceEngine();
  startExternalFeed();
  startLoanInterest();
  startLotteryDraw();

  httpServer.listen(PORT, () => {
    logger.info(`[economy-service] ${process.env.APP_NAME || 'Veltriz'} economy-service running on port ${PORT}`);
  });
};

start();

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});
