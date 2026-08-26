const House = require('../models/House');
const { debitWallet, creditWallet, InsufficientFundsError } = require('../services/economyClient');

const RESALE_RATE = 0.8; // sell back to the Agency for 80% of the house's listed price

// ---------------------------------------------------------------------------
// GET /api/realestate/listings — unowned houses only, cheapest first
// ---------------------------------------------------------------------------
const listAvailable = async (req, res, next) => {
  try {
    const houses = await House.find({ owner: null }).sort({ price: 1 }).limit(100);
    return res.json({ success: true, houses });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/realestate/my — the house(s) this player owns
// ---------------------------------------------------------------------------
const getMyHouses = async (req, res, next) => {
  try {
    const houses = await House.find({ owner: req.user.id });
    return res.json({ success: true, houses, resaleRate: RESALE_RATE });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/realestate/buy  { houseId }
// One primary residence at a time — sell your current one first (see
// sellHouse below) if you want a different one. Real upgrade path: sell,
// then buy, two calls, both real wallet transactions either way.
// ---------------------------------------------------------------------------
const buyHouse = async (req, res, next) => {
  try {
    const { houseId } = req.body;

    const alreadyOwned = await House.findOne({ owner: req.user.id });
    if (alreadyOwned) {
      return res.status(409).json({
        success: false,
        message: `You already own ${alreadyOwned.name}. Sell it here first if you want to move.`,
      });
    }

    const house = await House.findOne({ houseId });
    if (!house) return res.status(404).json({ success: false, message: 'Listing not found' });
    if (house.owner) return res.status(409).json({ success: false, message: 'This house is already owned.' });

    try {
      await debitWallet(req.user.id, house.price, `Real Estate: purchased ${house.name}`);
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        return res.status(400).json({ success: false, message: `Not enough VC — ${house.name} costs ${house.price} VC.` });
      }
      throw err;
    }

    house.owner = req.user.id;
    house.purchasedAt = new Date();
    await house.save();

    return res.json({ success: true, message: `Congratulations! You now own ${house.name}.`, house });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/realestate/sell  { houseId } — sell back to the Agency at
// RESALE_RATE of listed price. Credits the wallet BEFORE clearing ownership
// would be backwards (could double-spend if the credit somehow failed after
// ownership cleared) — so ownership only clears once the credit succeeds.
// ---------------------------------------------------------------------------
const sellHouse = async (req, res, next) => {
  try {
    const { houseId } = req.body;

    const house = await House.findOne({ houseId, owner: req.user.id });
    if (!house) return res.status(404).json({ success: false, message: "You don't own that house." });

    const payout = Math.round(house.price * RESALE_RATE);
    await creditWallet(req.user.id, payout, `Real Estate: sold ${house.name}`);

    house.owner = null;
    house.purchasedAt = null;
    await house.save();

    return res.json({ success: true, message: `Sold ${house.name} for ${payout} VC.`, payout, house });
  } catch (err) {
    next(err);
  }
};

module.exports = { listAvailable, getMyHouses, buyHouse, sellHouse };
