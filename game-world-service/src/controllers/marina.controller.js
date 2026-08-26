const Vehicle = require('../models/Vehicle');
const { VEHICLE_TYPES } = require('../data/vehicleTypes');
const { debitWallet, creditWallet, InsufficientFundsError } = require('../services/economyClient');

const RESALE_RATE = 0.7; // vehicles depreciate faster than houses on resale

const findType = (vehicleKey) => VEHICLE_TYPES.find((v) => v.key === vehicleKey);

// ---------------------------------------------------------------------------
// GET /api/marina/catalog?terrain=land|water — used by both AutoDock Motors
// (terrain=land) and Tideline Marina / Open Water Marina (terrain=water).
// Unlike Real Estate's listings, this is a static catalog (infinite stock),
// not "unowned instances" — buying a jet ski doesn't remove it from sale.
// ---------------------------------------------------------------------------
const listCatalog = async (req, res, next) => {
  try {
    const { terrain } = req.query;
    const items = terrain ? VEHICLE_TYPES.filter((v) => v.terrain === terrain) : VEHICLE_TYPES;
    return res.json({ success: true, vehicles: items });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// GET /api/marina/my — every vehicle this player owns (a garage/fleet, not
// a single slot like Real Estate).
// ---------------------------------------------------------------------------
const getMyVehicles = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ owner: req.user.id }).sort({ purchasedAt: -1 });
    return res.json({ success: true, vehicles, resaleRate: RESALE_RATE });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/marina/buy  { vehicleKey }
// ---------------------------------------------------------------------------
const buyVehicle = async (req, res, next) => {
  try {
    const { vehicleKey } = req.body;
    const vehicleType = findType(vehicleKey);
    if (!vehicleType) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    try {
      await debitWallet(req.user.id, vehicleType.price, `${vehicleType.terrain === 'water' ? 'Marina' : 'AutoDock Motors'}: purchased ${vehicleType.name}`);
    } catch (err) {
      if (err instanceof InsufficientFundsError) {
        return res
          .status(400)
          .json({ success: false, message: `Not enough VC — ${vehicleType.name} costs ${vehicleType.price} VC.` });
      }
      throw err;
    }

    const vehicle = await Vehicle.create({
      owner: req.user.id,
      vehicleKey: vehicleType.key,
      name: vehicleType.name,
      terrain: vehicleType.terrain,
      pricePaid: vehicleType.price,
    });

    return res.json({ success: true, message: `You now own a ${vehicleType.name}.`, vehicle });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// POST /api/marina/sell  { vehicleId } — sell back to the dealership at
// RESALE_RATE of what was paid. Credits first, deletes only on success —
// same ordering rationale as realestate.controller.js#sellHouse.
// ---------------------------------------------------------------------------
const sellVehicle = async (req, res, next) => {
  try {
    const { vehicleId } = req.body;
    const vehicle = await Vehicle.findOne({ _id: vehicleId, owner: req.user.id });
    if (!vehicle) return res.status(404).json({ success: false, message: "You don't own that vehicle." });

    const payout = Math.round(vehicle.pricePaid * RESALE_RATE);
    await creditWallet(req.user.id, payout, `Sold ${vehicle.name}`);
    await vehicle.deleteOne();

    return res.json({ success: true, message: `Sold ${vehicle.name} for ${payout} VC.`, payout });
  } catch (err) {
    next(err);
  }
};

module.exports = { listCatalog, getMyVehicles, buyVehicle, sellVehicle };
