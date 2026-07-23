const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/adminAuth.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate');
const { authLimiter, forgotPasswordLimiter } = require('../middleware/rateLimiter');
const {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require('../validators/adminAuth.validators');

router.post('/signup', authLimiter, validate(signupSchema), ctrl.signup);
router.post('/login', authLimiter, validate(loginSchema), ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout', ctrl.logout);
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), ctrl.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), ctrl.resetPassword);
router.post('/change-password', protect, validate(changePasswordSchema), ctrl.changePassword);
router.get('/me', protect, ctrl.getMe);

module.exports = router;
