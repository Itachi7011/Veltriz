const axios = require('axios');

const crimeClient = axios.create({
  baseURL: process.env.CRIME_SERVICE_URL,
  timeout: 10000,
  headers: {
    'X-Internal-Api-Key': process.env.INTERNAL_API_KEY,
  },
});

module.exports = crimeClient;
