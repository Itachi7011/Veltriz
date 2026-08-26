const { COUNTRIES, MAPS } = require('../data/worldData');
const { getGameClock } = require('../services/gameClock');

// ---------------------------------------------------------------------------
// GET /api/world/countries
// ---------------------------------------------------------------------------
const getCountries = (req, res) => {
  return res.json({ success: true, countries: COUNTRIES });
};

// ---------------------------------------------------------------------------
// GET /api/world/map/:mapId
// ---------------------------------------------------------------------------
const getMapConfig = (req, res) => {
  const map = MAPS[req.params.mapId];
  if (!map) return res.status(404).json({ success: false, message: 'Map not found' });
  return res.json({ success: true, map });
};

// ---------------------------------------------------------------------------
// GET /api/world/clock — the shared, stateless in-game calendar. See
// services/gameClock.js for why this is math, not a stored/ticked value.
// ---------------------------------------------------------------------------
const getClock = (req, res) => {
  return res.json({ success: true, clock: getGameClock() });
};

module.exports = { getCountries, getMapConfig, getClock };
