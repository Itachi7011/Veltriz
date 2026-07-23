const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const publicRoutes = require('./routes/public.routes');
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

app.get('/health', (req, res) => res.json({ success: true, service: 'simulation-service', status: 'ok' }));

app.use('/api', publicRoutes);
app.use('/api/internal', internalRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
