const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600, // higher than auth-service: this handles frequent polling (prices, wallet)
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down.' },
});

// Trading/working actions should be throttled harder to prevent spam-clicking
// exploits (buy/sell/work-shift loops)
const actionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many actions, slow down.' },
});

module.exports = { apiLimiter, actionLimiter };
