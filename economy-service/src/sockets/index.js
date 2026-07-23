const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io = null;

const initSockets = (httpServer) => {
  const allowedOrigins = [process.env.CLIENT_URL, process.env.ADMIN_CLIENT_URL].filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // Auth middleware for the socket handshake — client connects with:
  // io(URL, { auth: { token: accessToken } })
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('No token provided'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      socket.userId = decoded.sub;
      socket.username = decoded.username;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    // Private room for this specific user — wallet updates, personal notifications
    socket.join(`user:${socket.userId}`);
    logger.info(`[socket] ${socket.username} connected (${socket.id})`);

    socket.on('disconnect', () => {
      logger.info(`[socket] ${socket.username} disconnected (${socket.id})`);
    });
  });

  logger.info('[economy-service] Socket.IO initialized');
  return io;
};

const getIO = () => io;

module.exports = { initSockets, getIO };
