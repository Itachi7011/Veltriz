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

const useItemSchema = z.object({
  itemKey: z.string().min(1),
});

const casinoBetSchema = z.object({
  amount: z.coerce.number().positive(),
});

// ---- Internal (admin-service -> economy-service) ----
const adminAdjustPriceSchema = z.object({
  itemKey: z.string().min(1),
  newPrice: z.coerce.number().positive().optional(),
  newBasePrice: z.coerce.number().positive().optional(),
});

// Note: userId travels in the URL param, not the body (see internal.routes.js
// — POST /wallets/:userId/credit). It's intentionally NOT required here:
// admin-service's UserDetail.jsx only ever sends { amount, reason }, and so
// does crime-service (see crime-service/src/services/economyClient.js) when
// paying out a successful crime attempt. Requiring it in the body too used
// to silently 400 every one of those calls.
const adminWalletAdjustSchema = z.object({
  amount: z.coerce.number().positive(),
  reason: z.string().min(1).max(200),
});

const adminUpsertJobSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  sector: z.enum(['industry', 'commerce', 'technology', 'services', 'healthcare', 'government']).optional(),
  baseSalary: z.coerce.number().positive(),
  cooldownMinutes: z.coerce.number().positive().optional(),
  icon: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  locationType: z.string().optional(),
  careerTrack: z.string().optional(),
  tier: z.coerce.number().int().positive().optional(),
  nextTierKey: z.string().optional(),
  promotionShiftsRequired: z.coerce.number().int().positive().optional(),
  bonusChance: z.coerce.number().min(0).max(1).optional(),
  bonusMultiplier: z.coerce.number().min(1).optional(),
});

const adminUpsertMarketItemSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  category: z
    .enum([
      'commodity', 'tool', 'luxury', 'food', 'electronics', 'clothing', 'medicine', 'stock', 'weapon',
      // Port Haven / Veltriz Sea additions — must match MarketItem.js's enum.
      'seafood', 'crude_oil', 'pearls',
    ])
    .optional(),
  basePrice: z.coerce.number().positive(),
  volatilityPercent: z.coerce.number().min(0).max(50).optional(),
  sellRateMultiplier: z.coerce.number().min(0).max(1).optional(),
  icon: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  consumable: z.coerce.boolean().optional(),
  effectEnergy: z.coerce.number().min(-100).max(100).optional(),
  effectHappiness: z.coerce.number().min(-100).max(100).optional(),
});

const checkoutSchema = z.object({
  productKey: z.string().min(1),
  testCardNumber: z.string().optional(), // sandbox "declined card" testing — see sandboxProvider.js
});

const adminUpsertPaymentProductSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  shardAmount: z.coerce.number().int().positive(),
  bonusShardAmount: z.coerce.number().int().min(0).optional(),
  priceUSD: z.coerce.number().min(0),
  icon: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

module.exports = {
  initWalletSchema,
  applyJobSchema,
  buySellSchema,
  useItemSchema,
  casinoBetSchema,
  checkoutSchema,
  adminAdjustPriceSchema,
  adminWalletAdjustSchema,
  adminUpsertJobSchema,
  adminUpsertMarketItemSchema,
  adminUpsertPaymentProductSchema,
};
