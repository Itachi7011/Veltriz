/**
 * Phase 1 shipped ONE small playable map. Phases 2-4 expanded that same
 * district (now called OLD MERIDIAN) up to its current 4800x3200 footprint
 * and 30 locations. Phase 5 added a second, much larger district — NEO
 * MERIDIAN — directly east of it on the SAME continuous map. Phase 6 adds
 * a THIRD district — DUSTRIDGE COUNTY, a huge, sparse rural expanse south
 * of and past both — all still one MAPS entry, one Matter.js world, one
 * Phaser scene. There's no portal, no loading screen, no second map fetch
 * anywhere in this file: a player just keeps walking and the terrain
 * changes character. That's a deliberate choice — separate MAPS entries
 * would need a scene reload to "travel" between them, which is the
 * opposite of what was asked for.
 *
 * Zone assignment is computed automatically at the bottom of this file by
 * x-coordinate (ZONE_BOUNDARIES) rather than hand-tagged on every building,
 * so it can never drift out of sync with where things actually are.
 *
 * Neo Meridian deliberately reuses 28 of its 30 building TYPES from Old
 * Meridian (job_center, bank, market, casino, hospital, etc.) under new
 * names/visuals — GamePage.jsx's panels are keyed by TYPE, not building id,
 * so a second 'job_center' building just works with zero frontend changes;
 * it's the same pattern already used for Restaurant/Hospital sharing
 * Market's buy+use flow, or University/Factory sharing the Job Center's
 * apply flow. Only 2 buildings there are genuinely new: Neo Meridian Tower
 * (a 'tech_campus' career track) and Quantum Labs ('quantum_labs').
 *
 * Dustridge County reuses that same trick even harder — 13 of its 15
 * buildings are existing types under a rural skin (General Store is just
 * `market`, Sheriff's Office is just `police_station`, etc.). Only Farm
 * (`farm`, a new 3-tier agriculture career track) and Gun Store (`gun_store`,
 * a new 'weapon' market category) are new. Owning any weapon-category item
 * gives a real, if modest, bonus to crime success chance — see
 * crime-service's economyClient#checkHasWeapon — the one place this zone's
 * "more violence" theme actually touches game mechanics rather than just
 * being reskinned buildings.
 *
 * Houses follow the same split: Old Meridian draws from the 40-entry
 * data/houseTypes.js, Neo Meridian from the 60-entry
 * data/modernHouseTypes.js, and Dustridge County from the deliberately
 * small 15-entry data/ruralHouseTypes.js, placed at a much lower density
 * (see placeHouses() below) — "less houses" was explicit, not just a side
 * effect of the catalog being smaller.
 */

