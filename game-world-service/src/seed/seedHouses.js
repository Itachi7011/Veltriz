const mongoose = require('mongoose');
const House = require('../models/House');
const { MAPS } = require('../data/worldData');

const run = async () => {
  let upserted = 0;
  const ops = [];
  for (const map of Object.values(MAPS)) {
    for (const house of map.houses) {
      ops.push({
        updateOne: {
          filter: { houseId: house.id },
          update: { $set: { houseType: house.houseType, name: house.name, price: house.price, zone: house.zone } },
          upsert: true,
        },
      });
      upserted += 1;
    }
  }
  if (ops.length) await House.bulkWrite(ops, { ordered: false });
  console.log(`[seed] Synced ${upserted} houses (ownership untouched for existing rows)`);
};

// Runnable directly (`npm run seed:houses`), and exported so server.js can
// call it automatically on boot — it only ever touches houseType/name/
// price/zone, never `owner`, so a restart can never un-sell someone's
// house; it just keeps the House collection in sync with worldData.js
// (which is exactly what "admins add a building/house and it just works
// after a restart, with no manual seed step" needs).
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

module.exports = { run };
