const { z } = require('zod');

// ---- Player-facing ----
const attemptCrimeSchema = z.object({
  actionKey: z.string().min(1),
});

// ---- Internal (admin-service -> crime-service) ----
// Mirrors exactly what admin-client's CrimeActions.jsx form submits.
const adminUpsertCrimeActionSchema = z
  .object({
    key: z.string().min(1),
    title: z.string().min(1),
    description: z.string().optional().default(''),
    icon: z.string().optional(),
    baseSuccessChance: z.coerce.number().min(0).max(1),
    minPayout: z.coerce.number().min(0),
    maxPayout: z.coerce.number().min(0),
    cooldownMinutes: z.coerce.number().min(0).optional(),
    isActive: z.coerce.boolean().optional(),
  })
  .refine((data) => data.maxPayout >= data.minPayout, {
    message: 'maxPayout cannot be less than minPayout',
    path: ['maxPayout'],
  });

module.exports = { attemptCrimeSchema, adminUpsertCrimeActionSchema };