const { HOUSE_TYPES } = require('./houseTypes');
const { MODERN_HOUSE_TYPES } = require('./modernHouseTypes');
const { RURAL_HOUSE_TYPES } = require('./ruralHouseTypes');
const { PORT_HOUSE_TYPES } = require('./portHouseTypes');
const { SEA_HOUSE_TYPES } = require('./seaHouseTypes');

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
// builds static physics bodies from. Coordinates are the CENTER of each
// rectangle (Phaser's default rectangle origin), in world pixels.
const MAPS = {
  delhi_cp_district: {
    id: 'delhi_cp_district',
    name: 'Veltriz City',
    // Old Meridian + Neo Meridian occupy y:0-3200 within x:0-14000, as
    // before. Dustridge County (x:14400-27600) uses the FULL new height
    // (0-6400) — it's a wide-open rural expanse, not a narrow strip — which
    // is why total map height doubled even though the first two zones'
    // buildings didn't move an inch.
    // Phase 7 adds a FOURTH and FIFTH district — PORT HAVEN (a modern port
    // city) and THE VELTRIZ SEA (open water) — directly east of Dustridge
    // County, same continuous map/scene, same "just keep walking" rule as
    // every zone before it. Both are deliberately bigger by area than any
    // one of the three original zones taken alone: Old Meridian is 4800
    // wide, Neo Meridian 8800, Dustridge County (the biggest) 13200 — Port
    // Haven is 16000 wide and the Veltriz Sea is 18000, both across the
    // map's full 6400 height, so each individually out-sizes Dustridge.
    width: 62400,
    height: 6400,
    spawnPoint: { x: 2400, y: 1600 }, // unchanged — every character still starts in Old Meridian
    zones: [
      { key: 'old_meridian', name: 'Old Meridian', minX: 0, maxX: 4800 },
      { key: 'neo_meridian', name: 'Neo Meridian', minX: 5200, maxX: 14000 },
      { key: 'dustridge_county', name: 'Dustridge County', minX: 14400, maxX: 27600 },
      { key: 'port_haven', name: 'Port Haven', minX: 28000, maxX: 44000 },
      { key: 'veltriz_sea', name: 'Veltriz Sea', minX: 44400, maxX: 62400 },
    ],
    buildings: [
      // ---- Top row ----
      {
        id: 'job_center',
        name: 'Job Center',
        type: 'job_center',
        icon: 'briefcase',
        x: 667,
        y: 533,
        width: 220,
        height: 160,
      },
      {
        id: 'electronics',
        name: 'Veltriz Electronics',
        type: 'electronics',
        icon: 'cpu',
        x: 1533,
        y: 533,
        width: 230,
        height: 170,
      },
      {
        id: 'restaurant',
        name: 'Veltriz Diner',
        type: 'restaurant',
        icon: 'utensils',
        x: 2400,
        y: 533,
        width: 240,
        height: 170,
      },
      {
        id: 'boutique',
        name: 'Veltriz Boutique',
        type: 'boutique',
        icon: 'shirt',
        x: 3266,
        y: 533,
        width: 230,
        height: 170,
      },
      {
        id: 'market',
        name: 'Central Market',
        type: 'market',
        icon: 'store',
        x: 4133,
        y: 533,
        width: 260,
        height: 180,
      },
      // ---- Row 1.5 (new — fits in the vertical gap between top and middle rows) ----
      {
        id: 'stock_exchange',
        name: 'Veltriz Stock Exchange',
        type: 'stock_exchange',
        icon: 'trending-up',
        x: 300,
        y: 1067,
        width: 240,
        height: 170,
      },
      {
        id: 'school',
        name: 'Veltriz School',
        type: 'school',
        icon: 'graduation-cap',
        x: 1140,
        y: 1067,
        width: 240,
        height: 170,
      },
      {
        id: 'real_estate',
        name: 'Veltriz Real Estate',
        type: 'real_estate',
        icon: 'key',
        x: 1980,
        y: 1067,
        width: 240,
        height: 170,
      },
      {
        id: 'police_station',
        name: 'Veltriz Police Station',
        type: 'police_station',
        icon: 'shield',
        x: 2820,
        y: 1067,
        width: 240,
        height: 170,
      },
      {
        id: 'cinema',
        name: 'Veltriz Cinema',
        type: 'cinema',
        icon: 'clapperboard',
        x: 3660,
        y: 1067,
        width: 230,
        height: 160,
      },
      {
        id: 'factory',
        name: 'Veltriz Factory',
        type: 'factory',
        icon: 'factory',
        x: 4500,
        y: 1067,
        width: 250,
        height: 180,
      },
      // ---- Row 3.5 (new — sits in the large gap between the middle and
      // bottom rows; x-columns here are chosen to dodge the diamond
      // obstacle pattern, which occupies roughly x:1760-1840 and
      // x:2960-3040 for y up to 2100) ----
      {
        id: 'credit_union',
        name: 'Veltriz Credit Union',
        type: 'credit_union',
        icon: 'banknote',
        x: 300,
        y: 2150,
        width: 240,
        height: 170,
      },
      {
        id: 'insurance_office',
        name: 'Veltriz Insurance',
        type: 'insurance_office',
        icon: 'umbrella',
        x: 1140,
        y: 2150,
        width: 240,
        height: 170,
      },
      {
        id: 'lottery',
        name: 'Veltriz Lottery',
        type: 'lottery',
        icon: 'ticket',
        x: 2300,
        y: 2150,
        width: 240,
        height: 170,
      },
      {
        id: 'courthouse',
        name: 'Veltriz Courthouse',
        type: 'courthouse',
        icon: 'gavel',
        x: 2700,
        y: 2150,
        width: 240,
        height: 170,
      },
      {
        id: 'university',
        name: 'Veltriz University',
        type: 'university',
        icon: 'graduation-cap',
        x: 3660,
        y: 2150,
        width: 240,
        height: 170,
      },
      // ---- Row 3.75 (new — below row 3.5, past the obstacles entirely so
      // any x-column is safe) ----
      {
        id: 'logistics_hub',
        name: 'Veltriz Logistics Hub',
        type: 'logistics_hub',
        icon: 'truck',
        x: 300,
        y: 2400,
        width: 240,
        height: 170,
      },
      {
        id: 'government_complex',
        name: 'Veltriz Government Complex',
        type: 'government_complex',
        icon: 'building-2',
        x: 1140,
        y: 2400,
        width: 240,
        height: 170,
      },
      {
        id: 'hardware_store',
        name: 'Veltriz Hardware Store',
        type: 'hardware_store',
        icon: 'wrench',
        x: 1980,
        y: 2400,
        width: 240,
        height: 170,
      },
      {
        id: 'trading_post',
        name: 'Veltriz Trading Post',
        type: 'trading_post',
        icon: 'package',
        x: 2820,
        y: 2400,
        width: 240,
        height: 170,
      },
      {
        id: 'embassy',
        name: 'Veltriz Embassy',
        type: 'embassy',
        icon: 'globe',
        x: 3660,
        y: 2400,
        width: 240,
        height: 170,
      },
      // ---- Middle row ----
      {
        id: 'city_hall',
        name: 'City Hall',
        type: 'city_hall',
        icon: 'landmark',
        x: 667,
        y: 1600,
        width: 260,
        height: 190,
      },
      {
        id: 'jeweler',
        name: 'Veltriz Jeweler',
        type: 'jeweler',
        icon: 'gem',
        x: 1533,
        y: 1600,
        width: 220,
        height: 160,
      },
      // (spawn point sits at the exact center, 2400,1600 — kept clear)
      {
        id: 'gym',
        name: 'Veltriz Gym',
        type: 'gym',
        icon: 'dumbbell',
        x: 3266,
        y: 1600,
        width: 220,
        height: 160,
      },
      {
        id: 'hospital',
        name: 'Veltriz General Hospital',
        type: 'hospital',
        icon: 'cross',
        x: 4133,
        y: 1600,
        width: 240,
        height: 170,
      },
      // ---- Bottom row ----
      {
        id: 'bank',
        name: 'Veltriz National Bank',
        type: 'bank',
        icon: 'landmark',
        x: 667,
        y: 2667,
        width: 240,
        height: 170,
      },
      {
        id: 'home_poor',
        name: 'Modest Housing',
        type: 'home',
        icon: 'home',
        x: 2000,
        y: 2733,
        width: 200,
        height: 150,
      },
      {
        id: 'casino',
        name: 'Veltriz Casino',
        type: 'casino',
        icon: 'dice-5',
        x: 2400,
        y: 3000,
        width: 240,
        height: 170,
      },
      {
        id: 'home_rich',
        name: 'Uptown Residence',
        type: 'home',
        icon: 'home',
        x: 2800,
        y: 2733,
        width: 220,
        height: 160,
      },
      {
        id: 'park',
        name: 'Veltriz Central Park',
        type: 'park',
        icon: 'trees',
        x: 4133,
        y: 2667,
        width: 320,
        height: 240,
      },

      // =======================================================================
      // NEO MERIDIAN — the modern district, directly east of Old Meridian
      // (x >= 5200). 28 of these 30 buildings reuse an existing `type` under
      // a new name/skin (see file header) — only tech_campus and
      // quantum_labs are genuinely new mechanics.
      // =======================================================================

      // ---- Neo top row (y=700) ----
      {
        id: 'neo_tower',
        name: 'Neo Meridian Tower',
        type: 'tech_campus',
        icon: 'building-2',
        x: 5500,
        y: 700,
        width: 420,
        height: 300,
      },
      {
        id: 'circuitworks',
        name: 'CircuitWorks',
        type: 'electronics',
        icon: 'cpu',
        x: 6400,
        y: 700,
        width: 240,
        height: 170,
      },
      {
        id: 'threadline_outlet',
        name: 'Threadline Outlet',
        type: 'boutique',
        icon: 'shirt',
        x: 7300,
        y: 700,
        width: 240,
        height: 170,
      },
      {
        id: 'neo_mall',
        name: 'Neo Mall',
        type: 'jeweler',
        icon: 'gem',
        x: 8200,
        y: 700,
        width: 260,
        height: 180,
      },
      {
        id: 'smart_market',
        name: 'Smart Market',
        type: 'market',
        icon: 'store',
        x: 9100,
        y: 700,
        width: 260,
        height: 180,
      },
      {
        id: 'neo_job_center',
        name: 'Neo Job Center',
        type: 'job_center',
        icon: 'briefcase',
        x: 10000,
        y: 700,
        width: 220,
        height: 160,
      },
      {
        id: 'neo_bank',
        name: 'Neo Bank',
        type: 'bank',
        icon: 'landmark',
        x: 10900,
        y: 700,
        width: 240,
        height: 170,
      },
      {
        id: 'sky_lounge',
        name: 'Sky Lounge',
        type: 'cinema',
        icon: 'clapperboard',
        x: 11800,
        y: 700,
        width: 230,
        height: 160,
      },
      {
        id: 'neo_police_precinct',
        name: 'Neo Police Precinct',
        type: 'police_station',
        icon: 'shield',
        x: 12700,
        y: 700,
        width: 240,
        height: 170,
      },
      {
        id: 'neo_real_estate',
        name: 'Neo Real Estate',
        type: 'real_estate',
        icon: 'key',
        x: 13600,
        y: 700,
        width: 240,
        height: 170,
      },

      // ---- Neo middle row (y=1600) ----
      {
        id: 'neo_gym',
        name: 'Neo Gym',
        type: 'gym',
        icon: 'dumbbell',
        x: 5500,
        y: 1600,
        width: 220,
        height: 160,
      },
      {
        id: 'skypark',
        name: 'Skypark',
        type: 'park',
        icon: 'trees',
        x: 6400,
        y: 1600,
        width: 320,
        height: 240,
      },
      {
        id: 'vr_arcade',
        name: 'VR Arcade',
        type: 'casino',
        icon: 'dice-5',
        x: 7300,
        y: 1600,
        width: 240,
        height: 170,
      },
      {
        id: 'quantum_labs',
        name: 'Quantum Labs',
        type: 'quantum_labs',
        icon: 'flask-conical',
        x: 8200,
        y: 1600,
        width: 380,
        height: 280,
      },
      {
        id: 'medtech_clinic',
        name: 'MedTech Clinic',
        type: 'hospital',
        icon: 'cross',
        x: 9100,
        y: 1600,
        width: 240,
        height: 170,
      },
      {
        id: 'syntheats',
        name: 'SynthEats',
        type: 'restaurant',
        icon: 'utensils',
        x: 10000,
        y: 1600,
        width: 240,
        height: 170,
      },
      {
        id: 'quantum_bourse',
        name: 'Quantum Bourse',
        type: 'stock_exchange',
        icon: 'trending-up',
        x: 10900,
        y: 1600,
        width: 240,
        height: 170,
      },
      {
        id: 'metro_council',
        name: 'Metro Council',
        type: 'city_hall',
        icon: 'landmark',
        x: 11800,
        y: 1600,
        width: 260,
        height: 190,
      },
      {
        id: 'fintech_bank',
        name: 'FinTech Bank',
        type: 'credit_union',
        icon: 'banknote',
        x: 12700,
        y: 1600,
        width: 240,
        height: 170,
      },
      {
        id: 'neo_justice_center',
        name: 'Neo Justice Center',
        type: 'courthouse',
        icon: 'gavel',
        x: 13600,
        y: 1600,
        width: 240,
        height: 170,
      },

      // ---- Neo bottom row (y=2500) ----
      {
        id: 'megadraw',
        name: 'MegaDraw Lottery',
        type: 'lottery',
        icon: 'ticket',
        x: 5500,
        y: 2500,
        width: 240,
        height: 170,
      },
      {
        id: 'securelife',
        name: 'SecureLife Insurance',
        type: 'insurance_office',
        icon: 'umbrella',
        x: 6400,
        y: 2500,
        width: 240,
        height: 170,
      },
      {
        id: 'digital_academy',
        name: 'Digital Academy',
        type: 'school',
        icon: 'graduation-cap',
        x: 7300,
        y: 2500,
        width: 240,
        height: 170,
      },
      {
        id: 'innovation_institute',
        name: 'Innovation Institute',
        type: 'university',
        icon: 'graduation-cap',
        x: 8200,
        y: 2500,
        width: 240,
        height: 170,
      },
      {
        id: 'drone_depot',
        name: 'Drone Depot',
        type: 'logistics_hub',
        icon: 'truck',
        x: 9100,
        y: 2500,
        width: 240,
        height: 170,
      },
      {
        id: 'civic_center',
        name: 'Civic Center',
        type: 'government_complex',
        icon: 'building-2',
        x: 10000,
        y: 2500,
        width: 240,
        height: 170,
      },
      {
        id: 'fablab_supply',
        name: 'FabLab Supply',
        type: 'hardware_store',
        icon: 'wrench',
        x: 10900,
        y: 2500,
        width: 240,
        height: 170,
      },
      {
        id: 'cargo_exchange',
        name: 'Cargo Exchange',
        type: 'trading_post',
        icon: 'package',
        x: 11800,
        y: 2500,
        width: 240,
        height: 170,
      },
      {
        id: 'global_visa_center',
        name: 'Global Visa Center',
        type: 'embassy',
        icon: 'globe',
        x: 12700,
        y: 2500,
        width: 240,
        height: 170,
      },
      {
        id: 'autoworks_plant',
        name: 'AutoWorks Plant',
        type: 'factory',
        icon: 'factory',
        x: 13600,
        y: 2500,
        width: 250,
        height: 180,
      },

      // =======================================================================
      // DUSTRIDGE COUNTY — a huge, sparse rural expanse east/south of the
      // other two districts (x >= 14400). A compact "Main Street" cluster
      // near the entrance, surrounded by vast open farmland (see the
      // obstacles below for fence/crop-row scenery, and placeHouses() for
      // why houses here are so much sparser than the other two zones).
      // 13 of these 15 reuse an existing type under a rural name — only
      // 'farm' and 'gun_store' are new (see file header).
      // =======================================================================

      // ---- Main Street, top row (y=2800) ----
      {
        id: 'dustridge_farm',
        name: 'Dustridge Farm',
        type: 'farm',
        icon: 'wheat',
        x: 15500,
        y: 2800,
        width: 260,
        height: 190,
      },
      {
        id: 'grain_co_op',
        name: 'Grain Co-op Silo',
        type: 'trading_post',
        icon: 'warehouse',
        x: 16400,
        y: 2800,
        width: 340,
        height: 260,
      },
      {
        id: 'general_store',
        name: 'Dustridge General Store',
        type: 'market',
        icon: 'store',
        x: 17300,
        y: 2800,
        width: 240,
        height: 170,
      },
      {
        id: 'rusty_spur_saloon',
        name: 'Rusty Spur Saloon',
        type: 'casino',
        icon: 'dice-5',
        x: 18200,
        y: 2800,
        width: 240,
        height: 170,
      },
      {
        id: 'roadside_diner',
        name: 'Roadside Diner',
        type: 'restaurant',
        icon: 'utensils',
        x: 19100,
        y: 2800,
        width: 240,
        height: 170,
      },

      // ---- Main Street, middle row (y=3200) ----
      {
        id: 'gun_store',
        name: "Dustridge Gun Store",
        type: 'gun_store',
        icon: 'crosshair',
        x: 15500,
        y: 3200,
        width: 220,
        height: 160,
      },
      {
        id: 'sheriffs_office',
        name: "Sheriff's Office",
        type: 'police_station',
        icon: 'shield',
        x: 16400,
        y: 3200,
        width: 240,
        height: 170,
      },
      {
        id: 'county_hall',
        name: 'County Hall',
        type: 'city_hall',
        icon: 'landmark',
        x: 17300,
        y: 3200,
        width: 260,
        height: 190,
      },
      {
        id: 'dustridge_bank',
        name: 'Dustridge Bank',
        type: 'bank',
        icon: 'landmark',
        x: 18200,
        y: 3200,
        width: 240,
        height: 170,
      },
      {
        id: 'county_clinic',
        name: 'County Clinic',
        type: 'hospital',
        icon: 'cross',
        x: 19100,
        y: 3200,
        width: 240,
        height: 170,
      },

      // ---- Main Street, bottom row (y=3600) ----
      {
        id: 'dustridge_job_office',
        name: 'Dustridge Job Office',
        type: 'job_center',
        icon: 'briefcase',
        x: 15500,
        y: 3600,
        width: 220,
        height: 160,
      },
      {
        id: 'county_fairgrounds',
        name: 'County Fairgrounds',
        type: 'park',
        icon: 'trees',
        x: 16400,
        y: 3600,
        width: 320,
        height: 240,
      },
      {
        id: 'old_schoolhouse',
        name: 'Old Schoolhouse',
        type: 'school',
        icon: 'graduation-cap',
        x: 17300,
        y: 3600,
        width: 240,
        height: 170,
      },
      {
        id: 'feed_and_hardware',
        name: 'Feed & Hardware',
        type: 'hardware_store',
        icon: 'wrench',
        x: 18200,
        y: 3600,
        width: 240,
        height: 170,
      },
      {
        id: 'county_real_estate',
        name: 'County Real Estate',
        type: 'real_estate',
        icon: 'key',
        x: 19100,
        y: 3600,
        width: 240,
        height: 170,
      },

      // =======================================================================
      // PORT HAVEN — the modern port-city district, directly east of
      // Dustridge County (x >= 28000). Unlike Neo Meridian (28/30 reused
      // types) and Dustridge (13/15 reused types), Port Haven leans hard
      // into brand-new mechanics: 9 of its 30 buildings are genuinely new
      // TYPES (port_authority, fish_market, pearl_exchange, vehicle_dealer,
      // marina, and the standard reuses), because a shipping economy needed
      // real new systems (vehicles, seafood trade, pearl trade) rather than
      // just a fresh coat of paint. The rest reuse an existing type under a
      // harbor-flavored name — same trick as every zone before it — which
      // is exactly how jobs/economics/politics/jewelers/etc. show up here
      // with zero risk of drifting out of sync with the rest of the city
      // (one wallet, one criminal record, one Mayor, same as always).
      // =======================================================================

      // ---- Row 1 (y=700) ----
      {
        id: 'port_authority',
        name: 'Port Haven Authority',
        type: 'port_authority',
        icon: 'anchor',
        x: 29500,
        y: 700,
        width: 300,
        height: 220,
      },
      {
        id: 'harbor_market',
        name: 'Harbor Market',
        type: 'market',
        icon: 'store',
        x: 32000,
        y: 700,
        width: 260,
        height: 180,
      },
      {
        id: 'container_depot_electronics',
        name: 'Container Depot Electronics',
        type: 'electronics',
        icon: 'cpu',
        x: 34500,
        y: 700,
        width: 240,
        height: 170,
      },
      {
        id: 'compass_boutique',
        name: 'Compass Boutique',
        type: 'boutique',
        icon: 'shirt',
        x: 37000,
        y: 700,
        width: 240,
        height: 170,
      },
      {
        id: 'fish_market',
        name: 'Fish Market',
        type: 'fish_market',
        icon: 'fish',
        x: 39500,
        y: 700,
        width: 240,
        height: 170,
      },
      {
        id: 'pearl_divers_guild',
        name: "Pearl Divers' Guild",
        type: 'pearl_exchange',
        icon: 'gem',
        x: 42000,
        y: 700,
        width: 240,
        height: 170,
      },

      // ---- Row 2 (y=1900) ----
      {
        id: 'autodock_motors',
        name: 'AutoDock Motors',
        type: 'vehicle_dealer',
        icon: 'car',
        x: 29500,
        y: 1900,
        width: 260,
        height: 180,
      },
      {
        id: 'tideline_marina',
        name: 'Tideline Marina',
        type: 'marina',
        icon: 'sailboat',
        x: 32000,
        y: 1900,
        width: 280,
        height: 190,
      },
      {
        id: 'port_bank',
        name: 'Port Haven Bank',
        type: 'bank',
        icon: 'landmark',
        x: 34500,
        y: 1900,
        width: 240,
        height: 170,
      },
      {
        id: 'harbor_credit_union',
        name: 'Harbor Credit Union',
        type: 'credit_union',
        icon: 'banknote',
        x: 37000,
        y: 1900,
        width: 240,
        height: 170,
      },
      {
        id: 'shipping_exchange',
        name: 'Shipping Exchange',
        type: 'stock_exchange',
        icon: 'trending-up',
        x: 39500,
        y: 1900,
        width: 240,
        height: 170,
      },
      {
        id: 'cargo_insurance',
        name: 'Cargo Insurance Co.',
        type: 'insurance_office',
        icon: 'umbrella',
        x: 42000,
        y: 1900,
        width: 240,
        height: 170,
      },

      // ---- Row 3 (y=3100) ----
      {
        id: 'coast_guard_station',
        name: 'Coast Guard Station',
        type: 'police_station',
        icon: 'shield',
        x: 29500,
        y: 3100,
        width: 240,
        height: 170,
      },
      {
        id: 'maritime_courthouse',
        name: 'Maritime Courthouse',
        type: 'courthouse',
        icon: 'gavel',
        x: 32000,
        y: 3100,
        width: 240,
        height: 170,
      },
      {
        id: 'port_council_hall',
        name: 'Port Council Hall',
        type: 'city_hall',
        icon: 'landmark',
        x: 34500,
        y: 3100,
        width: 260,
        height: 190,
      },
      {
        id: 'longshoremens_union_hall',
        name: "Longshoremen's Union Hall",
        type: 'government_complex',
        icon: 'building-2',
        x: 37000,
        y: 3100,
        width: 240,
        height: 170,
      },
      {
        id: 'customs_house',
        name: 'Customs House',
        type: 'embassy',
        icon: 'globe',
        x: 39500,
        y: 3100,
        width: 240,
        height: 170,
      },
      {
        id: 'ship_chandlery',
        name: 'Ship Chandlery',
        type: 'hardware_store',
        icon: 'wrench',
        x: 42000,
        y: 3100,
        width: 240,
        height: 170,
      },

      // ---- Row 4 (y=4300) ----
      {
        id: 'seafarers_clinic',
        name: "Seafarer's Clinic",
        type: 'hospital',
        icon: 'cross',
        x: 29500,
        y: 4300,
        width: 240,
        height: 170,
      },
      {
        id: 'sailors_tavern',
        name: "Sailor's Tavern",
        type: 'restaurant',
        icon: 'utensils',
        x: 32000,
        y: 4300,
        width: 240,
        height: 170,
      },
      {
        id: 'drydock_shipyard',
        name: 'Drydock Shipyard',
        type: 'factory',
        icon: 'factory',
        x: 34500,
        y: 4300,
        width: 260,
        height: 190,
      },
      {
        id: 'boardwalk_cinema',
        name: 'Boardwalk Cinema',
        type: 'cinema',
        icon: 'clapperboard',
        x: 37000,
        y: 4300,
        width: 230,
        height: 160,
      },
      {
        id: 'tidewater_gym',
        name: 'Tidewater Gym',
        type: 'gym',
        icon: 'dumbbell',
        x: 39500,
        y: 4300,
        width: 220,
        height: 160,
      },
      {
        id: 'harborfront_boardwalk',
        name: 'Harborfront Boardwalk',
        type: 'park',
        icon: 'trees',
        x: 42000,
        y: 4300,
        width: 320,
        height: 240,
      },

      // ---- Row 5 (y=5500) ----
      {
        id: 'freight_trading_post',
        name: 'Freight Trading Post',
        type: 'trading_post',
        icon: 'package',
        x: 29500,
        y: 5500,
        width: 240,
        height: 170,
      },
      {
        id: 'harbor_lottery',
        name: 'Harbor Lottery',
        type: 'lottery',
        icon: 'ticket',
        x: 32000,
        y: 5500,
        width: 240,
        height: 170,
      },
      {
        id: 'maritime_academy',
        name: 'Maritime Academy',
        type: 'school',
        icon: 'graduation-cap',
        x: 34500,
        y: 5500,
        width: 240,
        height: 170,
      },
      {
        id: 'naval_war_college',
        name: 'Naval War College',
        type: 'university',
        icon: 'graduation-cap',
        x: 37000,
        y: 5500,
        width: 240,
        height: 170,
      },
      {
        id: 'harbor_real_estate',
        name: 'Harbor Real Estate',
        type: 'real_estate',
        icon: 'key',
        x: 39500,
        y: 5500,
        width: 240,
        height: 170,
      },
      {
        id: 'port_job_dock',
        name: 'Port Job Dock',
        type: 'job_center',
        icon: 'briefcase',
        x: 42000,
        y: 5500,
        width: 220,
        height: 160,
      },

      // =======================================================================
      // THE VELTRIZ SEA — open water east of Port Haven (x >= 44400). The
      // one zone in the whole city that isn't "a district", it's the ocean
      // itself: fishing, offshore energy, marine research, and a smugglers'
      // cove are all-new mechanics; the rest reuse an existing type the
      // same way every previous zone did. Houses out here (see
      // seaHouseTypes.js) are boats and platforms, not buildings on land.
      // =======================================================================

      // ---- Row 1 (y=900) ----
      {
        id: 'fishing_wharf',
        name: 'Fishing Wharf',
        type: 'fishing_wharf',
        icon: 'fish',
        x: 47000,
        y: 900,
        width: 300,
        height: 220,
      },
      {
        id: 'offshore_oil_platform',
        name: 'Offshore Oil Platform',
        type: 'oil_rig',
        icon: 'flame',
        x: 51000,
        y: 900,
        width: 380,
        height: 280,
      },
      {
        id: 'deepwater_research_institute',
        name: 'Deepwater Research Institute',
        type: 'marine_research',
        icon: 'flask-conical',
        x: 55000,
        y: 900,
        width: 340,
        height: 260,
      },
      {
        id: 'open_water_marina',
        name: 'Open Water Marina',
        type: 'marina',
        icon: 'sailboat',
        x: 59000,
        y: 900,
        width: 280,
        height: 190,
      },

      // ---- Row 2 (y=2400) ----
      {
        id: 'tide_bazaar',
        name: 'Tide Bazaar',
        type: 'market',
        icon: 'store',
        x: 47000,
        y: 2400,
        width: 260,
        height: 180,
      },
      {
        id: 'offshore_trust_bank',
        name: 'Offshore Trust Bank',
        type: 'bank',
        icon: 'landmark',
        x: 51000,
        y: 2400,
        width: 240,
        height: 170,
      },
      {
        id: 'coast_guard_cutter_dock',
        name: 'Coast Guard Cutter Dock',
        type: 'police_station',
        icon: 'shield',
        x: 55000,
        y: 2400,
        width: 240,
        height: 170,
      },
      {
        id: 'salvage_trading_post',
        name: 'Salvage Trading Post',
        type: 'trading_post',
        icon: 'package',
        x: 59000,
        y: 2400,
        width: 240,
        height: 170,
      },

      // ---- Row 3 (y=3900) ----
      {
        id: 'lighthouse_point',
        name: 'Lighthouse Point',
        type: 'park',
        icon: 'trees',
        x: 47000,
        y: 3900,
        width: 320,
        height: 240,
      },
      {
        id: 'maritime_law_tribunal',
        name: 'Maritime Law Tribunal',
        type: 'courthouse',
        icon: 'gavel',
        x: 51000,
        y: 3900,
        width: 240,
        height: 170,
      },
      {
        id: 'the_tide_casino',
        name: 'The Tide Casino',
        type: 'casino',
        icon: 'dice-5',
        x: 55000,
        y: 3900,
        width: 240,
        height: 170,
      },
      {
        id: 'sea_rescue_medbay',
        name: 'Sea Rescue Med-Bay',
        type: 'hospital',
        icon: 'cross',
        x: 59000,
        y: 3900,
        width: 240,
        height: 170,
      },

      // ---- Row 4 (y=5400) ----
      {
        id: 'the_salt_table',
        name: 'The Salt Table',
        type: 'restaurant',
        icon: 'utensils',
        x: 47000,
        y: 5400,
        width: 240,
        height: 170,
      },
      {
        id: 'sea_real_estate_kiosk',
        name: 'Sea Real Estate Kiosk',
        type: 'real_estate',
        icon: 'key',
        x: 51000,
        y: 5400,
        width: 240,
        height: 170,
      },
      {
        id: 'smugglers_cove',
        name: "Smugglers' Cove",
        type: 'smugglers_den',
        icon: 'skull',
        x: 55000,
        y: 5400,
        width: 240,
        height: 170,
      },
      {
        id: 'open_water_job_dock',
        name: 'Open-Water Job Dock',
        type: 'job_center',
        icon: 'briefcase',
        x: 59000,
        y: 5400,
        width: 220,
        height: 160,
      },
    ],
    // Simple boundary obstacles so the map doesn't feel like an empty box.
    // Kept clear of spawnPoint (2400,1600) and every building's sensor zone.
    obstacles: [
      { x: 1800, y: 1400, width: 600, height: 80 },
      { x: 3000, y: 1800, width: 80, height: 600 },
      { x: 3000, y: 1400, width: 600, height: 80 },
      { x: 1800, y: 1800, width: 80, height: 600 },
      // Neo Meridian — a couple of decorative dividers between rows, tucked
      // into a column gap so they can't ever collide with a building.
      { x: 9550, y: 1150, width: 700, height: 50 },
      { x: 9550, y: 2050, width: 700, height: 50 },
      // Dustridge County — fence/crop-row scenery scattered across the open
      // farmland, well clear of the Main Street cluster (x:15300-19300,
      // y:2650-3750).
      { x: 16000, y: 800, width: 900, height: 40 },
      { x: 19500, y: 800, width: 900, height: 40 },
      { x: 22500, y: 1200, width: 40, height: 900 },
      { x: 24500, y: 1500, width: 900, height: 40 },
      { x: 16000, y: 5200, width: 900, height: 40 },
      { x: 19500, y: 5400, width: 900, height: 40 },
      { x: 22500, y: 5000, width: 40, height: 900 },
      { x: 25000, y: 4700, width: 900, height: 40 },
      { x: 21500, y: 3200, width: 40, height: 1200 },
      { x: 15000, y: 5900, width: 1200, height: 40 },
      // Port Haven — crane/container-yard scenery between building rows,
      // tucked into the same column gaps used elsewhere so nothing can
      // ever collide with a real building.
      { x: 30750, y: 1300, width: 900, height: 40 },
      { x: 35750, y: 1300, width: 900, height: 40 },
      { x: 40750, y: 1300, width: 900, height: 40 },
      { x: 30750, y: 2500, width: 900, height: 40 },
      { x: 40750, y: 2500, width: 900, height: 40 },
      // Veltriz Sea — sparse buoy-line scenery; wide gaps since houses here
      // (boats/platforms) are placed on a much coarser grid than any land
      // zone.
      { x: 49000, y: 1600, width: 40, height: 900 },
      { x: 57000, y: 1600, width: 40, height: 900 },
      { x: 49000, y: 4600, width: 40, height: 900 },
      { x: 57000, y: 4600, width: 40, height: 900 },
    ],
  },
};

