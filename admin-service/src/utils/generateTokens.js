const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const AdminRefreshToken = require('../models/AdminRefreshToken');

const generateAccessToken = (admin) => {
  return jwt.sign(
    { sub: admin._id.toString(), username: admin.username, role: admin.role },
    process.env.ADMIN_JWT_SECRET,
    { expiresIn: process.env.ADMIN_JWT_ACCESS_EXPIRES_IN || '15m', algorithm: 'HS256' }
  );
};

const parseExpiryToMs = (expiry) => {
  const match = /^(\d+)([smhd])$/.exec(expiry);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const value = parseInt(match[1], 10);
  const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return value * multipliers[match[2]];
};

const issueRefreshToken = async (admin, { ip, userAgent } = {}) => {
  const rawToken = crypto.randomBytes(48).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresInMs = parseExpiryToMs(process.env.ADMIN_JWT_REFRESH_EXPIRES_IN || '7d');

  await AdminRefreshToken.create({
    admin: admin._id,
    tokenHash,
    ip,
    userAgent,
    expiresAt: new Date(Date.now() + expiresInMs),
  });

  return { rawToken, expiresInMs };
};

const hashToken = (rawToken) => crypto.createHash('sha256').update(rawToken).digest('hex');

module.exports = { generateAccessToken, issueRefreshToken, hashToken, parseExpiryToMs };
