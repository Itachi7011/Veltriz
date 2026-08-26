const axios = require('axios');
const Character = require('../models/Character');
const { MAPS, getDefaultMapId, COUNTRIES } = require('../data/worldData');
const { debitWallet, InsufficientFundsError } = require('../services/economyClient');
const logger = require('../utils/logger');

const RELOCATE_COST = 250; // VC — Embassy's re-flavor fee
const RELOCATE_COOLDOWN_MS = 60 * 60 * 1000; // 1 real-hour between moves

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

const RELAX_COOLDOWN_MS = 15 * 60 * 1000; // 15 real-minutes between relaxes
const RELAX_ENERGY_GAIN = 15;
const RELAX_HAPPINESS_GAIN = 10;

const GYM_COOLDOWN_MS = 20 * 60 * 1000; // 20 real-minutes between sessions
const GYM_COST = 30; // VC, debited from wallet via economy-service
const GYM_ENERGY_COST = 20; // a workout is tiring...
const GYM_HAPPINESS_GAIN = 25; // ...but the endorphins are worth it

const CINEMA_COOLDOWN_MS = 30 * 60 * 1000; // 30 real-minutes between showings
const CINEMA_COST = 20; // VC, a movie ticket
const CINEMA_HAPPINESS_GAIN = 20; // pure fun, no energy cost either way