const getDefaultMapId = () => 'delhi_cp_district';

// ---------------------------------------------------------------------------
// Procedural house placement — draws from whichever catalog is passed in
// (data/houseTypes.js for Old Meridian, data/modernHouseTypes.js for Neo
// Meridian), scanning only the x-range given so each zone's houses stay in
// that zone (and never spill into the empty buffer strip between them).
// Places a house wherever one fits without overlapping any real building's
// sensor zone, an obstacle, the spawn point, or a previously-placed house
// — checked against ACTUAL footprints every time, so this stays correct
// regardless of step size, catalog size, or map size.
// ---------------------------------------------------------------------------
const rectsClear = (ax, ay, aHalfW, aHalfH, bx, by, bHalfW, bHalfH) =>
  Math.abs(ax - bx) >= aHalfW + bHalfW || Math.abs(ay - by) >= aHalfH + bHalfH;

const placeHousesInRegion = (map, houseTypes, xMin, xMax, existingHouses, options = {}) => {
  const houses = [];
  const EDGE_MARGIN = 220;
  const STEP_X = options.stepX || 260;
  const STEP_Y = options.stepY || 220;
  const yMin = options.yMin ?? 0;
  const yMax = options.yMax ?? map.height;
  const SPAWN_CLEARANCE = 260;
  const HOUSE_GAP = 15;

  const allPlacedSoFar = () => [...existingHouses, ...houses];

  for (let y = yMin + EDGE_MARGIN; y <= yMax - EDGE_MARGIN; y += STEP_Y) {
    for (let x = xMin + EDGE_MARGIN; x <= xMax - EDGE_MARGIN; x += STEP_X) {
      // Cycle by successful-placement count (within this region), not raw
      // grid row/col — see the Old Meridian phase notes above for why.
      const houseType = houseTypes[houses.length % houseTypes.length];
      const halfW = houseType.width / 2 + HOUSE_GAP;
      const halfH = houseType.height / 2 + HOUSE_GAP;

      let clear = Math.hypot(x - map.spawnPoint.x, y - map.spawnPoint.y) >= SPAWN_CLEARANCE;

      if (clear) {
        for (const b of map.buildings) {
          if (!rectsClear(x, y, halfW, halfH, b.x, b.y, b.width / 2 + 30, b.height / 2 + 30)) {
            clear = false;
            break;
          }
        }
      }
      if (clear) {
        for (const o of map.obstacles) {
          if (!rectsClear(x, y, halfW, halfH, o.x, o.y, o.width / 2, o.height / 2)) {
            clear = false;
            break;
          }
        }
      }
      if (clear) {
        for (const h of allPlacedSoFar()) {
          if (!rectsClear(x, y, halfW, halfH, h.x, h.y, h.width / 2 + HOUSE_GAP, h.height / 2 + HOUSE_GAP)) {
            clear = false;
            break;
          }
        }
      }

      if (clear) {
        houses.push({
          id: `house_${allPlacedSoFar().length + 1}`,
          name: houseType.name,
          houseType: houseType.key,
          icon: 'home',
          x,
          y,
          width: houseType.width,
          height: houseType.height,
          color: houseType.color,
          price: houseType.price,
          interactive: false, // MainScene skips the sensor zone for these — see MainScene.js
        });
      }
    }
  }

  return houses;
};

