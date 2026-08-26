/**
 * The catalog every procedurally-placed house is picked from — see
 * placeHouses() in worldData.js. Adding a 41st type later is just adding
 * one entry here; the placement algorithm and Real Estate Agency pricing
 * both derive everything they need (footprint, price) from this list, so
 * nothing else needs to change.
 *
 * `price` is what the Real Estate Agency charges to buy one (see
 * realestate.controller.js) — roughly scaled to footprint, biggest/nicest
 * houses cost the most, matching real-world sqft-ish pricing intuition.
 * Sorted cheapest to most expensive.
 */
const HOUSE_TYPES = [
  { key: 'tiny_shack', name: 'Tiny Shack', width: 110, height: 85, color: '#6b5b4d', price: 350 },
  { key: 'trailer_home', name: 'Trailer Home', width: 130, height: 90, color: '#7a6a52', price: 450 },
  { key: 'small_cottage', name: 'Small Cottage', width: 140, height: 100, color: '#8b7355', price: 650 },
  { key: 'garden_cottage', name: 'Garden Cottage', width: 145, height: 102, color: '#7d9163', price: 700 },
  { key: 'fisherman_hut', name: "Fisherman's Hut", width: 135, height: 100, color: '#4f6b73', price: 620 },
  { key: 'row_house', name: 'Row House', width: 150, height: 110, color: '#5b8266', price: 900 },
  { key: 'terrace_house', name: 'Terrace House', width: 155, height: 112, color: '#628257', price: 950 },
  { key: 'brick_bungalow', name: 'Brick Bungalow', width: 160, height: 118, color: '#8f5a4a', price: 1150 },
  { key: 'bungalow', name: 'Bungalow', width: 160, height: 120, color: '#4f7396', price: 1200 },
  { key: 'ranch_house', name: 'Ranch House', width: 175, height: 115, color: '#a17c4f', price: 1350 },
  { key: 'a_frame_cabin', name: 'A-Frame Cabin', width: 150, height: 130, color: '#6b5842', price: 1300 },
  { key: 'log_cabin', name: 'Log Cabin', width: 155, height: 125, color: '#7a5c3e', price: 1400 },
  { key: 'duplex', name: 'Duplex', width: 170, height: 120, color: '#7c6a9c', price: 1600 },
  { key: 'semi_detached', name: 'Semi-Detached House', width: 172, height: 122, color: '#6a5f9c', price: 1650 },
  { key: 'townhouse', name: 'Townhouse', width: 170, height: 130, color: '#9c6a4f', price: 2000 },
  { key: 'brownstone', name: 'Brownstone', width: 168, height: 135, color: '#8a5a3f', price: 2100 },
  { key: 'colonial_house', name: 'Colonial House', width: 180, height: 132, color: '#9c8a4f', price: 2200 },
  { key: 'craftsman_house', name: 'Craftsman House', width: 178, height: 128, color: '#7d6a45', price: 2150 },
  { key: 'apartment_block', name: 'Apartment Block', width: 180, height: 140, color: '#546a8f', price: 2500 },
  { key: 'condo_building', name: 'Condo Building', width: 185, height: 142, color: '#4f6a8a', price: 2650 },
  { key: 'split_level', name: 'Split-Level Home', width: 182, height: 136, color: '#6a8f6a', price: 2400 },
  { key: 'suburban_home', name: 'Suburban Home', width: 190, height: 140, color: '#6a9c7e', price: 3200 },
  { key: 'modern_farmhouse', name: 'Modern Farmhouse', width: 195, height: 138, color: '#8a8a7a', price: 3300 },
  { key: 'lakeside_house', name: 'Lakeside House', width: 192, height: 142, color: '#4f8a9c', price: 3450 },
  { key: 'hillside_home', name: 'Hillside Home', width: 188, height: 145, color: '#7c9c6a', price: 3350 },
  { key: 'contemporary_home', name: 'Contemporary Home', width: 200, height: 145, color: '#5f5f6e', price: 3800 },
  { key: 'georgian_house', name: 'Georgian House', width: 205, height: 148, color: '#9c5a5a', price: 4100 },
  { key: 'villa', name: 'Villa', width: 210, height: 150, color: '#c99b4f', price: 4500 },
  { key: 'mediterranean_villa', name: 'Mediterranean Villa', width: 215, height: 152, color: '#c9884f', price: 4800 },
  { key: 'tuscan_villa', name: 'Tuscan Villa', width: 212, height: 150, color: '#b8864a', price: 4650 },
  { key: 'coastal_villa', name: 'Coastal Villa', width: 218, height: 154, color: '#4fa3c9', price: 4900 },
  { key: 'penthouse_suite', name: 'Penthouse Suite', width: 190, height: 160, color: '#3a3a5c', price: 5200 },
  { key: 'chalet', name: 'Alpine Chalet', width: 200, height: 158, color: '#5c4a3a', price: 5000 },
  { key: 'plantation_house', name: 'Plantation House', width: 225, height: 160, color: '#c9b04f', price: 5500 },
  { key: 'country_estate', name: 'Country Estate', width: 230, height: 165, color: '#8a9c4f', price: 6000 },
  { key: 'gated_manor', name: 'Gated Manor', width: 235, height: 168, color: '#9c4f7c', price: 6500 },
  { key: 'mansion', name: 'Mansion', width: 240, height: 170, color: '#b5893f', price: 7000 },
  { key: 'hilltop_mansion', name: 'Hilltop Mansion', width: 245, height: 172, color: '#a8783f', price: 7800 },
  { key: 'beachfront_mansion', name: 'Beachfront Mansion', width: 248, height: 174, color: '#3f9ca8', price: 8200 },
  { key: 'grand_estate', name: 'Grand Estate', width: 252, height: 178, color: '#7c3aed', price: 9500 },
];

module.exports = { HOUSE_TYPES };
