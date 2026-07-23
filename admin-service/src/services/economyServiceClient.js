const axios = require('axios');

const economyClient = axios.create({
  baseURL: process.env.ECONOMY_SERVICE_URL,
  timeout: 10000,
  headers: {
    'X-Internal-Api-Key': process.env.INTERNAL_API_KEY,
  },
});

module.exports = economyClient;