// ---------------------------------------------------------------------------
// POST /api/character/relax — the Park's free action. Unlike consumables
// (economy-service's /api/market/use), this costs nothing and touches no
// other service: it's a small, cooldown-gated stat boost owned entirely by
// this service, since stats already live here.
// ---------------------------------------------------------------------------
const relaxAtPark = async (req, res, next) => {
  try {
    const character = await Character.findOne({ user: req.user.id });
    if (!character) {
      return res.status(404).json({ success: false, message: 'No character yet' });
    }

    if (character.lastRelaxAt) {
      const elapsed = Date.now() - new Date(character.lastRelaxAt).getTime();
      if (elapsed < RELAX_COOLDOWN_MS) {
        return res.status(429).json({
          success: false,
          message: 'You feel relaxed already — come back later.',
          remainingSeconds: Math.ceil((RELAX_COOLDOWN_MS - elapsed) / 1000),
        });
      }
    }

    character.stats.energy = Math.min(100, character.stats.energy + RELAX_ENERGY_GAIN);
    character.stats.happiness = Math.min(100, character.stats.happiness + RELAX_HAPPINESS_GAIN);
    character.lastRelaxAt = new Date();
    await character.save();

    return res.json({
      success: true,
      message: 'You relax in the park for a while. It helps.',
      stats: character.stats,
      nextRelaxAvailableInSeconds: RELAX_COOLDOWN_MS / 1000,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/character/gym — the Gym's paid workout action. Charges the
// player's wallet in economy-service BEFORE touching stats, so a failed
// charge (insufficient funds) never leaves Character in a half-updated
// state — see services/economyClient.js#debitWallet.
// ---------------------------------------------------------------------------
const workoutAtGym = async (req, res, next) => {
  try {
    const character = await Character.findOne({ user: req.user.id });
    if (!character) {
      return res.status(404).json({ success: false, message: 'No character yet' });
    }

    if (character.lastGymAt) {
      const elapsed = Date.now() - new Date(character.lastGymAt).getTime();
      if (elapsed < GYM_COOLDOWN_MS) {
        return res.status(429).json({
          success: false,
          message: "You're still sore from your last session — come back later.",
          remainingSeconds: Math.ceil((GYM_COOLDOWN_MS - elapsed) / 1000),
        });
      }
    }

    try {
      await debitWallet(req.user.id, GYM_COST, 'Gym: workout session');
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        return res.status(400).json({ success: false, message: `Not enough VC — a session costs ${GYM_COST} VC.` });
      }
      throw err;
    }

    character.stats.energy = Math.max(0, character.stats.energy - GYM_ENERGY_COST);
    character.stats.happiness = Math.min(100, character.stats.happiness + GYM_HAPPINESS_GAIN);
    character.lastGymAt = new Date();
    await character.save();

    return res.json({
      success: true,
      message: `Great workout! -${GYM_ENERGY_COST} energy, +${GYM_HAPPINESS_GAIN} happiness.`,
      stats: character.stats,
      nextGymAvailableInSeconds: GYM_COOLDOWN_MS / 1000,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/character/cinema — the Cinema's paid ticket. Happiness only, no
// energy cost either way — deliberately the "lightest" paid action, for
// variety against Gym (costs energy) and Park (free).
// ---------------------------------------------------------------------------
const watchMovieAtCinema = async (req, res, next) => {
  try {
    const character = await Character.findOne({ user: req.user.id });
    if (!character) {
      return res.status(404).json({ success: false, message: 'No character yet' });
    }

    if (character.lastCinemaAt) {
      const elapsed = Date.now() - new Date(character.lastCinemaAt).getTime();
      if (elapsed < CINEMA_COOLDOWN_MS) {
        return res.status(429).json({
          success: false,
          message: 'Nothing new showing yet — check back later.',
          remainingSeconds: Math.ceil((CINEMA_COOLDOWN_MS - elapsed) / 1000),
        });
      }
    }

    try {
      await debitWallet(req.user.id, CINEMA_COST, 'Cinema: movie ticket');
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        return res.status(400).json({ success: false, message: `Not enough VC — a ticket costs ${CINEMA_COST} VC.` });
      }
      throw err;
    }

    character.stats.happiness = Math.min(100, character.stats.happiness + CINEMA_HAPPINESS_GAIN);
    character.lastCinemaAt = new Date();
    await character.save();

    return res.json({
      success: true,
      message: `Great movie! +${CINEMA_HAPPINESS_GAIN} happiness.`,
      stats: character.stats,
      nextCinemaAvailableInSeconds: CINEMA_COOLDOWN_MS / 1000,
    });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/character/relocate  { country, city } — the Embassy's paid
// re-flavor. Cosmetic only (country/city are identity flavor, not a
// gameplay stat — see worldData.js's header comment), but it's a real
// wallet transaction with real validation and a real cooldown, not a free
// dropdown edit.
// ---------------------------------------------------------------------------
const relocate = async (req, res, next) => {
  try {
    const { country, city } = req.body;

    const countryEntry = COUNTRIES.find((c) => c.code === country);
    const cityEntry = countryEntry?.cities.find((c) => c.code === city);
    if (!countryEntry || !cityEntry) {
      return res.status(400).json({ success: false, message: 'Unknown country/city.' });
    }

    const character = await Character.findOne({ user: req.user.id });
    if (!character) return res.status(404).json({ success: false, message: 'No character yet' });

    if (character.country === country && character.city === city) {
      return res.status(400).json({ success: false, message: "You're already registered there." });
    }

    if (character.lastRelocateAt) {
      const elapsed = Date.now() - new Date(character.lastRelocateAt).getTime();
      if (elapsed < RELOCATE_COOLDOWN_MS) {
        return res.status(429).json({
          success: false,
          message: 'The Embassy needs time to process your last move.',
          remainingSeconds: Math.ceil((RELOCATE_COOLDOWN_MS - elapsed) / 1000),
        });
      }
    }

    try {
      await debitWallet(req.user.id, RELOCATE_COST, 'Embassy: relocation paperwork');
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        return res.status(400).json({ success: false, message: `Not enough VC — relocation costs ${RELOCATE_COST} VC.` });
      }
      throw err;
    }

    character.country = country;
    character.city = city;
    character.lastRelocateAt = new Date();
    await character.save();

    return res.json({
      success: true,
      message: `Registered as a citizen of ${cityEntry.name}, ${countryEntry.name}.`,
      country,
      city,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createCharacter,
  getMyCharacter,
  savePosition,
  relaxAtPark,
  workoutAtGym,
  watchMovieAtCinema,
  relocate,
};
