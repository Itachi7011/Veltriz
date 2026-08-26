const Character = require('../models/Character');
const Government = require('../models/Government');

// ---------------------------------------------------------------------------
// GET /api/internal/government — read-only tax rate lookup, called by
// economy-service on every job shift completion (see jobs.controller.js).
// Deliberately tiny and read-only: no way for economy-service to ever
// influence politics, only observe the one number it needs.
// ---------------------------------------------------------------------------
const getGovernmentPolicy = async (req, res, next) => {
  try {
    const gov = await Government.findById('singleton');
    return res.json({
      success: true,
      taxRatePercent: gov?.taxRatePercent || 0,
      mayor: gov?.mayor || null,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/internal/character/:userId/stats  { energyDelta?, happinessDelta? }
// Applies a relative change (positive or negative), clamped 0-100 by the
// schema's min/max. Used by economy-service when a player consumes an item
// (e.g. food restores energy, a night out costs energy but adds happiness).
// ---------------------------------------------------------------------------
const adjustStats = async (req, res, next) => {
  try {
    const { energyDelta = 0, happinessDelta = 0 } = req.body;

    const character = await Character.findOne({ user: req.params.userId });
    if (!character) {
      return res.status(404).json({ success: false, message: 'Character not found' });
    }

    character.stats.energy = Math.max(0, Math.min(100, character.stats.energy + energyDelta));
    character.stats.happiness = Math.max(0, Math.min(100, character.stats.happiness + happinessDelta));
    await character.save();

    return res.json({ success: true, stats: character.stats });
  } catch (err) {
    next(err);
  }
};

module.exports = { adjustStats, getGovernmentPolicy };
