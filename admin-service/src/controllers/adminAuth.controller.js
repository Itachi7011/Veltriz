const crypto = require('crypto');
const AdminUser = require('../models/AdminUser');
const AdminRefreshToken = require('../models/AdminRefreshToken');
const AdminAuditLog = require('../models/AdminAuditLog');
const { sendEmail } = require('../config/sendgrid');
const { adminResetPasswordTemplate } = require('../utils/emailTemplates');
const { generateAccessToken, issueRefreshToken, hashToken, parseExpiryToMs } = require('../utils/generateTokens');

const REFRESH_COOKIE_NAME = 'veltriz_admin_rt';
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5;
const LOCK_TIME_MS = parseExpiryToMs(process.env.LOCK_TIME || '15m');

const log = (fields) => AdminAuditLog.create(fields).catch(() => {});

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: parseExpiryToMs(process.env.ADMIN_JWT_REFRESH_EXPIRES_IN || '7d'),
  path: '/api/admin-auth',
});

const buildAuthResponse = async (res, admin, req) => {
  const accessToken = generateAccessToken(admin);
  const { rawToken } = await issueRefreshToken(admin, { ip: req.ip, userAgent: req.headers['user-agent'] });
  res.cookie(REFRESH_COOKIE_NAME, rawToken, refreshCookieOptions());
  return { accessToken, admin: admin.toPublicJSON() };
};

// ---------------------------------------------------------------------------
// POST /api/admin-auth/signup
// ---------------------------------------------------------------------------
const signup = async (req, res, next) => {
  try {
    const { username, email, password, signupCode } = req.body;

    if (signupCode !== process.env.ADMIN_SIGNUP_CODE) {
      return res.status(403).json({ success: false, message: 'Invalid invite code' });
    }

    const existing = await AdminUser.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: existing.email === email ? 'Email already registered' : 'Username already taken',
      });
    }

    const admin = await AdminUser.create({ username, email, password });
    await log({ admin: admin._id, logType: 'admin_audit', action: 'ADMIN_SIGNUP', ip: req.ip });

    const authData = await buildAuthResponse(res, admin, req);
    return res.status(201).json({ success: true, message: 'Admin account created', ...authData });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/admin-auth/login
// ---------------------------------------------------------------------------
const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    const admin = await AdminUser.findOne({
      $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
    }).select('+password');

    if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (admin.isLocked()) {
      const minutesLeft = Math.ceil((admin.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${minutesLeft} min.`,
      });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      admin.loginAttempts += 1;
      if (admin.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        admin.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
        admin.loginAttempts = 0;
        await log({ admin: admin._id, logType: 'admin_audit', action: 'ADMIN_ACCOUNT_LOCKED', ip: req.ip });
      }
      await admin.save();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (admin.status !== 'active') {
      return res.status(403).json({ success: false, message: `Account is ${admin.status}` });
    }

    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    admin.lastLoginAt = new Date();
    admin.lastLoginIp = req.ip;
    await admin.save();

    await log({ admin: admin._id, logType: 'admin_activity', action: 'ADMIN_LOGIN', ip: req.ip });

    const authData = await buildAuthResponse(res, admin, req);
    return res.json({ success: true, message: 'Logged in', ...authData });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/admin-auth/refresh
// ---------------------------------------------------------------------------
const refresh = async (req, res, next) => {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!rawToken) return res.status(401).json({ success: false, message: 'No refresh token' });

    const tokenHash = hashToken(rawToken);
    const stored = await AdminRefreshToken.findOne({ tokenHash });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return res.status(401).json({ success: false, message: 'Refresh token invalid or expired' });
    }

    const admin = await AdminUser.findById(stored.admin);
    if (!admin || admin.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Admin account not active' });
    }

    stored.revokedAt = new Date();
    await stored.save();

    const accessToken = generateAccessToken(admin);
    const { rawToken: newRawToken } = await issueRefreshToken(admin, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.cookie(REFRESH_COOKIE_NAME, newRawToken, refreshCookieOptions());

    return res.json({ success: true, accessToken, admin: admin.toPublicJSON() });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/admin-auth/logout
// ---------------------------------------------------------------------------
const logout = async (req, res, next) => {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (rawToken) {
      await AdminRefreshToken.findOneAndUpdate({ tokenHash: hashToken(rawToken) }, { revokedAt: new Date() });
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/admin-auth' });
    return res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/admin-auth/forgot-password
// ---------------------------------------------------------------------------
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const admin = await AdminUser.findOne({ email: email.toLowerCase() });

    if (!admin) {
      return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
    }

    const rawToken = admin.generatePasswordResetToken();
    await admin.save();

    const resetUrl = `${process.env.ADMIN_CLIENT_URL}/reset-password?token=${rawToken}`;
    await sendEmail({
      to: admin.email,
      subject: `Reset your ${process.env.APP_NAME || 'Veltriz Admin'} password`,
      html: adminResetPasswordTemplate({ username: admin.username, resetUrl }),
    });

    await log({ admin: admin._id, logType: 'admin_audit', action: 'ADMIN_PASSWORD_RESET_REQUESTED', ip: req.ip });

    return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/admin-auth/reset-password
// ---------------------------------------------------------------------------
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const admin = await AdminUser.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: Date.now() },
    }).select('+resetPasswordTokenHash +resetPasswordExpires');

    if (!admin) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset link' });
    }

    admin.password = password;
    admin.resetPasswordTokenHash = undefined;
    admin.resetPasswordExpires = undefined;
    admin.loginAttempts = 0;
    admin.lockUntil = undefined;
    await admin.save();

    await AdminRefreshToken.updateMany({ admin: admin._id, revokedAt: { $exists: false } }, { revokedAt: new Date() });

    await log({ admin: admin._id, logType: 'admin_audit', action: 'ADMIN_PASSWORD_RESET_COMPLETED', ip: req.ip });

    return res.json({ success: true, message: 'Password reset. Please log in again.' });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/admin-auth/change-password  (logged in)
// ---------------------------------------------------------------------------
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await AdminUser.findById(req.admin.id).select('+password');

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    admin.password = newPassword;
    await admin.save();

    await log({ admin: admin._id, logType: 'admin_audit', action: 'ADMIN_PASSWORD_CHANGED', ip: req.ip });

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/admin-auth/me
// ---------------------------------------------------------------------------
const getMe = async (req, res, next) => {
  try {
    const admin = await AdminUser.findById(req.admin.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    return res.json({ success: true, admin: admin.toPublicJSON() });
  } catch (err) {
    next(err);
  }
};

module.exports = { signup, login, refresh, logout, forgotPassword, resetPassword, changePassword, getMe };
