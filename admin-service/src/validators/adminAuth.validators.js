const { z } = require('zod');

const passwordRule = z
  .string()
  .min(8)
  .max(128)
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

const signupSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: passwordRule,
  signupCode: z.string().min(1, 'Invite code is required'),
});

const loginSchema = z.object({
  identifier: z.string().min(3),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: passwordRule,
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordRule,
});

module.exports = { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema };
