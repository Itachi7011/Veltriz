const { z } = require('zod');

const initWalletSchema = z.object({
  background: z.enum(['poor', 'middle', 'rich']).default('poor'),
});

const applyJobSchema = z.object({
  jobKey: z.string().min(1),
});

const buySellSchema = z.object({
  itemKey: z.string().min(1),
  quantity: z.coerce.number().int().positive().max(10000),
});

// ---- Internal (admin-service -> economy-service) ----
const adminAdjustPriceSchema = z.object({
  itemKey: z.string().min(1),
  newPrice: z.coerce.number().positive().optional(),
  newBasePrice: z.coerce.number().positive().optional(),
});

const adminWalletAdjustSchema = z.object({
  userId: z.string().min(1),
  amount: z.coerce.number().positive(),
  reason: z.string().min(1).max(200),
});

const adminUpsertJobSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  sector: z.enum(['industry', 'commerce', 'technology', 'services']).optional(),
  baseSalary: z.coerce.number().positive(),
  cooldownMinutes: z.coerce.number().positive().optional(),
  icon: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

const adminUpsertMarketItemSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['commodity', 'tool', 'luxury']).optional(),
  basePrice: z.coerce.number().positive(),
  volatilityPercent: z.coerce.number().min(0).max(50).optional(),
  sellRateMultiplier: z.coerce.number().min(0).max(1).optional(),
  icon: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

module.exports = {
  initWalletSchema,
  applyJobSchema,
  buySellSchema,
  adminAdjustPriceSchema,
  adminWalletAdjustSchema,
  adminUpsertJobSchema,
  adminUpsertMarketItemSchema,
};
