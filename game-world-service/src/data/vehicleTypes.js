/**
 * Veltriz's first vehicle system. Nothing in the original three zones ever
 * modeled a vehicle — characters only ever walked. Port Haven and the
 * Veltriz Sea introduce it because a port city built around a shipping
 * economy is the one place a garage/marina genuinely makes sense.
 *
 * Unlike houses (data/houseTypes.js et al. — one primary residence at a
 * time, tied to a specific pre-placed map instance via House.js), vehicles
 * are NOT placed on the map at fixed coordinates and a player can own more
 * than one — this is a garage/fleet, not a single-slot residence. See
 * models/Vehicle.js + controllers/marina.controller.js for the ownership
 * side; this file is just the static catalog, same spirit as economy-
 * service's MarketItem seed but owned by game-world-service since Port
 * Haven's two dealership buildings live here.
 *
 * `speedMultiplier` is the one real mechanic hook: character.controller.js
 * reads a player's fastest-owned vehicle of the matching `terrain` and
 * applies it to movement speed reporting (see MOVE_SPEED note in
 * MainScene.js on the client) — land vehicles help everywhere, water
 * vehicles only matter once Matter.js treats the Sea zone's open water as
 * traversable rather than a backdrop.
 */
const VEHICLE_TYPES = [
  // ---- Land vehicles — sold at AutoDock Motors (type: vehicle_dealer) ----
  { key: 'harbor_bicycle', name: 'Harbor Bicycle', terrain: 'land', speedMultiplier: 1.15, price: 220, icon: 'bike' },
  { key: 'cargo_scooter', name: 'Cargo Scooter', terrain: 'land', speedMultiplier: 1.3, price: 480, icon: 'zap' },
  { key: 'dockside_moped', name: 'Dockside Moped', terrain: 'land', speedMultiplier: 1.4, price: 750, icon: 'zap' },
  { key: 'customs_motorbike', name: 'Customs Motorbike', terrain: 'land', speedMultiplier: 1.6, price: 1400, icon: 'bike' },
  { key: 'flatbed_pickup', name: 'Flatbed Pickup', terrain: 'land', speedMultiplier: 1.55, price: 2600, icon: 'truck' },
  { key: 'port_sedan', name: 'Port Sedan', terrain: 'land', speedMultiplier: 1.7, price: 4200, icon: 'car' },
  { key: 'armored_cash_van', name: 'Armored Cash Van', terrain: 'land', speedMultiplier: 1.5, price: 6800, icon: 'truck' },
  { key: 'harbor_master_suv', name: "Harbor Master's SUV", terrain: 'land', speedMultiplier: 1.85, price: 9200, icon: 'car' },

  // ---- Watercraft — sold at Tideline Marina (type: marina) ----
  { key: 'inflatable_dinghy', name: 'Inflatable Dinghy', terrain: 'water', speedMultiplier: 1.2, price: 600, icon: 'sailboat' },
  { key: 'jet_ski', name: 'Jet Ski', terrain: 'water', speedMultiplier: 1.9, price: 2100, icon: 'waves' },
  { key: 'fishing_skiff', name: 'Fishing Skiff', terrain: 'water', speedMultiplier: 1.4, price: 3400, icon: 'ship' },
  { key: 'harbor_patrol_boat', name: 'Harbor Patrol Boat', terrain: 'water', speedMultiplier: 1.6, price: 5200, icon: 'ship' },
  { key: 'sailing_yacht', name: 'Sailing Yacht', terrain: 'water', speedMultiplier: 1.5, price: 8800, icon: 'sailboat' },
  { key: 'speedboat', name: 'Speedboat', terrain: 'water', speedMultiplier: 2.1, price: 11500, icon: 'waves' },
  { key: 'trawler_vessel', name: 'Trawler Vessel', terrain: 'water', speedMultiplier: 1.3, price: 14000, icon: 'ship' },
  { key: 'cargo_freighter', name: 'Cargo Freighter', terrain: 'water', speedMultiplier: 1.1, price: 42000, icon: 'container' },
  { key: 'luxury_motor_yacht', name: 'Luxury Motor Yacht', terrain: 'water', speedMultiplier: 1.8, price: 68000, icon: 'sailboat' },
];

module.exports = { VEHICLE_TYPES };
