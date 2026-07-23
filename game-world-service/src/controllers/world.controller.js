const { COUNTRIES, MAPS } = require('../data/worldData');

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

module.exports = { getCountries, getMapConfig };
