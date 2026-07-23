const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Character = require('../models/Character');
const logger = require('../utils/logger');

let io = null;

// In-memory registry of who's online, per map. This is NOT the source of
// truth (MongoDB is) — it's a fast lookup so we can broadcast/snapshot
// without hitting the DB on every movement frame. Rebuilt fresh on
// service restart, which is fine since it only tracks "who's connected
// right now", not persistent state.
// Shape: { [mapId]: { [userId]: { userId, displayName, x, y, facing, mapId } } }
const mapRegistry = {};

const ensureMapBucket = (mapId) => {
  if (!mapRegistry[mapId]) mapRegistry[mapId] = {};
  return mapRegistry[mapId];
};

const initSockets = (httpServer) => {
  const allowedOrigins = [process.env.CLIENT_URL, process.env.ADMIN_CLIENT_URL].filter(Boolean);

  io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  });

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
    logger.info(`[socket] ${socket.username} connected (${socket.id})`);
    let lastSaveAt = 0;
    const saveIntervalMs = parseInt(process.env.POSITION_SAVE_INTERVAL_MS, 10) || 5000;

    // ---- Join a map's shared room ----
    socket.on('world:join', async ({ mapId, displayName, x, y }) => {
      try {
        socket.mapId = mapId;
        socket.join(`map:${mapId}`);

        const bucket = ensureMapBucket(mapId);
        bucket[socket.userId] = {
          userId: socket.userId,
          displayName: displayName || socket.username,
          x,
          y,
          facing: 'down',
          mapId,
        };

        // Send the new player everyone ALREADY on the map
        const others = Object.values(bucket).filter((p) => p.userId !== socket.userId);
        socket.emit('world:snapshot', { players: others });

        // Tell everyone else this player joined
        socket.to(`map:${mapId}`).emit('player:joined', bucket[socket.userId]);

        await Character.findOneAndUpdate({ user: socket.userId }, { lastOnlineAt: new Date() });
      } catch (err) {
        logger.error('[socket] world:join failed:', err.message);
      }
    });

    // ---- Movement updates ----
    socket.on('player:move', async ({ x, y, vx, vy, facing }) => {
      if (!socket.mapId) return; // must join a map first
      const bucket = ensureMapBucket(socket.mapId);
      const player = bucket[socket.userId];
      if (!player) return;

      player.x = x;
      player.y = y;
      player.facing = facing || player.facing;

      socket.to(`map:${socket.mapId}`).emit('player:moved', {
        userId: socket.userId,
        x,
        y,
        vx,
        vy,
        facing: player.facing,
      });

      // Throttled persistence — "save game" without hammering Mongo every frame
      const now = Date.now();
      if (now - lastSaveAt >= saveIntervalMs) {
        lastSaveAt = now;
        Character.findOneAndUpdate(
          { user: socket.userId },
          { position: { x, y }, mapId: socket.mapId, lastSavedAt: new Date() }
        ).catch((err) => logger.error('[socket] Position autosave failed:', err.message));
      }
    });

    // ---- Simple building interaction ping (frontend decides what UI to open) ----
    socket.on('player:interact', ({ buildingId }) => {
      // Currently just an ack — reserved for future systems (e.g. notifying
      // other players "X entered the bank"). Kept intentionally minimal.
      socket.emit('interact:ack', { buildingId });
    });

    socket.on('disconnect', async () => {
      logger.info(`[socket] ${socket.username} disconnected (${socket.id})`);
      if (socket.mapId) {
        const bucket = ensureMapBucket(socket.mapId);
        const player = bucket[socket.userId];
        delete bucket[socket.userId];
        socket.to(`map:${socket.mapId}`).emit('player:left', { userId: socket.userId });

        try {
          await Character.findOneAndUpdate(
            { user: socket.userId },
            {
              lastOnlineAt: new Date(),
              ...(player ? { position: { x: player.x, y: player.y } } : {}),
            }
          );
        } catch (err) {
          logger.error('[socket] Final position save on disconnect failed:', err.message);
        }
      }
    });
  });

  logger.info('[game-world-service] Socket.IO initialized');
  return io;
};

const getIO = () => io;

module.exports = { initSockets, getIO };
