const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const walletRoutes = require('./routes/wallet.routes');
const jobsRoutes = require('./routes/jobs.routes');
const marketRoutes = require('./routes/market.routes');
const internalRoutes = require('./routes/internal.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// CORS: player client + admin client call the public routes; admin-service
// calls /api/internal/* server-to-server, which isn't subject to CORS at all
// (no browser involved), but we still whitelist it in case it's ever proxied.
const allowedOrigins = [process.env.CLIENT_URL, process.env.ADMIN_CLIENT_URL, process.env.GAME_WORLD_SERVICE_URL].filter(
  Boolean
);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(apiLimiter);

app.get('/health', (req, res) => res.json({ success: true, service: 'economy-service', status: 'ok' }));

app.use('/api/wallet', walletRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/internal', internalRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
