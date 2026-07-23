const rateLimit = require('express-rate-limit');

// Generic API limiter — generous, just to stop gross abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down.' },
});

// Tighter limiter for login/signup to slow brute force + bot signups
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Try again in a few minutes.' },
});

// Very tight limiter for password reset requests (prevents email bombing)
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many password reset requests. Try again later.' },
});

module.exports = { apiLimiter, authLimiter, forgotPasswordLimiter };
