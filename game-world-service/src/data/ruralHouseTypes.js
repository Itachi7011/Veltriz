/**
 * Dustridge County's house catalog — deliberately small (15 entries, not
 * 40/60) and every footprint/price skews low, matching "less houses, but
 * small older type houses" — the opposite design goal from Neo Meridian's
 * catalog. Same contract as the other two: placeHouses() in worldData.js
 * picks purely by footprint, so a 16th type slots in with no other changes.
 */
const RURAL_HOUSE_TYPES = [
  { key: 'dust_bowl_shack', name: 'Dust Bowl Shack', width: 85, height: 70, color: '#8a7355', price: 150 },
  { key: 'tin_roof_shack', name: 'Tin-Roof Shack', width: 90, height: 72, color: '#71716f', price: 180 },
  { key: 'weathered_shack', name: 'Weathered Shack', width: 95, height: 75, color: '#7a6a52', price: 210 },
  { key: 'rural_trailer', name: 'Rural Trailer', width: 110, height: 78, color: '#8f8a7a', price: 260 },
  { key: 'sharecroppers_cottage', name: "Sharecropper's Cottage", width: 105, height: 82, color: '#6b5b45', price: 300 },
  { key: 'old_homestead', name: 'Old Homestead', width: 120, height: 88, color: '#7c6a4f', price: 380 },
  { key: 'prairie_house', name: 'Prairie House', width: 125, height: 90, color: '#9c8a5f', price: 420 },
  { key: 'stone_farmhouse', name: 'Stone Farmhouse', width: 135, height: 95, color: '#8a8578', price: 520 },
  { key: 'timber_farmhouse', name: 'Timber Farmhouse', width: 138, height: 96, color: '#6b4f3a', price: 560 },
  { key: 'homestead_cottage', name: 'Homestead Cottage', width: 130, height: 92, color: '#7d9163', price: 490 },
  { key: 'ranch_bungalow', name: 'Ranch Bungalow', width: 140, height: 98, color: '#a17c4f', price: 620 },
  { key: 'barn_conversion', name: 'Barn Conversion', width: 155, height: 105, color: '#7c2d12', price: 720 },
  { key: 'windmill_house', name: 'Windmill House', width: 128, height: 110, color: '#5c4a3a', price: 680 },
  { key: 'silo_loft', name: 'Silo Loft', width: 100, height: 115, color: '#9c8a4f', price: 590 },
  { key: 'old_ranch_house', name: 'Old Ranch House', width: 150, height: 100, color: '#8f6a4a', price: 700 },
];

module.exports = { RURAL_HOUSE_TYPES };
