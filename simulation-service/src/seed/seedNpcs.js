require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const Npc = require('../models/Npc');

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Ishaan', 'Kabir', 'Rohan', 'Arjun', 'Dev',
  'Ananya', 'Diya', 'Saanvi', 'Myra', 'Aadhya', 'Kiara', 'Riya', 'Anika',
];
const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Mehta', 'Kapoor', 'Reddy', 'Nair', 'Iyer',
  'Chopra', 'Malhotra', 'Bose', 'Rao',
];

const randomName = () =>
  `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${
    LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
  }`;

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[seed] Connected to MongoDB');

  const { data } = await axios.get(`${process.env.ECONOMY_SERVICE_URL}/api/jobs`);
  const jobs = data.jobs;
  if (!jobs || jobs.length === 0) {
    throw new Error('economy-service returned no jobs — seed economy-service first (npm run seed there)');
  }

  const populationSize = parseInt(process.env.NPC_POPULATION_SIZE, 10) || 60;

  const existing = await Npc.countDocuments();
  if (existing > 0) {
    console.log(`[seed] ${existing} NPCs already exist — skipping (delete the 'npcs' collection to reseed)`);
    await mongoose.disconnect();
    process.exit(0);
  }

  const npcs = Array.from({ length: populationSize }, () => {
    const job = jobs[Math.floor(Math.random() * jobs.length)];
    return {
      name: randomName(),
      jobKey: job.key,
      wealth: Math.floor(Math.random() * 500),
      personality: {
        riskTolerance: Math.random(),
        ambition: Math.random(),
        spendingHabit: Math.random(),
      },
    };
  });

  await Npc.insertMany(npcs);
  console.log(`[seed] Created ${npcs.length} NPCs across ${jobs.length} job types`);

  await mongoose.disconnect();
  console.log('[seed] Done.');
  process.exit(0);
};

run().catch((err) => {
  console.error('[seed] Failed:', err.message);
  process.exit(1);
});