const placeHouses = (map) => {
  const [oldZone, neoZone, ruralZone, portZone, seaZone] = map.zones;

  // Old and Neo Meridian keep their ORIGINAL y-range (0-3200) even though
  // the map grew taller to fit Dustridge County — otherwise they'd sprawl
  // houses into the new empty southern strip and every previously-verified
  // house count/layout would silently change.
  const oldMeridian = placeHousesInRegion(map, HOUSE_TYPES, oldZone.minX, oldZone.maxX, [], { yMax: 3200 });
  const neoMeridian = placeHousesInRegion(map, MODERN_HOUSE_TYPES, neoZone.minX, neoZone.maxX, oldMeridian, {
    yMax: 3200,
  });

  // Dustridge County uses the FULL height and a much coarser grid — "less
  // houses" was explicit, not just a side effect of a smaller catalog.
  const dustridge = ruralZone
    ? placeHousesInRegion(map, RURAL_HOUSE_TYPES, ruralZone.minX, ruralZone.maxX, [...oldMeridian, ...neoMeridian], {
        stepX: 1400,
        stepY: 1200,
      })
    : [];

  // Port Haven uses the FULL height, but a noticeably coarser grid than
  // Old/Neo Meridian — it's meant to feel like a big, dense port city, not
  // literally the single most house-packed zone in the game by a wide
  // margin (the default 260/220 step, run across an area 3-6x either
  // original zone, produced 1200+ houses here alone — more than every
  // other zone combined — which reads as broken/unbalanced rather than
  // "bigger", so this is deliberately tuned down).
  const portHaven = portZone
    ? placeHousesInRegion(
        map,
        PORT_HOUSE_TYPES,
        portZone.minX,
        portZone.maxX,
        [...oldMeridian, ...neoMeridian, ...dustridge],
        { stepX: 620, stepY: 520 }
      )
    : [];

  // The Veltriz Sea is open water — houses here are boats/platforms, so
  // they're placed on the coarsest grid in the game (sparser even than
  // Dustridge's farmland), which also keeps the total house count sane
  // given how wide this zone is.
  const veltrizSea = seaZone
    ? placeHousesInRegion(
        map,
        SEA_HOUSE_TYPES,
        seaZone.minX,
        seaZone.maxX,
        [...oldMeridian, ...neoMeridian, ...dustridge, ...portHaven],
        { stepX: 1800, stepY: 1500 }
      )
    : [];

  return [...oldMeridian, ...neoMeridian, ...dustridge, ...portHaven, ...veltrizSea];
};

// Classify every building by x-coordinate, matched against the map's own
// `zones` metadata — so this can never drift out of sync with where things
// actually are (see file header for why this beats hand-tagging).
const classifyZone = (map, x) => {
  const zone = map.zones?.find((z) => x >= z.minX && x < z.maxX);
  return zone?.key || null;
};

Object.values(MAPS).forEach((map) => {
  map.buildings.forEach((b) => {
    b.zone = classifyZone(map, b.x);
  });
  map.houses = placeHouses(map);
  map.houses.forEach((h) => {
    h.zone = classifyZone(map, h.x);
  });
});

module.exports = {
  COUNTRIES,
  MAPS,
  getDefaultMapId,
  HOUSE_TYPES,
  MODERN_HOUSE_TYPES,
  RURAL_HOUSE_TYPES,
  PORT_HOUSE_TYPES,
  SEA_HOUSE_TYPES,
};
