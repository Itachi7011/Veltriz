const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const adminAuthRoutes = require('./routes/adminAuth.routes');
const usersRoutes = require('./routes/users.routes');
const economyRoutes = require('./routes/economy.routes');
const logsRoutes = require('./routes/logs.routes');
const worldRoutes = require('./routes/world.routes');
const crimeRoutes = require('./routes/crime.routes');
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

// Only the admin frontend ever calls this service — no need to allow the
// player game client's origin here.
const allowedOrigins = [process.env.ADMIN_CLIENT_URL].filter(Boolean);

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

app.get('/health', (req, res) => res.json({ success: true, service: 'admin-service', status: 'ok' }));

app.use('/api/admin-auth', adminAuthRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/economy', economyRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/simulation', worldRoutes);
app.use('/api/crime-control', crimeRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
