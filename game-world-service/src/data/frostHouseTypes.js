/**
 * Frostholm Heights' house catalog — the SIXTH residential style in
 * Veltriz, and nothing like any of the five before it: no shipping
 * containers, no glass towers, no farmhouses, no houseboats. Everything
 * here is built for snow — steep pitched roofs, timber framing, stone
 * chimneys, ice-glazed windows. Same contract as every other catalog:
 * placeHousesInRegion() in worldData.js picks purely by footprint.
 */
const FROST_HOUSE_TYPES = [
  { key: 'trappers_shack', name: "Trapper's Shack", width: 105, height: 90, color: '#5c4a3a', price: 700 },
  { key: 'woodcutter_cabin', name: "Woodcutter's Cabin", width: 115, height: 95, color: '#6b5541', price: 780 },
  { key: 'snowdrift_hut', name: 'Snowdrift Hut', width: 110, height: 100, color: '#8fa3b0', price: 850 },
  { key: 'single_room_chalet', name: 'Single-Room Chalet', width: 125, height: 105, color: '#7a5c3e', price: 950 },
  { key: 'pinewood_cottage', name: 'Pinewood Cottage', width: 130, height: 108, color: '#4a5d3a', price: 1050 },
  { key: 'frostvale_bungalow', name: 'Frostvale Bungalow', width: 135, height: 110, color: '#8b6f47', price: 1180 },
  { key: 'icicle_row_house', name: 'Icicle Row House', width: 140, height: 115, color: '#a8c5d6', price: 1320 },
  { key: 'timber_a_frame', name: 'Timber A-Frame', width: 145, height: 175, color: '#6b4a2f', price: 1480 },
  { key: 'stonefoot_cottage', name: 'Stonefoot Cottage', width: 150, height: 120, color: '#71717a', price: 1620 },
  { key: 'frozen_hearth_home', name: 'Frozen Hearth Home', width: 155, height: 122, color: '#8b5e34', price: 1780 },
  { key: 'ranger_outpost_house', name: 'Ranger Outpost House', width: 158, height: 125, color: '#3f5c45', price: 1950 },
  { key: 'glacier_view_cabin', name: 'Glacier View Cabin', width: 165, height: 128, color: '#5b7a94', price: 2150 },
  { key: 'snowpeak_duplex', name: 'Snowpeak Duplex', width: 175, height: 130, color: '#7a6249', price: 2380 },
  { key: 'firwood_lodge_home', name: 'Firwood Lodge Home', width: 180, height: 135, color: '#4a3d2c', price: 2600 },
  { key: 'aurora_view_cottage', name: 'Aurora-View Cottage', width: 185, height: 138, color: '#6b8caf', price: 2850 },
  { key: 'summit_a_frame_villa', name: 'Summit A-Frame Villa', width: 190, height: 210, color: '#5c4632', price: 3200 },
  { key: 'ice_carved_manor', name: 'Ice-Carved Manor', width: 200, height: 145, color: '#c7dbe6', price: 3550 },
  { key: 'frostholm_timber_estate', name: 'Frostholm Timber Estate', width: 210, height: 150, color: '#4f3a26', price: 3900 },
  { key: 'alpine_stone_villa', name: 'Alpine Stone Villa', width: 215, height: 155, color: '#5c5c63', price: 4300 },
  { key: 'chalet_grand_lodge', name: 'Chalet Grand Lodge', width: 225, height: 165, color: '#6b4423', price: 4750 },
  { key: 'ridge_top_retreat', name: 'Ridge-Top Retreat', width: 230, height: 170, color: '#3a4a5c', price: 5200 },
  { key: 'crystal_peak_penthouse', name: 'Crystal Peak Penthouse', width: 195, height: 260, color: '#dbe9f0', price: 5800 },
  { key: 'frostholm_baron_manor', name: 'Frostholm Baron Manor', width: 245, height: 178, color: '#3f2f1f', price: 6500 },
  { key: 'aurora_observatory_estate', name: 'Aurora Observatory Estate', width: 220, height: 290, color: '#2b3a52', price: 7200 },
  { key: 'summit_crown_lodge', name: 'Summit Crown Lodge', width: 260, height: 190, color: '#1f2937', price: 8000 },
];

module.exports = { FROST_HOUSE_TYPES };
