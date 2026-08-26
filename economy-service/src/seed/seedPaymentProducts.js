require('dotenv').config();
const mongoose = require('mongoose');
const PaymentProduct = require('../models/PaymentProduct');

// A standard mobile-game bundle curve: bigger packs cost more per-dollar
// but grant a bonus, nudging (without forcing) bigger purchases — same
// psychology real IAP catalogs use, just backed by a sandbox provider that
// never touches a real card. See services/paymentProviders/sandboxProvider.js.
const PRODUCTS = [
  {
    key: 'shards_starter',
    name: 'Starter Pouch',
    description: 'A handful of Chrono Shards to get you started.',
    shardAmount: 60,
    bonusShardAmount: 0,
    priceUSD: 0.99,
    icon: 'gem',
    sortOrder: 1,
  },
  {
    key: 'shards_handful',
    name: 'Handful of Shards',
    description: 'Enough to rush a few shifts.',
    shardAmount: 150,
    bonusShardAmount: 15,
    priceUSD: 2.49,
    icon: 'gem',
    sortOrder: 2,
  },
  {
    key: 'shards_satchel',
    name: 'Chrono Satchel',
    description: 'A solid stockpile for regular rushing.',
    shardAmount: 400,
    bonusShardAmount: 60,
    priceUSD: 5.99,
    icon: 'gem',
    sortOrder: 3,
  },
  {
    key: 'shards_vault',
    name: 'Shard Vault',
    description: 'The best value in the store — for serious time-savers.',
    shardAmount: 1000,
    bonusShardAmount: 220,
    priceUSD: 12.99,
    icon: 'gem',
    sortOrder: 4,
  },
];

const run = async () => {
  for (const product of PRODUCTS) {
    await PaymentProduct.findOneAndUpdate({ key: product.key }, { $set: product }, { upsert: true, setDefaultsOnInsert: true });
  }
  console.log(`[seed] Upserted ${PRODUCTS.length} Chrono Store products`);
};

if (require.main === module) {
  require('dotenv').config();
  mongoose
    .connect(process.env.MONGO_URI || process.env.MONGODB_URI)
    .then(() => console.log('[seed] Connected to MongoDB'))
    .then(run)
    .then(() => mongoose.disconnect())
    .then(() => {
      console.log('[seed] Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[seed] Failed:', err);
      process.exit(1);
    });
}

module.exports = { run, PRODUCTS };
