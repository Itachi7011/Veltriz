const express = require('express');
const passport = require('passport');
const router = express.Router();

const ctrl = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { authLimiter, forgotPasswordLimiter } = require('../middleware/rateLimiter');
const { uploadAvatar } = require('../config/cloudinary');
const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  changePasswordSchema,
} = require('../validators/auth.validators');

// ---- Local auth ----
router.post('/signup', authLimiter, validate(signupSchema), ctrl.signup);
router.post('/login', authLimiter, validate(loginSchema), ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.post('/logout-all', protect, ctrl.logoutAll);

// ---- Google OAuth ----
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${process.env.CLIENT_URL}/login?error=google_failed` }),
  ctrl.googleCallback
);

// ---- Email verification ----
router.post('/verify-email', validate(verifyEmailSchema), ctrl.verifyEmail);
router.post('/resend-verification', protect, ctrl.resendVerification);

// ---- Password reset ----
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), ctrl.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), ctrl.resetPassword);
router.post('/change-password', protect, validate(changePasswordSchema), ctrl.changePassword);

// ---- Profile ----
router.get('/me', protect, ctrl.getMe);
router.post('/avatar', protect, uploadAvatar.single('avatar'), ctrl.uploadAvatarHandler);

module.exports = router;
