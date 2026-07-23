const axios = require('axios');
const Character = require('../models/Character');
const { MAPS, getDefaultMapId } = require('../data/worldData');
const logger = require('../utils/logger');

// ---------------------------------------------------------------------------
// POST /api/character
// ---------------------------------------------------------------------------
const createCharacter = async (req, res, next) => {
  try {
    const existing = await Character.findOne({ user: req.user.id });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Character already exists' });
    }

    const { displayName, country, city, background, appearance } = req.body;
    const mapId = getDefaultMapId();
    const spawnPoint = MAPS[mapId].spawnPoint;

    const character = await Character.create({
      user: req.user.id,
      displayName,
      country,
      city,
      background,
      appearance,
      mapId,
      position: { x: spawnPoint.x, y: spawnPoint.y },
      lastOnlineAt: new Date(),
    });

    // Orchestrate wallet creation in economy-service. We forward the SAME
    // access token the player used to call us — economy-service verifies
    // it independently (shared JWT_SECRET), so this is just "acting on the
    // player's own behalf", not a privileged internal call.
// console.log("token is : " ,req.rawToken)

    try {
      await axios.post(
        `${process.env.ECONOMY_SERVICE_URL}/api/wallet/init`,
        { background },
        { headers: { Authorization: `Bearer ${req.rawToken}` }, timeout: 8000 }
      );
    } catch (walletErr) {
      // Roll back the character so the player isn't left in a broken
      // "citizen with no money" state — they can just retry character creation.
      await Character.deleteOne({ _id: character._id });
      logger.error('[character] Wallet init failed, rolled back character creation:', walletErr.message);
      return res.status(502).json({
        success: false,
        message: 'Could not initialize your wallet right now. Please try again.',
      });
    }

    return res.status(201).json({ success: true, message: 'Character created', character });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/character/me
// ---------------------------------------------------------------------------
const getMyCharacter = async (req, res, next) => {
  try {
    const character = await Character.findOne({ user: req.user.id });
    if (!character) {
      return res.status(404).json({ success: false, message: 'No character yet' });
    }
    return res.json({ success: true, character });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/character/position  — explicit save (e.g. on page unload).
// The socket layer also persists position periodically during play; this
// is a belt-and-suspenders fallback so "resume where you left off" is solid
// even if the socket connection dropped uncleanly.
// ---------------------------------------------------------------------------
const savePosition = async (req, res, next) => {
  try {
    const { x, y, mapId } = req.body;
    const character = await Character.findOneAndUpdate(
      { user: req.user.id },
      {
        position: { x, y },
        ...(mapId ? { mapId } : {}),
        lastSavedAt: new Date(),
      },
      { new: true }
    );
    if (!character) return res.status(404).json({ success: false, message: 'No character yet' });
    return res.json({ success: true, message: 'Position saved' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createCharacter, getMyCharacter, savePosition };
