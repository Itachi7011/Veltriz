const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down.' },
});

// Crime attempts are the exploit surface here (spam-clicking to farm payouts
// or dodge the per-action cooldown) — throttle harder than general reads.
const actionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many actions, slow down.' },
});

module.exports = { apiLimiter, actionLimiter };
