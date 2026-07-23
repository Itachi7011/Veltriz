const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const passport = require('./config/passport');

const authRoutes = require('./routes/auth.routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Trust proxy (Render/Netlify sit behind a proxy) — needed for correct req.ip
app.set('trust proxy', 1);

// ---- Security & parsing middleware ----
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xss());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ---- CORS ----
// Allowed origins: main game client + admin client (both may hit auth-service
// since login/signup for players happens here; admin has its own auth in admin-service).
const allowedOrigins = [process.env.CLIENT_URL, process.env.ADMIN_CLIENT_URL].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(passport.initialize());
app.use(apiLimiter);

// ---- Routes ----
app.get('/health', (req, res) => res.json({ success: true, service: 'auth-service', status: 'ok' }));
app.use('/api/auth', authRoutes);

// ---- Error handling (must be last) ----
app.use(notFound);
app.use(errorHandler);

module.exports = app;
