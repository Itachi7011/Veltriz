const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const characterRoutes = require('./routes/character.routes');
const worldRoutes = require('./routes/world.routes');
const realestateRoutes = require('./routes/realestate.routes');
const marinaRoutes = require('./routes/marina.routes');
const governmentRoutes = require('./routes/government.routes');
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

const allowedOrigins = [process.env.CLIENT_URL, process.env.ADMIN_CLIENT_URL].filter(Boolean);

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

app.get('/health', (req, res) => res.json({ success: true, service: 'game-world-service', status: 'ok' }));

app.use('/api/character', characterRoutes);
app.use('/api/world', worldRoutes);
app.use('/api/realestate', realestateRoutes);
app.use('/api/marina', marinaRoutes);
app.use('/api/government', governmentRoutes);
app.use('/api/internal', internalRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
