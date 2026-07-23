/**
 * Phase 1 deliberately ships ONE small playable map (per the agreed scope —
 * see game-world-service README). Country/city selection at character
 * creation currently just flavors identity + which "region" a player is
 * from; every player's avatar spawns into the same small district map.
 * Multiple real maps per city is a later-phase expansion — the shape here
 * (mapId keyed) is designed so adding more later doesn't require a schema
 * change, just more entries in MAPS.
 */

const COUNTRIES = [
  {
    code: 'IN',
    name: 'India',
    cities: [
      { code: 'DEL', name: 'New Delhi' },
      { code: 'MUM', name: 'Mumbai' },
      { code: 'BLR', name: 'Bengaluru' },
    ],
  },
];

// Matter.js-friendly building definitions: simple rectangles the frontend
// builds static physics bodies from. Coordinates are in world pixels.
const MAPS = {
  delhi_cp_district: {
    id: 'delhi_cp_district',
    name: 'Connaught Place District',
    width: 2400,
    height: 1600,
    spawnPoint: { x: 1200, y: 800 },
    buildings: [
      {
        id: 'job_center',
        name: 'Job Center',
        type: 'job_center',
        icon: 'briefcase',
        x: 400,
        y: 300,
        width: 220,
        height: 160,
      },
      {
        id: 'market',
        name: 'Central Market',
        type: 'market',
        icon: 'store',
        x: 1800,
        y: 300,
        width: 260,
        height: 180,
      },
      {
        id: 'bank',
        name: 'Veltriz National Bank',
        type: 'bank',
        icon: 'landmark',
        x: 400,
        y: 1200,
        width: 240,
        height: 170,
      },
      {
        id: 'home_poor',
        name: 'Modest Housing',
        type: 'home',
        icon: 'home',
        x: 1100,
        y: 1350,
        width: 200,
        height: 150,
      },
      {
        id: 'home_rich',
        name: 'Uptown Residence',
        type: 'home',
        icon: 'home',
        x: 1900,
        y: 1350,
        width: 220,
        height: 160,
      },
    ],
    // Simple boundary obstacles so the map doesn't feel like an empty box
    obstacles: [
      { x: 900, y: 700, width: 300, height: 40 },
      { x: 1500, y: 900, width: 40, height: 300 },
    ],
  },
};

const getDefaultMapId = () => 'delhi_cp_district';

module.exports = { COUNTRIES, MAPS, getDefaultMapId };
