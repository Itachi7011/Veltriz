const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const AuditLog = require('../models/AuditLog');
const { sendEmail } = require('../config/sendgrid');
const { verifyEmailTemplate, resetPasswordTemplate } = require('../utils/emailTemplates');
const { generateAccessToken, issueRefreshToken, hashToken, parseExpiryToMs } = require('../utils/generateTokens');

const REFRESH_COOKIE_NAME = 'veltriz_rt';
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS, 10) || 5;
const LOCK_TIME_MS = parseExpiryToMs(process.env.LOCK_TIME || '15m');

const log = (fields) => AuditLog.create(fields).catch(() => {});

const refreshCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: parseExpiryToMs(process.env.JWT_REFRESH_EXPIRES_IN || '30d'),
  path: '/api/auth',
});

const buildAuthResponse = async (res, user, req) => {
  const accessToken = generateAccessToken(user);
  const { rawToken } = await issueRefreshToken(user, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.cookie(REFRESH_COOKIE_NAME, rawToken, refreshCookieOptions());

  return { accessToken, user: user.toPublicJSON() };
};

// ---------------------------------------------------------------------------
// POST /api/auth/signup
// ---------------------------------------------------------------------------
const signup = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: existing.email === email ? 'Email already registered' : 'Username already taken',
      });
    }

    const user = new User({ username, email, password, authProvider: 'local' });
    const rawVerifyToken = user.generateEmailVerifyToken();
    await user.save();

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${rawVerifyToken}`;
   try {
  await sendEmail({
    to: user.email,
    subject: `Verify your ${process.env.APP_NAME || 'Veltriz'} account`,
    html: verifyEmailTemplate({ username: user.username, verifyUrl }),
  });
} catch (err) {
  console.log('Failed to send verification email:', err.message);
}

    await log({ user: user._id, logType: 'user_audit', action: 'SIGNUP', ip: req.ip });

    const authData = await buildAuthResponse(res, user, req);

    return res.status(201).json({
      success: true,
      message: 'Account created. Please check your email to verify your account.',
      ...authData,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      $or: [{ email: identifier.toLowerCase() }, { username: identifier }],
    }).select('+password');

    if (!user || user.authProvider !== 'local') {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.isLocked()) {
      const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked due to too many failed attempts. Try again in ${minutesLeft} min.`,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      user.loginAttempts += 1;
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
        user.loginAttempts = 0;
        await log({ user: user._id, logType: 'user_audit', action: 'ACCOUNT_LOCKED', ip: req.ip });
      }
      await user.save();
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: `Account is ${user.status}` });
    }

    user.loginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip;
    await user.save();

    await log({
      user: user._id,
      logType: 'user_activity',
      action: 'LOGIN_SUCCESS',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const authData = await buildAuthResponse(res, user, req);
    return res.json({ success: true, message: 'Logged in successfully', ...authData });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/auth/google -> handled by passport.authenticate in routes
// GET /api/auth/google/callback
// ---------------------------------------------------------------------------
const googleCallback = async (req, res, next) => {
  try {
    const user = req.user; // set by passport
    await log({ user: user._id, logType: 'user_activity', action: 'LOGIN_GOOGLE', ip: req.ip });
    await buildAuthResponse(res, user, req); // sets refresh cookie
    const accessToken = generateAccessToken(user);
    // Redirect back to client with access token in URL fragment (not query,
    // to avoid it landing in server logs) — client reads it once then discards.
    return res.redirect(`${process.env.CLIENT_URL}/oauth-success#accessToken=${accessToken}`);
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/refresh
// ---------------------------------------------------------------------------
const refresh = async (req, res, next) => {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!rawToken) {
      return res.status(401).json({ success: false, message: 'No refresh token' });
    }

    const tokenHash = hashToken(rawToken);
    const stored = await RefreshToken.findOne({ tokenHash });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return res.status(401).json({ success: false, message: 'Refresh token invalid or expired' });
    }

    const user = await User.findById(stored.user);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ success: false, message: 'Account not active' });
    }

    // Rotate: revoke old, issue new (prevents reuse of stolen tokens)
    stored.revokedAt = new Date();
    await stored.save();

    const accessToken = generateAccessToken(user);
    const { rawToken: newRawToken } = await issueRefreshToken(user, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.cookie(REFRESH_COOKIE_NAME, newRawToken, refreshCookieOptions());

    return res.json({ success: true, accessToken, user: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
const logout = async (req, res, next) => {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (rawToken) {
      const tokenHash = hashToken(rawToken);
      await RefreshToken.findOneAndUpdate({ tokenHash }, { revokedAt: new Date() });
    }
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    return res.json({ success: true, message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/logout-all  (revoke every device)
// ---------------------------------------------------------------------------
const logoutAll = async (req, res, next) => {
  try {
    await RefreshToken.updateMany(
      { user: req.user.id, revokedAt: { $exists: false } },
      { revokedAt: new Date() }
    );
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    return res.json({ success: true, message: 'Logged out from all devices' });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/auth/verify-email?token=...   POST version below too
// ---------------------------------------------------------------------------
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerifyTokenHash: tokenHash,
      emailVerifyExpires: { $gt: Date.now() },
    }).select('+emailVerifyTokenHash +emailVerifyExpires');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification link' });
    }

    user.isEmailVerified = true;
    user.emailVerifyTokenHash = undefined;
    user.emailVerifyExpires = undefined;
    await user.save();

    await log({ user: user._id, logType: 'user_audit', action: 'EMAIL_VERIFIED', ip: req.ip });

    return res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/resend-verification
// ---------------------------------------------------------------------------
const resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email already verified' });
    }

    const rawVerifyToken = user.generateEmailVerifyToken();
    await user.save();

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${rawVerifyToken}`;
    await sendEmail({
      to: user.email,
      subject: `Verify your ${process.env.APP_NAME || 'Veltriz'} account`,
      html: verifyEmailTemplate({ username: user.username, verifyUrl }),
    });

    return res.json({ success: true, message: 'Verification email resent' });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password
// ---------------------------------------------------------------------------
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase(), authProvider: 'local' });

    // Always return success — don't leak whether an email exists in the system
    if (!user) {
      return res.json({
        success: true,
        message: 'If that email exists, a reset link has been sent.',
      });
    }

    const rawToken = user.generatePasswordResetToken();
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;
    await sendEmail({
      to: user.email,
      subject: `Reset your ${process.env.APP_NAME || 'Veltriz'} password`,
      html: resetPasswordTemplate({ username: user.username, resetUrl }),
    });

    await log({ user: user._id, logType: 'user_audit', action: 'PASSWORD_RESET_REQUESTED', ip: req.ip });

    return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password   (same page handles the "forgot password" flow's 2nd step)
// ---------------------------------------------------------------------------
const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordTokenHash: tokenHash,
      resetPasswordExpires: { $gt: Date.now() },
    }).select('+resetPasswordTokenHash +resetPasswordExpires');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset link' });
    }

    user.password = password;
    user.resetPasswordTokenHash = undefined;
    user.resetPasswordExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    // Security: revoke all existing sessions on password change
    await RefreshToken.updateMany(
      { user: user._id, revokedAt: { $exists: false } },
      { revokedAt: new Date() }
    );

    await log({ user: user._id, logType: 'user_audit', action: 'PASSWORD_RESET_COMPLETED', ip: req.ip });

    return res.json({ success: true, message: 'Password reset successfully. Please log in again.' });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/change-password  (logged in)
// ---------------------------------------------------------------------------
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (user.authProvider !== 'local') {
      return res.status(400).json({ success: false, message: 'This account uses Google sign-in' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    await log({ user: user._id, logType: 'user_audit', action: 'PASSWORD_CHANGED', ip: req.ip });

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.json({ success: true, user: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/auth/avatar  (multipart/form-data, field name: "avatar")
// ---------------------------------------------------------------------------
const uploadAvatarHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    const { uploadBufferToCloudinary } = require('../config/cloudinary');
    const result = await uploadBufferToCloudinary(req.file.buffer);

    const user = await User.findById(req.user.id);
    user.avatarUrl = result.secure_url;
    await user.save();

    return res.json({ success: true, message: 'Avatar updated', avatarUrl: user.avatarUrl });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  signup,
  login,
  googleCallback,
  refresh,
  logout,
  logoutAll,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  uploadAvatarHandler,
};
