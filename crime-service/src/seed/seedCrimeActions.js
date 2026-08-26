require('dotenv').config();
const mongoose = require('mongoose');
const CrimeAction = require('../models/CrimeAction');

// Ordered roughly low-risk/low-reward -> high-risk/high-reward.
const CRIME_ACTIONS = [
  {
    key: 'pickpocket',
    title: 'Pickpocket',
    description: 'Lift a wallet in a crowded street. Low risk, low reward.',
    icon: 'venetian-mask',
    baseSuccessChance: 0.8,
    minPayout: 10,
    maxPayout: 40,
    cooldownMinutes: 5,
  },
  {
    key: 'shoplift',
    title: 'Shoplift',
    description: 'Walk out of a store with something you didn\u2019t pay for.',
    icon: 'shopping-bag',
    baseSuccessChance: 0.7,
    minPayout: 20,
    maxPayout: 70,
    cooldownMinutes: 10,
  },
  {
    key: 'burglary',
    title: 'Burglary',
    description: 'Break into a home while the residents are out.',
    icon: 'door-open',
    baseSuccessChance: 0.55,
    minPayout: 60,
    maxPayout: 180,
    cooldownMinutes: 20,
  },
  {
    key: 'carjack',
    title: 'Carjack',
    description: 'Steal a parked vehicle and strip it for parts.',
    icon: 'car',
    baseSuccessChance: 0.45,
    minPayout: 100,
    maxPayout: 300,
    cooldownMinutes: 30,
  },
  {
    key: 'smuggling',
    title: 'Smuggling Run',
    description: "Slip contraband cargo past Coast Guard patrols out of Smugglers' Cove. High risk, high reward.",
    icon: 'skull',
    baseSuccessChance: 0.35,
    minPayout: 180,
    maxPayout: 520,
    cooldownMinutes: 45,
  },
  {
    key: 'heist',
    title: 'Bank Heist',
    description: 'The big one. Extremely risky, extremely lucrative.',
    icon: 'landmark',
    baseSuccessChance: 0.25,
    minPayout: 300,
    maxPayout: 900,
    cooldownMinutes: 60,
  },
];

const run = async () => {
  for (const action of CRIME_ACTIONS) {
    await CrimeAction.findOneAndUpdate(
      { key: action.key },
      { $set: action },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
  console.log(`[seed] Upserted ${CRIME_ACTIONS.length} crime actions`);
};

if (require.main === module) {
  require('dotenv').config();
  mongoose.set('strictQuery', true);
  mongoose
    .connect(process.env.MONGODB_URI)
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

module.exports = { run, CRIME_ACTIONS };
