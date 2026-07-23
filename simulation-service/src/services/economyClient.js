const axios = require('axios');

// Public reads (jobs, market) — no auth needed, these are open GET routes
const economyPublic = axios.create({
  baseURL: process.env.ECONOMY_SERVICE_URL,
  timeout: 10000,
});

// Internal calls (price overrides) — authenticated with the shared secret,
// same pattern admin-service uses.
const economyInternal = axios.create({
  baseURL: process.env.ECONOMY_SERVICE_URL,
  timeout: 10000,
  headers: { 'X-Internal-Api-Key': process.env.INTERNAL_API_KEY },
});

module.exports = { economyPublic, economyInternal };
