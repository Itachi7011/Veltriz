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

// Port Haven + Veltriz Sea career tracks get their OWN name pool —
// international maritime/harbor flavor, not a reuse of the Old/Neo/
// Dustridge Indian name pool above. Any NPC whose job's careerTrack falls
// in MARITIME_CAREER_TRACKS below draws from here instead — see
// pickNameForJob().
const MARITIME_FIRST_NAMES = [
  'Marlowe', 'Soren', 'Talia', 'Ines', 'Kaito', 'Freya', 'Dario', 'Nadia',
  'Otis', 'Selkie', 'Bram', 'Yara', 'Cassius', 'Mira', 'Torvald', 'Junko',
];
const MARITIME_LAST_NAMES = [
  'Hollowell', 'Kastrup', 'Rousseau', 'Okafor', 'Vance', 'Delacroix',
  'Halvorsen', 'Marchetti', 'Quill', 'Saltmarsh', 'Voskuijlen', 'Tarrant',
];

// The four career tracks introduced by Port Haven and the Veltriz Sea
// (see economy-service's seedJobsAndMarket.js) — everything else keeps
// drawing from the original name pool.
const MARITIME_CAREER_TRACKS = new Set(['maritime', 'fishing', 'offshore_energy', 'oceanography']);

const randomName = () =>
  `${FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)]} ${
    LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)]
  }`;

const randomMaritimeName = () =>
  `${MARITIME_FIRST_NAMES[Math.floor(Math.random() * MARITIME_FIRST_NAMES.length)]} ${
    MARITIME_LAST_NAMES[Math.floor(Math.random() * MARITIME_LAST_NAMES.length)]
  }`;

const pickNameForJob = (job) =>
  MARITIME_CAREER_TRACKS.has(job.careerTrack) ? randomMaritimeName() : randomName();

const run = async () => {
  const { data } = await axios.get(`${process.env.ECONOMY_SERVICE_URL}/api/jobs`);
  const jobs = data.jobs;
  if (!jobs || jobs.length === 0) {
    throw new Error('economy-service returned no jobs — seed economy-service first (npm run seed there)');
  }

  // Neo Meridian roughly doubles the city's footprint and job/shop count,
  // so the default population scales up to match — override via
  // NPC_POPULATION_SIZE if you want a different density.
  const populationSize = parseInt(process.env.NPC_POPULATION_SIZE, 10) || 140;

  const existing = await Npc.countDocuments();
  if (existing > 0) {
    console.log(`[seed] ${existing} NPCs already exist — skipping (delete the 'npcs' collection to reseed)`);
    return;
  }

  const npcs = Array.from({ length: populationSize }, () => {
    const job = jobs[Math.floor(Math.random() * jobs.length)];
    return {
      name: pickNameForJob(job),
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
};

// Runnable directly (`npm run seed`), and also exported so server.js can
// call it automatically in the background after boot (NPC creation is
// guarded by the existing-count check above, so it's always safe to call
// again on restart — it just does nothing once the population exists).
if (require.main === module) {
  require('dotenv').config();
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
      console.error('[seed] Failed:', err.message);
      process.exit(1);
    });
}

module.exports = { run };
