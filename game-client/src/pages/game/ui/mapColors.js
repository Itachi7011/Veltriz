// Shared between MiniMap.jsx and FullMap.jsx so both maps always agree on
// what color a building type or zone is. Also loosely matches the 3D
// world's zone ground-tint colors (see engine/WorldBuilder.js's
// ZONE_THEME) so the map and the actual world don't feel disconnected.

export const BUILDING_COLORS = {
  job_center: '#22c55e',
  market: '#f59e0b',
  bank: '#38bdf8',
  home: '#a78bfa',
  hospital: '#ef4444',
  restaurant: '#fb923c',
  city_hall: '#facc15',
  park: '#4ade80',
  electronics: '#06b6d4',
  boutique: '#ec4899',
  jeweler: '#d946ef',
  gym: '#84cc16',
  casino: '#a855f7',
  stock_exchange: '#10b981',
  school: '#fbbf24',
  real_estate: '#f472b6',
  police_station: '#3b82f6',
  cinema: '#e11d48',
  factory: '#78716c',
  credit_union: '#0ea5e9',
  insurance_office: '#14b8a6',
  lottery: '#f43f5e',
  courthouse: '#a16207',
  university: '#6366f1',
  logistics_hub: '#ea580c',
  government_complex: '#64748b',
  hardware_store: '#b45309',
  trading_post: '#65a30d',
  embassy: '#0891b2',
  tech_campus: '#6d28d9',
  quantum_labs: '#db2777',
  gun_store: '#7f1d1d',
  farm: '#65a30d',
  port_authority: '#0e7490',
  fish_market: '#0284c7',
  pearl_exchange: '#a78bfa',
  vehicle_dealer: '#f97316',
  marina: '#0ea5e9',
  fishing_wharf: '#0891b2',
  oil_rig: '#f59e0b',
  marine_research: '#8b5cf6',
  smugglers_den: '#450a0a',
};

export const DEFAULT_BUILDING_COLOR = '#9ca0c2';

export const ZONE_MAP_COLORS = {
  old_meridian: { ground: '#2f3a2f', border: '#5b7a5b', label: '#c7d2fe' },
  neo_meridian: { ground: '#233038', border: '#4a7a8c', label: '#67e8f9' },
  dustridge_county: { ground: '#4a4128', border: '#a68a4a', label: '#eab676' },
  port_haven: { ground: '#233b42', border: '#4a94a8', label: '#7dd3fc' },
  veltriz_sea: { ground: '#0c3040', border: '#2e7c94', label: '#5eead4' },
  default: { ground: '#242840', border: '#4a5170', label: '#c7d2fe' },
};

export const zoneForX = (zones, x) => {
  if (!zones) return null;
  return zones.find((z) => x >= z.minX && x <= z.maxX) || null;
};
