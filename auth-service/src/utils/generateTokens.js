const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken');

const generateAccessToken = (user) => {
  return jwt.sign(
    { sub: user._id.toString(), username: user.username, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m', algorithm: 'HS256' }
  );
};

const parseExpiryToMs = (expiry) => {
  // supports formats like "30d", "15m", "1h"
  const match = /^(\d+)([smhd])$/.exec(expiry);
  if (!match) return 30 * 24 * 60 * 60 * 1000; // default 30d
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * multipliers[unit];
};

/**
 * Creates a refresh token, stores its hash in DB, returns the raw token
 * (raw token goes in an httpOnly cookie; only the hash lives in Mongo).
 */
const issueRefreshToken = async (user, { ip, userAgent } = {}) => {
  const rawToken = crypto.randomBytes(48).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresInMs = parseExpiryToMs(process.env.JWT_REFRESH_EXPIRES_IN || '30d');

  await RefreshToken.create({
    user: user._id,
    tokenHash,
    ip,
    userAgent,
    expiresAt: new Date(Date.now() + expiresInMs),
  });

  return { rawToken, expiresInMs };
};

const hashToken = (rawToken) => crypto.createHash('sha256').update(rawToken).digest('hex');

module.exports = { generateAccessToken, issueRefreshToken, hashToken, parseExpiryToMs };
