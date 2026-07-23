require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('../models/Job');
const MarketItem = require('../models/MarketItem');
const MarketPrice = require('../models/MarketPrice');

const JOBS = [
  {
    key: 'worker',
    title: 'Factory Worker',
    description: 'Entry-level industrial labor. No qualifications needed.',
    sector: 'industry',
    baseSalary: 80,
    cooldownMinutes: 30,
    icon: 'hard-hat',
  },
  {
    key: 'clerk',
    title: 'Shop Clerk',
    description: 'Retail work in the city marketplace.',
    sector: 'commerce',
    baseSalary: 110,
    cooldownMinutes: 45,
    icon: 'store',
  },
  {
    key: 'driver',
    title: 'Delivery Driver',
    description: 'Move goods across the city.',
    sector: 'services',
    baseSalary: 130,
    cooldownMinutes: 45,
    icon: 'truck',
  },
  {
    key: 'engineer',
    title: 'Junior Engineer',
    description: 'Technical work at a local firm.',
    sector: 'technology',
    baseSalary: 220,
    cooldownMinutes: 60,
    icon: 'cpu',
  },
  {
    key: 'trader',
    title: 'Market Trader',
    description: 'Work the trading floor of the commodities exchange.',
    sector: 'commerce',
    baseSalary: 180,
    cooldownMinutes: 60,
    icon: 'trending-up',
  },
];

const MARKET_ITEMS = [
  { key: 'food', name: 'Food Rations', category: 'commodity', basePrice: 12, volatilityPercent: 3, icon: 'wheat' },
  { key: 'fuel', name: 'Fuel', category: 'commodity', basePrice: 45, volatilityPercent: 4, icon: 'fuel' },
  { key: 'gold', name: 'Gold', category: 'commodity', basePrice: 5800, volatilityPercent: 1.5, icon: 'gem' },
  { key: 'tools', name: 'Tools', category: 'tool', basePrice: 60, volatilityPercent: 2, icon: 'wrench' },
  { key: 'electronics', name: 'Electronics', category: 'luxury', basePrice: 350, volatilityPercent: 3.5, icon: 'smartphone' },
];

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[seed] Connected to MongoDB');

  for (const job of JOBS) {
    await Job.findOneAndUpdate({ key: job.key }, { $set: job }, { upsert: true, setDefaultsOnInsert: true });
  }
  console.log(`[seed] Upserted ${JOBS.length} jobs`);

  for (const itemData of MARKET_ITEMS) {
    const item = await MarketItem.findOneAndUpdate(
      { key: itemData.key },
      { $set: itemData },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await MarketPrice.findOneAndUpdate(
      { item: item._id },
      { $setOnInsert: { currentPrice: item.basePrice, previousPrice: item.basePrice } },
      { upsert: true }
    );
  }
  console.log(`[seed] Upserted ${MARKET_ITEMS.length} market items + prices`);

  await mongoose.disconnect();
  console.log('[seed] Done.');
  process.exit(0);
};

run().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
