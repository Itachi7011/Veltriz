/**
 * The Veltriz Sea's house catalog — the FIFTH residential style, and the
 * strangest one: every entry here is a structure built ON or OVER open
 * water (houseboats, stilt platforms, anchored barges, a repurposed
 * lighthouse, offshore-rig crew quarters), never a land house with a
 * "coastal" paint job. Shares zero keys/names/footprints with any of the
 * other four catalogs (data/houseTypes.js, data/modernHouseTypes.js,
 * data/ruralHouseTypes.js, data/portHouseTypes.js). Same contract as all of
 * them: placeHousesInRegion() in worldData.js picks purely by footprint.
 * Deliberately a smaller catalog than land zones (20 vs 30/40/60) — living
 * on the water is a niche, expensive choice in Veltriz, not the default.
 */
const SEA_HOUSE_TYPES = [
  { key: 'driftwood_raft_cabin', name: 'Driftwood Raft Cabin', width: 100, height: 80, color: '#8b7355', price: 900 },
  { key: 'net_float_shack', name: 'Net-Float Shack', width: 105, height: 85, color: '#6b8e94', price: 980 },
  { key: 'single_pontoon_houseboat', name: 'Single-Pontoon Houseboat', width: 140, height: 78, color: '#2f6690', price: 1150 },
  { key: 'stilted_tide_hut', name: 'Stilted Tide Hut', width: 110, height: 130, color: '#4a6b5a', price: 1300 },
  { key: 'anchored_dinghy_home', name: 'Anchored Dinghy Home', width: 118, height: 82, color: '#1e6e8c', price: 1400 },
  { key: 'twin_hull_houseboat', name: 'Twin-Hull Houseboat', width: 160, height: 90, color: '#0e7490', price: 1650 },
  { key: 'kelp_farm_bunk', name: 'Kelp Farm Bunk', width: 115, height: 95, color: '#166534', price: 1750 },
  { key: 'buoy_watch_tower', name: 'Buoy Watch Tower', width: 90, height: 200, color: '#facc15', price: 1950 },
  { key: 'pearl_divers_shanty', name: "Pearl Diver's Shanty", width: 122, height: 98, color: '#7c9c9c', price: 2050 },
  { key: 'moored_barge_flat', name: 'Moored Barge Flat', width: 190, height: 100, color: '#57534e', price: 2300 },
  { key: 'tidal_stilt_villa', name: 'Tidal Stilt Villa', width: 175, height: 150, color: '#0891b2', price: 2650 },
  { key: 'coral_reef_dome', name: 'Coral Reef Dome', width: 150, height: 150, color: '#f472b6', price: 2900 },
  { key: 'salvage_tanker_loft', name: 'Salvage Tanker Loft', width: 210, height: 105, color: '#78350f', price: 3150 },
  { key: 'converted_trawler_home', name: 'Converted Trawler Home', width: 200, height: 95, color: '#334155', price: 3350 },
  { key: 'floating_garden_pod', name: 'Floating Garden Pod', width: 160, height: 160, color: '#4d7c0f', price: 3600 },
  { key: 'decommissioned_lighthouse', name: 'Decommissioned Lighthouse', width: 120, height: 260, color: '#e2e8f0', price: 4200 },
  { key: 'submersible_bunker_suite', name: 'Submersible Bunker Suite', width: 170, height: 110, color: '#1e293b', price: 4600 },
  { key: 'offshore_rig_crew_quarters', name: 'Offshore Rig Crew Quarters', width: 220, height: 180, color: '#b45309', price: 5300 },
  { key: 'anchored_yacht_residence', name: 'Anchored Yacht Residence', width: 230, height: 110, color: '#f8fafc', price: 6200 },
  { key: 'deep_sea_platform_estate', name: 'Deep-Sea Platform Estate', width: 260, height: 220, color: '#0c4a6e', price: 7800 },
];

module.exports = { SEA_HOUSE_TYPES };
