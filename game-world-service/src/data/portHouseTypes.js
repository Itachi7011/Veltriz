/**
 * Port Haven's house catalog — the FOURTH residential style in Veltriz,
 * and a deliberately different design language from all three existing
 * catalogs (data/houseTypes.js's traditional suburbia, data/
 * modernHouseTypes.js's glass-tower modern, data/ruralHouseTypes.js's
 * cheap rural). Nothing here is a recolor or resize of an existing entry —
 * every key, name, and footprint is new.
 *
 * Theme: a working harbor city that got gentrified around the edges —
 * repurposed shipping containers and crane-district industrial lofts sit a
 * few blocks from customs-quarter rowhomes and quayside high-rises. Same
 * contract as every other catalog: placeHousesInRegion() in worldData.js
 * picks purely by footprint, so a 31st entry later needs no other changes.
 * Sorted cheapest to most expensive, same convention as the other three.
 */
const PORT_HOUSE_TYPES = [
  { key: 'stevedore_bunkhouse', name: "Stevedore's Bunkhouse", width: 118, height: 90, color: '#5c6a72', price: 550 },
  { key: 'dockworker_flat', name: 'Dockworker Flat', width: 125, height: 92, color: '#4f5d66', price: 620 },
  { key: 'crate_stack_home', name: 'Crate-Stack Home', width: 120, height: 130, color: '#b5551f', price: 680 },
  { key: 'single_container_home', name: 'Single Container Home', width: 130, height: 85, color: '#c2410c', price: 720 },
  { key: 'harbor_shanty', name: 'Harbor Shanty', width: 128, height: 96, color: '#6b7280', price: 760 },
  { key: 'tugboat_crew_flat', name: 'Tugboat Crew Flat', width: 132, height: 98, color: '#1e5f74', price: 820 },
  { key: 'double_container_loft', name: 'Double-Container Loft', width: 168, height: 88, color: '#b45309', price: 950 },
  { key: 'net_menders_row', name: "Net Menders' Row House", width: 150, height: 105, color: '#3f6b5c', price: 1050 },
  { key: 'gangway_walkup', name: 'Gangway Walkup', width: 155, height: 108, color: '#576f8a', price: 1150 },
  { key: 'customs_quarter_flat', name: 'Customs Quarter Flat', width: 158, height: 110, color: '#4a5a78', price: 1280 },
  { key: 'crane_district_loft', name: 'Crane District Loft', width: 165, height: 115, color: '#d97706', price: 1420 },
  { key: 'rigging_yard_house', name: 'Rigging Yard House', width: 162, height: 118, color: '#475569', price: 1500 },
  { key: 'stacked_container_condo', name: 'Stacked-Container Condo', width: 175, height: 150, color: '#ea580c', price: 1680 },
  { key: 'ballast_row_home', name: 'Ballast Row Home', width: 172, height: 122, color: '#334155', price: 1780 },
  { key: 'harbor_view_walkup', name: 'Harbor View Walkup', width: 178, height: 128, color: '#0e7490', price: 1950 },
  { key: 'freight_loft_conversion', name: 'Freight Loft Conversion', width: 182, height: 130, color: '#78716c', price: 2100 },
  { key: 'pilot_house_residence', name: "Pilot House Residence", width: 176, height: 135, color: '#155e75', price: 2250 },
  { key: 'quayside_brownstone', name: 'Quayside Brownstone', width: 185, height: 138, color: '#5b4636', price: 2450 },
  { key: 'drydock_view_flat', name: 'Drydock View Flat', width: 188, height: 140, color: '#0369a1', price: 2600 },
  { key: 'ironclad_townhome', name: 'Ironclad Townhome', width: 190, height: 142, color: '#374151', price: 2800 },
  { key: 'wharf_master_house', name: "Wharf Master's House", width: 195, height: 145, color: '#164e63', price: 3050 },
  { key: 'anchorage_terrace', name: 'Anchorage Terrace', width: 198, height: 148, color: '#0f766e', price: 3300 },
  { key: 'container_stack_villa', name: 'Container-Stack Villa', width: 205, height: 165, color: '#c2410c', price: 3600 },
  { key: 'signal_tower_residence', name: 'Signal Tower Residence', width: 150, height: 210, color: '#1e3a5f', price: 3900 },
  { key: 'harbor_master_manor', name: "Harbor Master's Manor", width: 215, height: 155, color: '#0c4a6e', price: 4300 },
  { key: 'quaymark_high_rise', name: 'Quaymark High-Rise', width: 200, height: 240, color: '#1d4ed8', price: 4800 },
  { key: 'lighthouse_flat_tower', name: 'Lighthouse Flat Tower', width: 140, height: 260, color: '#e2e8f0', price: 5200 },
  { key: 'commodore_penthouse', name: "Commodore's Penthouse", width: 220, height: 165, color: '#1e293b', price: 5800 },
  { key: 'grand_wharf_estate', name: 'Grand Wharf Estate', width: 235, height: 175, color: '#0891b2', price: 6600 },
  { key: 'admiralty_tower_suite', name: 'Admiralty Tower Suite', width: 210, height: 280, color: '#0f172a', price: 7400 },
];

module.exports = { PORT_HOUSE_TYPES };
