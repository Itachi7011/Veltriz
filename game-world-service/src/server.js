require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initSockets } = require('./sockets');
const { startElectionCycle } = require('./cron/electionCycle');
const { run: seedHouses } = require('./seed/seedHouses');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5002;

const start = async () => {
  await connectDB();

  // Keeps the House collection in sync with worldData.js on every boot —
  // a fresh database otherwise has zero purchasable houses until someone
  // remembers to run the seed script by hand. Only touches
  // houseType/name/price/zone, never `owner`, so it can never undo a
  // player's purchase.
  try {
    await seedHouses();
    logger.info('[game-world-service] Default houses verified/seeded');
  } catch (err) {
    logger.error('[game-world-service] Auto-seed failed (server will still start):', err.message);
  }

  const httpServer = http.createServer(app);
  initSockets(httpServer);
  startElectionCycle();

  httpServer.listen(PORT, () => {
    logger.info(`[game-world-service] ${process.env.APP_NAME || 'Veltriz'} game-world-service running on port ${PORT}`);
  });
};

start();

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});
