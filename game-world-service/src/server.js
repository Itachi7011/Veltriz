require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { initSockets } = require('./sockets');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5002;

const start = async () => {
  await connectDB();

  const httpServer = http.createServer(app);
  initSockets(httpServer);

  httpServer.listen(PORT, () => {
    logger.info(`[game-world-service] ${process.env.APP_NAME || 'Veltriz'} game-world-service running on port ${PORT}`);
  });
};

start();

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
});
