const axios = require('axios');

const simulationClient = axios.create({
  baseURL: process.env.SIMULATION_SERVICE_URL,
  timeout: 10000,
  headers: {
    'X-Internal-Api-Key': process.env.INTERNAL_API_KEY,
  },
});

module.exports = simulationClient;
