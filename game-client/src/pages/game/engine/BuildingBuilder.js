import * as THREE from 'three';

/**
 * Turns the existing flat "colored rectangle + name" building/house data
 * (unchanged — nothing removed from worldData.js) into real extruded 3D
 * structures: walls, a roof (flat or pitched depending on footprint), a
 * window grid, a door, and a floating name sign — instead of a single
 * painted square.
 */

const canvasCache = new Map();

// ---------------------------------------------------------------------
// House size + walk-in interior geometry constants — shared with
// PhysicsController.js (imported there) so the visual walls/doorway and
// the collision walls/doorway can never drift out of sync with each
// other. Buildings/shops are untouched (still the solid-box +
// proximity-panel model they always were) — this only applies to houses.
// ---------------------------------------------------------------------

// Houses were rendered at the same 0.92 footprint factor as every other
// building, which — combined with never having a real doorway gap in
// their collider — made them too small to walk into even before that
// gap existed. 1.5x is as large as they can safely go: worldData.js's
// house-placement algorithm (see HOUSE_GAP in worldData.js) already
// leaves each house a flat 15px (1.2 world-unit) clearance buffer to its
// neighbors on every side, and this stays comfortably inside that buffer
// even for two of the largest houses placed directly next to each other.
export const HOUSE_SIZE_MULTIPLIER = 1.5;
export const HOUSE_WALL_THICKNESS = 0.22;
export const HOUSE_FLOOR_CLEARANCE = 2.35; // interior ceiling height per floor — enough for the tallest driver to stand and walk normally

/** Half-width of the doorway gap carved into a house's front wall —
 * capped so even the smallest houses get a comfortably player-sized gap
 * (PLAYER_RADIUS is 0.34 in PhysicsController.js), and scaled up a bit
 * for wider houses so the opening still looks proportional. */
export function houseDoorHalfWidth(width) {
  // Player collision radius is 0.34 (PhysicsController.PLAYER_RADIUS) —
  // a 0.62 minimum half-width only left ~0.28 of clearance on each side,
  // which is workable in theory but felt "too small to enter" in
  // practice (easy to clip the frame if not walking dead-center). 0.95
  // minimum roughly doubles that margin.
  return Math.min(Math.max(0.95, width * 0.11), 1.3);
}

/**
 * The 4-6 wall-segment colliders (front-left, front-right flanking the
 * doorway, back, left, right) that make up a house's exterior — replacing
 * what used to be one solid filled rectangle with no way in. Pure
 * geometry math, no THREE.js objects, so PhysicsController (which has no
 * reason to depend on Three.js scene-graph code) can import and use this
 * directly for collision, while BuildingBuilder below uses the exact same
 * numbers to build the matching visual walls.
 *
 * @param {{x:number,y:number,width:number,height:number}} h a house from
 *   mapConfig.houses (map-space x/y/width/height, NOT world units yet)
 * @param {number} scale world-units-per-map-pixel (WORLD_SCALE)
 */
export function computeHouseWalls(h, scale) {
  const width = Math.max(3, h.width * scale * HOUSE_SIZE_MULTIPLIER);
  const depth = Math.max(3, h.height * scale * HOUSE_SIZE_MULTIPLIER);
  const halfW = width / 2;
  const halfD = depth / 2;
  const t = HOUSE_WALL_THICKNESS;
  const doorHalfW = houseDoorHalfWidth(width);
  const cx = h.x * scale;
  const cz = h.y * scale;
  const frontHalfSeg = (halfW - doorHalfW) / 2;

  const segments = [
    { key: 'back', x: cx, z: cz - halfD + t / 2, halfW, halfD: t / 2, len: width },
    { key: 'left', x: cx - halfW + t / 2, z: cz, halfW: t / 2, halfD, len: depth },
    { key: 'right', x: cx + halfW - t / 2, z: cz, halfW: t / 2, halfD, len: depth },
  ];
  if (frontHalfSeg > 0.12) {
    segments.push({ key: 'frontLeft', x: cx - doorHalfW - frontHalfSeg, z: cz + halfD - t / 2, halfW: frontHalfSeg, halfD: t / 2, len: frontHalfSeg * 2 });
    segments.push({ key: 'frontRight', x: cx + doorHalfW + frontHalfSeg, z: cz + halfD - t / 2, halfW: frontHalfSeg, halfD: t / 2, len: frontHalfSeg * 2 });
  }

  return { width, depth, halfW, halfD, wallThickness: t, doorHalfW, cx, cz, segments };
}

/**
 * World-space footprint + vertical span of the staircase(s) a house
 * needs for its upper floor(s) — one entry per floor transition (a
 * 3-floor mansion gets two: ground→1 and 1→2). Pure geometry, shared by
 * BuildingBuilder's visual step meshes below and PhysicsController's
 * ramp-height physics, so a player's feet always match what they see.
 *
 * Modeled as ONE smooth incline per flight for physics purposes (the
 * visible steps are just geometry riding on top of that incline) rather
 * than per-step collision — much simpler and still reads correctly,
 * since the player's Y just needs to track the flight's slope, not
 * literally catch on each stair nose.
 */
export function computeHouseStairs(h, scale) {
  const walls = computeHouseWalls(h, scale);
  const style = classifyHouse(h);
  const floors = style.floors;
  if (floors < 2) return [];

  const floorHeight = HOUSE_FLOOR_CLEARANCE + HOUSE_WALL_THICKNESS;
  const t = walls.wallThickness;
  const stairWidth = 1.1;
  const maxRun = Math.min(4.2, (walls.depth - t * 2) * 0.62);
  const treadTarget = 0.27;
  const stepCount = Math.max(6, Math.round(maxRun / treadTarget));
  const run = maxRun;
  // Hugs the interior of the left wall, starting near the front (door)
  // side and climbing back toward the rear of the house.
  const localX = -walls.halfW + t + stairWidth / 2 + 0.15;
  const localZFront = walls.halfD - t - 0.3;

  const flights = [];
  for (let f = 1; f < floors; f++) {
    flights.push({
      x: walls.cx + localX,
      z: walls.cz + (localZFront - run / 2),
      halfW: stairWidth / 2,
      halfD: run / 2,
      startZ: walls.cz + localZFront,
      fromY: (f - 1) * floorHeight,
      toY: f * floorHeight,
      stepCount,
      run,
      width: stairWidth,
      localX,
      localZFront,
      floorIndex: f,
    });
  }
  return flights;
}

/**
 * The flat, walkable floor area of every floor ABOVE the ground floor —
 * ground floor needs no registration (0 is already the default "normal
 * ground" height everywhere), but floor 2+ needs an explicit flat
 * "platform" so a player who's just climbed the stairs doesn't fall
 * straight through the floor the instant they step off the staircase's
 * own footprint. Deliberately covers the FULL interior rectangle
 * (including the area technically over the stairwell) rather than
 * carving out the stairwell gap the way the visual mesh does — see
 * PhysicsController._groundHeightAt's tolerance logic for why that
 * overlap is harmless (it naturally only "wins" once the player is
 * actually up at that height, not while still climbing through it).
 */
export function computeHouseFloorPlatforms(h, scale) {
  const walls = computeHouseWalls(h, scale);
  const style = classifyHouse(h);
  const floors = style.floors;
  if (floors < 2) return [];
  const floorHeight = HOUSE_FLOOR_CLEARANCE + HOUSE_WALL_THICKNESS;
  const t = walls.wallThickness;
  const platforms = [];
  for (let f = 1; f < floors; f++) {
    platforms.push({
      x: walls.cx,
      z: walls.cz,
      halfW: walls.halfW - t,
      halfD: walls.halfD - t,
      // Represented with the exact same {startZ, run, fromY, toY} shape
      // as a staircase flight, just with fromY === toY and a run of 1 —
      // so PhysicsController's ramp-height formula handles both a sloped
      // flight and a flat platform with the same one code path, no
      // special-casing needed.
      startZ: walls.cz,
      run: 1,
      fromY: f * floorHeight,
      toY: f * floorHeight,
    });
  }
  return platforms;
}

function shadeColor(hex, amt) {
  const c = new THREE.Color(hex);
  if (amt >= 0) c.lerp(new THREE.Color('#ffffff'), amt);
  else c.lerp(new THREE.Color('#000000'), -amt);
  return `#${c.getHexString()}`;
}

function makeSignTexture(text, accent) {
  const key = `${text}__${accent}`;
  if (canvasCache.has(key)) return canvasCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(10,12,20,0.82)';
  roundRect(ctx, 4, 4, canvas.width - 8, canvas.height - 8, 18);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  roundRect(ctx, 4, 4, canvas.width - 8, canvas.height - 8, 18);
  ctx.stroke();
  ctx.fillStyle = '#f4f6ff';
  ctx.font = 'bold 46px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  wrapText(ctx, text.toUpperCase(), canvas.width / 2, canvas.height / 2, canvas.width - 40, 50);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  canvasCache.set(key, tex);
  return tex;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, cx, cy, maxWidth, lineHeight) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  const startY = cy - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineHeight));
}

function makeWindowTexture(color, cols, rows) {
  const key = `win_${color}_${cols}_${rows}`;
  if (canvasCache.has(key)) return canvasCache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cellW = canvas.width / cols;
  const cellH = canvas.height / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = Math.random() > 0.45;
      ctx.fillStyle = lit ? 'rgba(255,224,150,0.9)' : 'rgba(20,26,44,0.85)';
      const pad = cellW * 0.18;
      ctx.fillRect(c * cellW + pad, r * cellH + pad, cellW - pad * 2, cellH - pad * 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  canvasCache.set(key, tex);
  return tex;
}

// Deterministic-ish palette + height per building "type" so the skyline
// reads as varied rather than uniform gray boxes, while zone theme still
// tints the base wall color.
const TYPE_STYLE = {
  bank: { floors: 6, wallTint: 0.05, roof: 'flat', accent: '#eab308' },
  credit_union: { floors: 3, wallTint: 0.03, roof: 'flat', accent: '#38bdf8' },
  stock_exchange: { floors: 9, wallTint: 0.08, roof: 'flat', accent: '#eab308' },
  pearl_exchange: { floors: 3, wallTint: 0.1, roof: 'flat', accent: '#a7f3d0' },
  insurance_office: { floors: 4, wallTint: 0.02, roof: 'flat', accent: '#64748b' },
  real_estate: { floors: 2, wallTint: 0.03, roof: 'flat', accent: '#0d9488' },
  job_center: { floors: 2, wallTint: 0, roof: 'flat', accent: '#10b981' },
  lottery: { floors: 1, wallTint: 0.06, roof: 'flat', accent: '#facc15' },
  city_hall: { floors: 4, wallTint: -0.02, roof: 'dome', accent: '#f8fafc' },
  government_complex: { floors: 5, wallTint: -0.02, roof: 'flat', accent: '#f8fafc' },
  courthouse: { floors: 4, wallTint: -0.02, roof: 'pediment', accent: '#f8fafc' },
  embassy: { floors: 3, wallTint: -0.01, roof: 'pediment', accent: '#e2e8f0' },
  hospital: { floors: 5, wallTint: 0.06, roof: 'flat', accent: '#22c55e' },
  police_station: { floors: 3, wallTint: -0.05, roof: 'flat', accent: '#3b82f6' },
  school: { floors: 3, wallTint: 0.02, roof: 'flat', accent: '#f97316' },
  university: { floors: 5, wallTint: 0.02, roof: 'dome', accent: '#f97316' },
  casino: { floors: 4, wallTint: 0.1, roof: 'flat', accent: '#ec4899' },
  cinema: { floors: 2, wallTint: 0.1, roof: 'flat', accent: '#a855f7' },
  factory: { floors: 2, wallTint: -0.1, roof: 'sawtooth', accent: '#f59e0b' },
  tech_campus: { floors: 10, wallTint: 0.12, roof: 'flat', accent: '#22d3ee' },
  quantum_labs: { floors: 8, wallTint: 0.14, roof: 'flat', accent: '#22d3ee' },
  marine_research: { floors: 3, wallTint: 0.08, roof: 'flat', accent: '#06b6d4' },
  logistics_hub: { floors: 2, wallTint: -0.08, roof: 'flat', accent: '#94a3b8' },
  oil_rig: { floors: 3, wallTint: -0.12, roof: 'flat', accent: '#ea580c' },
  market: { floors: 2, wallTint: 0.02, roof: 'flat', accent: '#f59e0b' },
  fish_market: { floors: 1, wallTint: 0.02, roof: 'flat', accent: '#0e7490' },
  trading_post: { floors: 1, wallTint: -0.06, roof: 'gable', accent: '#92400e' },
  boutique: { floors: 2, wallTint: 0.08, roof: 'flat', accent: '#f472b6' },
  electronics: { floors: 2, wallTint: 0.09, roof: 'flat', accent: '#38bdf8' },
  jeweler: { floors: 1, wallTint: 0.1, roof: 'flat', accent: '#fbbf24' },
  hardware_store: { floors: 1, wallTint: -0.04, roof: 'flat', accent: '#f59e0b' },
  gun_store: { floors: 1, wallTint: -0.1, roof: 'flat', accent: '#7f1d1d' },
  vehicle_dealer: { floors: 1, wallTint: 0.1, roof: 'flat', accent: '#3b82f6' },
  smugglers_den: { floors: 1, wallTint: -0.18, roof: 'flat', accent: '#1f2937' },
  restaurant: { floors: 2, wallTint: 0.04, roof: 'flat', accent: '#ef4444' },
  gym: { floors: 2, wallTint: 0.03, roof: 'flat', accent: '#ef4444' },
  park: { floors: 1, wallTint: 0, roof: 'none', accent: '#22c55e' },
  farm: { floors: 1, wallTint: -0.1, roof: 'gable', accent: '#84cc16' },
  marina: { floors: 1, wallTint: 0, roof: 'flat', accent: '#0ea5e9' },
  fishing_wharf: { floors: 1, wallTint: 0, roof: 'flat', accent: '#0ea5e9' },
  port_authority: { floors: 5, wallTint: -0.05, roof: 'flat', accent: '#0ea5e9' },
  home: { floors: 1, wallTint: 0.02, roof: 'gable', accent: '#84a17e' },
};
const DEFAULT_STYLE = { floors: 3, wallTint: 0, roof: 'flat', accent: '#7c3aed' };

// Houses use a `houseType` key (not `type`), and there are 100+ distinct
// keys across the catalogs. Previously this only derived a roof shape
// and floor count from a price/name regex, which meant e.g. a "log
// cabin", a "ranch house" and a "colonial house" all rendered as the
// exact same gable-roofed box in different colors. This classifies into
// a real family of house archetypes — each with its own roof shape and
// massing details (porch, chimney, columns, balconies, a turret for the
// grandest estates) — so the silhouette itself tells you what kind of
// house you're looking at, the same way the roof types already do for
// civic buildings above.
function classifyHouse(h) {
  const key = h.houseType || '';
  const name = (h.name || '').toLowerCase();
  const price = h.price || 0;
  const test = (re) => re.test(key) || re.test(name);

  // Deterministic per-house jitter — same reasoning as the character
  // face-genetics seed: two houses in the same family/price bracket
  // still shouldn't be exact geometric clones of each other.
  let seed = 0;
  const seedSrc = h.id || key || name || 'house';
  for (let i = 0; i < seedSrc.length; i++) seed = (seed * 31 + seedSrc.charCodeAt(i)) >>> 0;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return (seed >>> 8) / 16777216;
  };

  if (test(/shack|trailer/)) {
    return { family: 'shack', roof: 'shed', floors: 1, porch: false, chimney: rnd() < 0.3, fenceTier: 'none', balconies: false, columns: false, turret: false };
  }
  if (test(/cabin|chalet/)) {
    const isChalet = test(/chalet/);
    return { family: 'cabin', roof: 'gable', floors: isChalet ? 2 : 1, porch: true, chimney: true, fenceTier: 'low', balconies: isChalet, columns: false, turret: false };
  }
  if (test(/cottage|hut|bungalow/)) {
    return { family: 'cottage', roof: 'gable', floors: 1, porch: true, chimney: rnd() < 0.7, fenceTier: 'low', balconies: false, columns: false, turret: false };
  }
  if (test(/row_house|terrace|townhouse|brownstone|duplex|semi_detached/)) {
    return { family: 'terrace', roof: 'flat', floors: 2, porch: false, chimney: false, fenceTier: 'low', balconies: false, columns: false, turret: false };
  }
  if (test(/ranch/)) {
    return { family: 'ranch', roof: 'hip', floors: 1, porch: true, chimney: true, fenceTier: 'low', balconies: false, columns: false, turret: false };
  }
  if (test(/farmhouse|plantation/)) {
    return { family: 'farmhouse', roof: 'gable', floors: 2, porch: true, chimney: true, fenceTier: 'low', balconies: false, columns: true, turret: false };
  }
  if (test(/colonial|georgian|craftsman/)) {
    return { family: 'colonial', roof: 'gable', floors: 2, porch: true, chimney: true, fenceTier: 'low', balconies: false, columns: true, turret: false };
  }
  if (test(/apartment|condo|penthouse|suite/) && !test(/villa/)) {
    const floors = Math.max(3, Math.min(9, 2 + Math.floor(price / 2600)));
    return { family: 'tower', roof: 'flat', floors, porch: false, chimney: false, fenceTier: 'none', balconies: true, columns: false, turret: false };
  }
  if (test(/villa/)) {
    return { family: 'villa', roof: 'hip', floors: 2, porch: false, chimney: false, fenceTier: 'mid', balconies: true, columns: false, turret: false, archDoor: true };
  }
  if (test(/split_level|hillside|lakeside/)) {
    return { family: 'split', roof: 'gable', floors: 2, porch: true, chimney: true, fenceTier: 'low', balconies: false, columns: false, turret: false };
  }
  if (test(/estate|manor|mansion/)) {
    return { family: 'mansion', roof: 'hip', floors: 3, porch: true, chimney: true, fenceTier: 'high', balconies: true, columns: true, turret: true };
  }
  if (test(/suburban|modern_farmhouse|contemporary/)) {
    return { family: 'suburban', roof: 'gable', floors: 2, porch: true, chimney: rnd() < 0.5, fenceTier: 'low', balconies: false, columns: false, turret: false };
  }

  // Safety net for any future catalog key that doesn't match a family
  // above — keeps the original price-driven behavior instead of an
  // uncaught case, so adding a 41st house type never silently breaks.
  const isTowerLike = /tower|condo|flat|loft|penthouse|apartment|suite|estate|complex|residence|studio|unit/i.test(key);
  if (isTowerLike && price > 2200) {
    const floors = Math.max(2, Math.min(9, 2 + Math.floor(price / 3200)));
    return { family: 'tower', roof: 'flat', floors, porch: false, chimney: false, fenceTier: 'none', balconies: true, columns: false, turret: false };
  }
  const floors = price > 4500 ? 2 : 1;
  return { family: 'cottage', roof: 'gable', floors, porch: price > 1500, chimney: rnd() < 0.6, fenceTier: 'low', balconies: false, columns: false, turret: false };
}

function zoneWallColor(zoneKey) {
  const map = {
    old_meridian: '#5b6390',
    neo_meridian: '#3f5566',
    dustridge_county: '#8a7455',
    port_haven: '#3c5b68',
    veltriz_sea: '#2c5568',
  };
  return map[zoneKey] || '#5b6390';
}

function addColumns(group, width, depth, wallHeight, count = 4) {
  const colHeight = wallHeight * 0.85;
  const colRadius = Math.min(0.22, width * 0.035);
  const spacing = (width * 0.72) / (count - 1);
  const startX = -width * 0.36;
  const colMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.5 });
  for (let i = 0; i < count; i++) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(colRadius, colRadius * 1.1, colHeight, 8), colMat);
    col.position.set(startX + i * spacing, colHeight / 2, depth / 2 + 0.22);
    col.castShadow = true;
    group.add(col);
  }
  // Portico roof over the columns
  const portico = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.82, 0.14, 0.55),
    new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.5 })
  );
  portico.position.set(0, colHeight + 0.07, depth / 2 + 0.22);
  portico.castShadow = true;
  group.add(portico);
}

function addSkyscraperSetback(group, width, depth, wallHeight, accentColor) {
  // A "wedding cake" tiered top so tall towers read as towers, not just
  // a tall box — classic setback-skyscraper silhouette.
  const tierMat = new THREE.MeshStandardMaterial({ color: '#20263c', roughness: 0.3, metalness: 0.4 });
  const tier1 = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, wallHeight * 0.22, depth * 0.72), tierMat);
  tier1.position.y = wallHeight + (wallHeight * 0.22) / 2;
  tier1.castShadow = true;
  group.add(tier1);
  const tier2 = new THREE.Mesh(new THREE.BoxGeometry(width * 0.46, wallHeight * 0.16, depth * 0.46), tierMat);
  tier2.position.y = wallHeight + wallHeight * 0.22 + (wallHeight * 0.16) / 2;
  tier2.castShadow = true;
  group.add(tier2);
  const spire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.14, wallHeight * 0.18, 6),
    new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 0.4 })
  );
  spire.position.y = wallHeight + wallHeight * 0.38 + (wallHeight * 0.18) / 2;
  group.add(spire);
}

function addRoofClutter(group, width, depth, wallHeight) {
  // A couple of small vent/AC-unit boxes on flat rooftops — a cheap detail
  // that reads immediately as "real rooftop" instead of a bare plane.
  const unitMat = new THREE.MeshStandardMaterial({ color: '#8b93a8', roughness: 0.6, metalness: 0.2 });
  const count = Math.min(3, Math.max(1, Math.round((width * depth) / 60)));
  for (let i = 0; i < count; i++) {
    const w = 0.5 + Math.random() * 0.3;
    const unit = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, w * 0.8), unitMat);
    unit.position.set((Math.random() - 0.5) * width * 0.5, wallHeight + 0.42, (Math.random() - 0.5) * depth * 0.5);
    unit.castShadow = true;
    group.add(unit);
  }
}

// Category-level massing details on top of the roof/columns already
// handled elsewhere — these are the "silhouette from a block away" cues
// that make a factory unmistakably NOT a bank, a casino unmistakably NOT
// a school, etc.
function addCategoryDetails(group, type, width, depth, wallHeight) {
  if (['factory', 'logistics_hub', 'oil_rig'].includes(type)) {
    const stackMat = new THREE.MeshStandardMaterial({ color: '#5b6172', roughness: 0.7 });
    const count = type === 'oil_rig' ? 1 : 2;
    for (let i = 0; i < count; i++) {
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, wallHeight * 1.5, 10), stackMat);
      stack.position.set(-width * 0.28 + i * width * 0.4, wallHeight + (wallHeight * 1.5) / 2, -depth * 0.22);
      stack.castShadow = true;
      group.add(stack);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 10), stackMat);
      rim.position.copy(stack.position);
      rim.position.y = wallHeight + wallHeight * 1.5;
      rim.rotation.x = Math.PI / 2;
      group.add(rim);
    }
  }

  if (['tech_campus', 'quantum_labs'].includes(type)) {
    // Swap the standard window walls for a glassy curtain-wall look —
    // handled by returning an override material the caller applies.
    return { glassOverride: true };
  }

  if (type === 'casino') {
    const neonMat = new THREE.MeshStandardMaterial({ color: '#ec4899', emissive: '#ec4899', emissiveIntensity: 0.9, roughness: 0.3 });
    const trim = new THREE.Mesh(new THREE.BoxGeometry(width * 1.02, 0.08, 0.08), neonMat);
    trim.position.set(0, wallHeight * 0.15, depth / 2 + 0.02);
    group.add(trim);
    const trim2 = trim.clone();
    trim2.position.y = wallHeight * 0.85;
    group.add(trim2);
    const marquee = new THREE.Mesh(new THREE.BoxGeometry(width * 0.9, 0.9, 0.15), new THREE.MeshStandardMaterial({ color: '#1a0f24', roughness: 0.5 }));
    marquee.position.set(0, wallHeight + 0.6, depth / 2 + 0.1);
    group.add(marquee);
    const marqueeLight = new THREE.Mesh(new THREE.BoxGeometry(width * 0.82, 0.5, 0.02), neonMat);
    marqueeLight.position.set(0, wallHeight + 0.6, depth / 2 + 0.18);
    group.add(marqueeLight);
  }

  if (['marina', 'fishing_wharf', 'port_authority', 'fish_market'].includes(type)) {
    const woodMat = new THREE.MeshStandardMaterial({ color: '#8a6a4a', roughness: 0.85 });
    const dock = new THREE.Mesh(new THREE.BoxGeometry(width * 0.5, 0.12, depth * 0.9), woodMat);
    dock.position.set(width * 0.7, 0.06, 0);
    dock.receiveShadow = true;
    group.add(dock);
    for (let i = -1; i <= 1; i++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), woodMat);
      post.position.set(width * 0.95, 0.3, i * depth * 0.35);
      group.add(post);
    }
  }

  if (type === 'hospital') {
    const crossMat = new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#7f1d1d', emissiveIntensity: 0.5 });
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.9, 0.06), crossMat);
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.06), crossMat);
    const crossY = wallHeight * 0.6;
    vBar.position.set(0, crossY, depth / 2 + 0.04);
    hBar.position.set(0, crossY, depth / 2 + 0.04);
    group.add(vBar, hBar);
  }

  // Embassy: a flagpole out front — the single most recognizable
  // "this is a diplomatic building" cue in real life, and one civic
  // buildings otherwise share nothing else in common to convey.
  if (type === 'embassy') {
    const poleMat = new THREE.MeshStandardMaterial({ color: '#d4d4d8', roughness: 0.4, metalness: 0.5 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, wallHeight * 1.25, 8), poleMat);
    pole.position.set(0, (wallHeight * 1.25) / 2, depth / 2 + 1.1);
    pole.castShadow = true;
    group.add(pole);
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.36),
      new THREE.MeshStandardMaterial({ color: '#3b82f6', roughness: 0.7, side: THREE.DoubleSide })
    );
    flag.position.set(0.28, wallHeight * 1.15, depth / 2 + 1.1);
    flag.castShadow = true;
    group.add(flag);
  }

  // Jeweler: a faceted "gem" ornament on the roofline — reads instantly
  // and is a fun distinguishing silhouette against every other shop.
  if (type === 'jeweler') {
    const gemMat = new THREE.MeshStandardMaterial({ color: '#fde68a', roughness: 0.15, metalness: 0.6, emissive: '#fbbf24', emissiveIntensity: 0.25 });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), gemMat);
    gem.position.set(0, wallHeight + 0.42, depth / 2 - 0.2);
    gem.castShadow = true;
    group.add(gem);
  }

  // Pearl Exchange: same idea as the jeweler's gem, but a lustrous
  // sphere instead of a faceted gem — keeps the two "sparkly commerce"
  // buildings from reading as the same silhouette.
  if (type === 'pearl_exchange') {
    const pearlMat = new THREE.MeshStandardMaterial({ color: '#f0fdfa', roughness: 0.2, metalness: 0.35, emissive: '#a7f3d0', emissiveIntensity: 0.2 });
    const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), pearlMat);
    pearl.position.set(0, wallHeight + 0.4, depth / 2 - 0.2);
    pearl.castShadow = true;
    group.add(pearl);
  }

  // Gun Store: a simple crossed-rifles silhouette above the entrance —
  // unmistakable at a glance, same design language as the hospital cross.
  if (type === 'gun_store') {
    const barMat = new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.5, metalness: 0.4 });
    const bar1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.85, 6), barMat);
    bar1.rotation.z = Math.PI / 4;
    bar1.position.set(0, wallHeight * 0.65, depth / 2 + 0.04);
    const bar2 = bar1.clone();
    bar2.rotation.z = -Math.PI / 4;
    group.add(bar1, bar2);
  }

  // Vehicle Dealer: a glass showroom front instead of the standard
  // window texture, plus a string of little pennant flags along the
  // roofline — the classic "used car lot" cue.
  if (type === 'vehicle_dealer') {
    const glassMat = new THREE.MeshStandardMaterial({ color: '#bae6fd', roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.55 });
    const showroom = new THREE.Mesh(new THREE.BoxGeometry(width * 0.7, wallHeight * 0.75, 0.06), glassMat);
    showroom.position.set(0, (wallHeight * 0.75) / 2, depth / 2 + 0.05);
    group.add(showroom);
    const flagMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.6, side: THREE.DoubleSide });
    const flagCount = 7;
    for (let i = 0; i < flagCount; i++) {
      const flag = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.14, 3), flagMat);
      flag.rotation.z = Math.PI / 2;
      flag.position.set(-width * 0.42 + (width * 0.84 * i) / (flagCount - 1), wallHeight + 0.1, depth / 2 + 0.1);
      group.add(flag);
    }
  }

  // Smugglers' Den: deliberately LESS eye-catching than everything
  // around it — boarded-dark windows and no signage lighting, so it
  // reads as "shut, shady, easy to miss" rather than another storefront.
  if (type === 'smugglers_den') {
    const boardMat = new THREE.MeshStandardMaterial({ color: '#141821', roughness: 0.95 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(width * 0.55, wallHeight * 0.35, 0.05), boardMat);
    board.position.set(0, wallHeight * 0.55, depth / 2 + 0.06);
    group.add(board);
  }

  // Real Estate Agency: a little yard sign board out front, the same
  // visual language as a real listing sign.
  if (type === 'real_estate') {
    const postMat = new THREE.MeshStandardMaterial({ color: '#3f3f46', roughness: 0.7 });
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.05), postMat);
    post.position.set(width * 0.32, 0.28, depth / 2 + 0.6);
    group.add(post);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.28, 0.03),
      new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.6 })
    );
    board.position.set(width * 0.32, 0.5, depth / 2 + 0.6);
    group.add(board);
  }

  // Electronics store / Marine Research: a roof-mounted dish — a signal
  // dish reads as "tech"/"comms", distinguishing both from an otherwise
  // plain flat-roofed shop or lab box.
  if (['electronics', 'marine_research'].includes(type)) {
    const dishMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.4, metalness: 0.5, side: THREE.DoubleSide });
    const dish = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), dishMat);
    dish.rotation.x = Math.PI * 0.85;
    dish.position.set(width * 0.28, wallHeight + 0.22, -depth * 0.2);
    dish.castShadow = true;
    group.add(dish);
  }

  // Oil Rig: a real derrick lattice tower instead of just the shared
  // factory-style smokestack, so it reads as "rig" and not "small
  // factory" from a distance.
  if (type === 'oil_rig') {
    const derrickMat = new THREE.MeshStandardMaterial({ color: '#78716c', roughness: 0.6, metalness: 0.3 });
    const derrickH = wallHeight * 2.4;
    const legOffsets = [
      [-0.5, -0.5],
      [0.5, -0.5],
      [-0.5, 0.5],
      [0.5, 0.5],
    ];
    legOffsets.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, derrickH, 6), derrickMat);
      leg.position.set(lx * width * 0.22, wallHeight + derrickH / 2, lz * depth * 0.22 - depth * 0.15);
      leg.rotation.x = (lz < 0 ? -1 : 1) * 0.06;
      leg.rotation.z = (lx < 0 ? 1 : -1) * 0.06;
      leg.castShadow = true;
      group.add(leg);
    });
    for (let i = 1; i <= 3; i++) {
      const brace = new THREE.Mesh(new THREE.TorusGeometry(width * 0.16, 0.025, 4, 4), derrickMat);
      brace.rotation.x = Math.PI / 2;
      brace.rotation.y = Math.PI / 4;
      brace.position.set(0, wallHeight + (derrickH * i) / 4, -depth * 0.15);
      group.add(brace);
    }
  }

  // Lottery: a small neon-trimmed ticket-booth marquee — casino's neon
  // language at a much smaller, single-storey scale.
  if (type === 'lottery') {
    const neonMat = new THREE.MeshStandardMaterial({ color: '#facc15', emissive: '#facc15', emissiveIntensity: 0.8, roughness: 0.3 });
    const trim = new THREE.Mesh(new THREE.BoxGeometry(width * 0.92, 0.06, 0.06), neonMat);
    trim.position.set(0, wallHeight + 0.1, depth / 2 + 0.02);
    group.add(trim);
  }

  return { glassOverride: false };
}

// ---------------------------------------------------------------------
// House massing details — porch, chimney, balconies, a turret for the
// grandest estates, and a decorative arched door surround. Every one of
// these is purely additive geometry (no new physics colliders), so
// nothing about where the player can already walk changes.
// ---------------------------------------------------------------------

function addPorch(group, width, depth, wallHeight, accentColor) {
  const porchDepth = 0.85;
  const porchWidth = Math.min(width * 0.6, 3.4);
  const postH = Math.min(wallHeight * 0.75, 1.7);
  const postMat = new THREE.MeshStandardMaterial({ color: '#f1f0e8', roughness: 0.6 });
  [-1, 1].forEach((side) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, postH, 8), postMat);
    post.position.set((side * porchWidth) / 2.3, postH / 2, depth / 2 + porchDepth * 0.85);
    post.castShadow = true;
    group.add(post);
  });
  const roofSlab = new THREE.Mesh(
    new THREE.BoxGeometry(porchWidth, 0.07, porchDepth),
    new THREE.MeshStandardMaterial({ color: shadeColor(accentColor, -0.15), roughness: 0.75 })
  );
  roofSlab.position.set(0, postH + 0.035, depth / 2 + porchDepth * 0.5);
  roofSlab.castShadow = true;
  group.add(roofSlab);
  const floorSlab = new THREE.Mesh(
    new THREE.BoxGeometry(porchWidth, 0.07, porchDepth),
    new THREE.MeshStandardMaterial({ color: '#c9c3b3', roughness: 0.9 })
  );
  floorSlab.position.set(0, 0.035, depth / 2 + porchDepth * 0.5);
  floorSlab.receiveShadow = true;
  group.add(floorSlab);
}

function addChimney(group, width, depth, wallHeight) {
  const chimMat = new THREE.MeshStandardMaterial({ color: '#6b6258', roughness: 0.88 });
  const chimH = wallHeight * 0.5 + 0.55;
  const chim = new THREE.Mesh(new THREE.BoxGeometry(0.32, chimH, 0.32), chimMat);
  chim.position.set(width * 0.3, wallHeight - 0.1 + chimH / 2, -depth * 0.18);
  chim.castShadow = true;
  group.add(chim);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.4), chimMat);
  cap.position.set(chim.position.x, chim.position.y + chimH / 2 + 0.04, chim.position.z);
  group.add(cap);
}

function addBalconies(group, width, depth, wallHeight, floors, floorHeight, accentColor) {
  if (floors < 2) return;
  const railMat = new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.5, metalness: 0.2 });
  const slabMat = new THREE.MeshStandardMaterial({ color: shadeColor(accentColor, -0.25), roughness: 0.7 });
  for (let f = 1; f < floors; f++) {
    const y = f * floorHeight + 0.05;
    const balc = new THREE.Mesh(new THREE.BoxGeometry(width * 0.34, 0.07, 0.45), slabMat);
    balc.position.set(0, y, depth / 2 + 0.25);
    balc.castShadow = true;
    group.add(balc);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(width * 0.34, 0.24, 0.03), railMat);
    rail.position.set(0, y + 0.155, depth / 2 + 0.47);
    group.add(rail);
  }
}

function addTurret(group, width, depth, wallHeight, accentColor) {
  const turretMat = new THREE.MeshStandardMaterial({ color: '#e8e2d0', roughness: 0.6 });
  const turretR = Math.min(width, depth) * 0.15;
  const turretH = wallHeight * 1.15;
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(turretR, turretR, turretH, 12), turretMat);
  turret.position.set(-width * 0.38, turretH / 2, depth * 0.36);
  turret.castShadow = true;
  group.add(turret);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(turretR * 1.12, turretH * 0.42, 12), new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.5 }));
  cone.position.set(-width * 0.38, turretH + (turretH * 0.42) / 2, depth * 0.36);
  cone.castShadow = true;
  group.add(cone);
}

function addArchDoor(group, doorW, doorH, depth) {
  const archMat = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.6 });
  const arch = new THREE.Mesh(new THREE.TorusGeometry(doorW * 0.62, 0.045, 6, 12, Math.PI), archMat);
  arch.rotation.z = Math.PI;
  arch.position.set(0, doorH + 0.03, depth / 2 + 0.03);
  group.add(arch);
}

/**
 * Simple, low-poly furniture placed in a house's interior so a room
 * reads as "lived in" rather than an empty shell — a bed against the
 * back wall, a table+chairs near the middle, deterministically varied
 * per house (same seeding approach as classifyHouse/face genetics) so
 * neighboring houses' interiors don't look identical.
 */
function addHouseFurniture(group, { width, depth, seed }) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  const rnd = () => {
    s = (s * 1103515245 + 12345) >>> 0;
    return (s >>> 8) / 16777216;
  };

  const woodMat = new THREE.MeshStandardMaterial({ color: '#8a5a34', roughness: 0.7 });
  const fabricMat = new THREE.MeshStandardMaterial({ color: ['#7c3aed', '#0ea5e9', '#ef4444', '#22c55e', '#f59e0b'][Math.floor(rnd() * 5)], roughness: 0.85 });

  // Bed, back-left corner.
  const bedW = Math.min(1.4, width * 0.24);
  const bedL = Math.min(2.0, depth * 0.28);
  const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(bedW, 0.32, bedL), woodMat);
  bedFrame.position.set(-width / 2 + bedW / 2 + 0.35, 0.16, -depth / 2 + bedL / 2 + 0.35);
  bedFrame.castShadow = true;
  group.add(bedFrame);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(bedW * 0.94, 0.14, bedL * 0.96), fabricMat);
  mattress.position.set(bedFrame.position.x, 0.39, bedFrame.position.z);
  group.add(mattress);
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(bedW * 0.8, 0.1, bedL * 0.18), new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.8 }));
  pillow.position.set(bedFrame.position.x, 0.47, bedFrame.position.z - bedL * 0.36);
  group.add(pillow);

  // Table + chairs, roughly centered.
  const tableSize = Math.min(1.1, width * 0.16);
  const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(tableSize / 2, tableSize / 2, 0.05, 12), woodMat);
  tableTop.position.set(width * 0.14, 0.42, depth * 0.1);
  tableTop.castShadow = true;
  group.add(tableTop);
  const tableLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), woodMat);
  tableLeg.position.set(tableTop.position.x, 0.2, tableTop.position.z);
  group.add(tableLeg);
  [0, 1].forEach((i) => {
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 0.35), woodMat);
    const angle = i * Math.PI;
    chairSeat.position.set(tableTop.position.x + Math.sin(angle) * tableSize * 0.9, 0.28, tableTop.position.z + Math.cos(angle) * tableSize * 0.9);
    group.add(chairSeat);
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.34, 0.05), woodMat);
    chairBack.position.set(chairSeat.position.x + Math.sin(angle) * 0.16, 0.44, chairSeat.position.z + Math.cos(angle) * 0.16);
    group.add(chairBack);
  });

  // A rug under the table for a bit of interior color/warmth.
  const rug = new THREE.Mesh(new THREE.CylinderGeometry(tableSize * 1.15, tableSize * 1.15, 0.02, 16), fabricMat);
  rug.position.set(tableTop.position.x, 0.04, tableTop.position.z);
  group.add(rug);
}

/**
 * A real climbable staircase (visible steps riding on the smooth incline
 * computeHouseStairs() also describes for physics) plus a simple railing,
 * for every floor transition a multi-storey house has.
 */
function addStaircase(group, flight) {
  const { stepCount, run, width: stairWidth, fromY, toY, localX, localZFront } = flight;
  const stepMat = new THREE.MeshStandardMaterial({ color: '#7a6a56', roughness: 0.75 });
  const railMat = new THREE.MeshStandardMaterial({ color: '#3f3f46', roughness: 0.5, metalness: 0.3 });
  const treadDepth = run / stepCount;
  const riser = (toY - fromY) / stepCount;

  for (let i = 0; i < stepCount; i++) {
    const stepY = fromY + riser * (i + 1);
    const stepZ = localZFront - treadDepth * i - treadDepth / 2;
    const step = new THREE.Mesh(new THREE.BoxGeometry(stairWidth, Math.max(0.05, riser), treadDepth * 1.02), stepMat);
    step.position.set(localX, stepY - riser / 2, stepZ);
    // No shadow casting on individual steps — each one is small and
    // tightly packed against the next, so the shadow contribution is
    // barely visible anyway, but a house with a full flight (~13 steps)
    // multiplied across a map with 100+ multi-floor houses turns into
    // well over a thousand shadow-casting objects for something nobody
    // would notice missing. Still receives shadows/lighting normally.
    step.receiveShadow = true;
    group.add(step);
  }

  // A simple railing along the open (inner) edge of the flight.
  const railPost1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.85, 0.04), railMat);
  railPost1.position.set(localX + stairWidth / 2 + 0.03, fromY + 0.42, localZFront);
  group.add(railPost1);
  const railPost2 = railPost1.clone();
  railPost2.position.set(localX + stairWidth / 2 + 0.03, toY + 0.42, localZFront - run);
  group.add(railPost2);
  const railTop = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, Math.hypot(run, toY - fromY) + 0.2), railMat);
  railTop.position.set(localX + stairWidth / 2 + 0.03, (fromY + toY) / 2 + 0.42, localZFront - run / 2);
  railTop.rotation.x = Math.atan2(toY - fromY, run);
  group.add(railTop);
}

/**
 * Replaces the single solid exterior box every other structure uses with
 * a real walk-in shell: wall segments with a doorway gap (matching
 * computeHouseWalls exactly, so the collider and the visible wall are
 * the same rectangle), an interior floor, simple furniture, and — for
 * multi-floor houses — floor platforms with real connecting staircases
 * (see computeHouseStairs/addStaircase above).
 */
function buildHouseShell(group, opts) {
  const { b, scale, width, depth, wallHeight, floors, floorHeight, frontBackTex, sideTex, wallMat, plainMat } = opts;
  const halfW = width / 2;
  const halfD = depth / 2;
  const t = HOUSE_WALL_THICKNESS;
  const doorHalfW = houseDoorHalfWidth(width);
  const frontHalfSeg = (halfW - doorHalfW) / 2;

  const interiorWallMat = new THREE.MeshStandardMaterial({ color: '#efe9dd', roughness: 0.88 });
  const floorMat = new THREE.MeshStandardMaterial({ color: '#a9814f', roughness: 0.75 });
  const ceilingMat = new THREE.MeshStandardMaterial({ color: '#f5f2ea', roughness: 0.92 });

  const addWallSegment = (cx, cz, sizeX, sizeZ, outwardAxis, tex) => {
    const geo = new THREE.BoxGeometry(sizeX, wallHeight, sizeZ);
    const outMat = wallMat(tex);
    // BoxGeometry material order: [+X, -X, +Y(top), -Y(bottom), +Z, -Z]
    const mats = [interiorWallMat, interiorWallMat, plainMat, plainMat, interiorWallMat, interiorWallMat];
    if (outwardAxis === 'x+') mats[0] = outMat;
    else if (outwardAxis === 'x-') mats[1] = outMat;
    else if (outwardAxis === 'z+') mats[4] = outMat;
    else if (outwardAxis === 'z-') mats[5] = outMat;
    const mesh = new THREE.Mesh(geo, mats);
    mesh.position.set(cx, wallHeight / 2, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };

  addWallSegment(0, -halfD + t / 2, width, t, 'z-', frontBackTex.clone());
  addWallSegment(-halfW + t / 2, 0, t, depth, 'x-', sideTex.clone());
  addWallSegment(halfW - t / 2, 0, t, depth, 'x+', sideTex.clone());
  if (frontHalfSeg > 0.12) {
    addWallSegment(-(doorHalfW + frontHalfSeg), halfD - t / 2, frontHalfSeg * 2, t, 'z+', frontBackTex.clone());
    addWallSegment(doorHalfW + frontHalfSeg, halfD - t / 2, frontHalfSeg * 2, t, 'z+', frontBackTex.clone());
  }

  const groundFloor = new THREE.Mesh(new THREE.BoxGeometry(width - t * 2, 0.06, depth - t * 2), floorMat);
  groundFloor.position.set(0, 0.03, 0);
  groundFloor.receiveShadow = true;
  group.add(groundFloor);

  const topCeiling = new THREE.Mesh(new THREE.BoxGeometry(width - t, 0.05, depth - t), ceilingMat);
  topCeiling.position.set(0, wallHeight - 0.025, 0);
  group.add(topCeiling);

  addHouseFurniture(group, { width, depth, seed: b.id || b.houseType || b.name || 'house' });

  if (floors >= 2) {
    const stairs = computeHouseStairs(b, scale);
    stairs.forEach((flight) => {
      // flight.localX / flight.localZFront are already this group's
      // LOCAL coordinates (computeHouseStairs keeps both the world-space
      // x/z PhysicsController needs AND the local offsets BuildingBuilder
      // needs, computed from the same halfW/halfD/wallThickness numbers
      // either way — so the visual steps and the physics incline can
      // never disagree about where the staircase actually is).
      addStaircase(group, flight);

      const platformY = flight.toY;
      // Leave a stairwell gap in the platform matching the flight's
      // width so the stairs actually lead somewhere instead of walking
      // into the underside of a solid ceiling.
      const gapHalfW = flight.width / 2 + 0.15;
      const gapX = flight.localX;
      const fullMinX = -halfW + t;
      const fullMaxX = halfW - t;
      // One piece covering the area to the right of the stairwell gap
      // (spans the full depth), and — if there's room — one covering the
      // sliver to the left of it, so the platform is solid everywhere
      // except directly above the stairs.
      const rightPieceMinX = gapX + gapHalfW;
      if (rightPieceMinX < fullMaxX) {
        const w = fullMaxX - rightPieceMinX;
        const piece = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, depth - t * 2), floorMat);
        piece.position.set(rightPieceMinX + w / 2, platformY, 0);
        piece.receiveShadow = true;
        piece.castShadow = true;
        group.add(piece);
      }
      const leftPieceMaxX = gapX - gapHalfW;
      if (leftPieceMaxX > fullMinX) {
        const w = leftPieceMaxX - fullMinX;
        const piece = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, depth - t * 2), floorMat);
        piece.position.set(fullMinX + w / 2, platformY, 0);
        piece.receiveShadow = true;
        piece.castShadow = true;
        group.add(piece);
      }
      // Simple furniture on the upper floor too, offset so it doesn't
      // overlap the ground floor's set (different pseudo-seed).
      addHouseFurniture(group, { width, depth, seed: `${b.id || b.houseType || 'house'}_f${flight.floorIndex}` });
    });
  }
}

/**
 * A decorative yard fence around a house's plot, with a swinging gate
 * centered on the front (door-facing) side. Deliberately NOT registered
 * as a physics collider — it's built purely so the player can visually
 * open it, never so it can block a path that was walkable before this
 * feature existed.
 *
 * @returns {THREE.Group|null} the gate's hinge pivot (rotate it to swing
 *   the gate open/closed), or null for the 'none' tier.
 */
function addFenceAndGate(group, width, depth, tier) {
  if (!tier || tier === 'none') return null;
  const specs = {
    low: { postH: 0.42, railY: 0.28, railT: 0.045, color: '#d8d2c0', setback: 0.55, gateColor: '#c9c2ae', metal: 0.05 },
    mid: { postH: 0.62, railY: 0.42, railT: 0.055, color: '#736c5f', setback: 0.7, gateColor: '#3f3f46', metal: 0.2 },
    high: { postH: 1.0, railY: 0.56, railT: 0.05, color: '#23232b', setback: 0.95, gateColor: '#2b2b33', metal: 0.4 },
  };
  const spec = specs[tier] || specs.low;
  const fenceMat = new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.65, metalness: spec.metal });

  const halfW = width / 2 + spec.setback;
  const halfD = depth / 2 + spec.setback;
  const gateW = Math.min(1.8, Math.max(1.3, width * 0.22));

  const addPost = (x, z, h = spec.postH) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, h, 6), fenceMat);
    post.position.set(x, h / 2, z);
    post.castShadow = true;
    group.add(post);
  };
  const addRail = (cx, cz, len, alongX) => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(alongX ? len : spec.railT, spec.railT, alongX ? spec.railT : len),
      fenceMat
    );
    rail.position.set(cx, spec.railY, cz);
    rail.castShadow = true;
    group.add(rail);
  };

  addPost(-halfW, -halfD);
  addPost(halfW, -halfD);
  addPost(-halfW, halfD);
  addPost(halfW, halfD);

  addRail(0, -halfD, width + spec.setback * 2, true);
  addRail(-halfW, 0, depth + spec.setback * 2, false);
  addRail(halfW, 0, depth + spec.setback * 2, false);

  // Front side: two rail segments flanking a gate-width gap centered on
  // the door, with a taller post on each side of the gap.
  const frontHalf = halfW - gateW / 2;
  if (frontHalf > 0.15) {
    addRail(-(gateW / 2 + frontHalf / 2), halfD, frontHalf, true);
    addRail(gateW / 2 + frontHalf / 2, halfD, frontHalf, true);
  }
  addPost(-gateW / 2, halfD, spec.postH * 1.1);
  addPost(gateW / 2, halfD, spec.postH * 1.1);

  // The gate leaf, hinged at the left gate post — GameEngine rotates
  // this hinge as the player approaches/leaves, the same mechanism used
  // for front doors below.
  const gateHinge = new THREE.Group();
  gateHinge.position.set(-gateW / 2, spec.postH * 0.5, halfD);
  gateHinge.userData.isGate = true;
  group.add(gateHinge);

  const gateLeaf = new THREE.Mesh(
    new THREE.BoxGeometry(gateW, spec.postH * 0.85, 0.04),
    new THREE.MeshStandardMaterial({ color: spec.gateColor, roughness: 0.55, metalness: spec.metal })
  );
  gateLeaf.position.set(gateW / 2, 0, 0);
  gateLeaf.castShadow = true;
  gateHinge.add(gateLeaf);

  if (tier !== 'low') {
    for (let i = 0; i < 4; i++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.022, spec.postH * 0.72, 0.03), fenceMat);
      slat.position.set((i + 0.5) * (gateW / 4), 0, 0.006);
      gateHinge.add(slat);
    }
  }

  return gateHinge;
}

function addRoof(group, style, width, depth, wallHeight, accentColor) {
  switch (style.roof) {
    case 'dome': {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(Math.min(width, depth) * 0.32, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.35, metalness: 0.3 })
      );
      dome.position.y = wallHeight;
      dome.castShadow = true;
      group.add(dome);
      break;
    }
    case 'pediment': {
      const pedGeo = new THREE.CylinderGeometry(0, Math.min(width, depth) * 0.42, depth * 0.22, 3);
      const ped = new THREE.Mesh(pedGeo, new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.7 }));
      ped.rotation.y = Math.PI / 4;
      ped.position.y = wallHeight + (depth * 0.22) / 2;
      ped.castShadow = true;
      group.add(ped);
      break;
    }
    case 'gable': {
      const gableGeo = new THREE.CylinderGeometry(0, Math.max(width, depth) * 0.48, width * 0.5, 4, 1, true);
      const gable = new THREE.Mesh(gableGeo, new THREE.MeshStandardMaterial({ color: '#7c4a3d', roughness: 0.8 }));
      gable.rotation.y = Math.PI / 4;
      gable.position.y = wallHeight + (width * 0.5) / 2;
      gable.scale.set(width / (Math.max(width, depth) * 0.68), 0.6, depth / (Math.max(width, depth) * 0.68));
      gable.castShadow = true;
      group.add(gable);
      break;
    }
    case 'hip': {
      // A 4-slope pyramid-ish hip roof — same square-pyramid geometry as
      // 'gable' but shallower and NOT rotated 45°, so its ridge runs
      // along the building's long axis instead of pointing corner-to-
      // corner. This is what actually reads as "hip roof" (ranch houses,
      // villas) rather than a second copy of the gable silhouette.
      const hipGeo = new THREE.CylinderGeometry(0, Math.max(width, depth) * 0.5, Math.min(width, depth) * 0.34, 4, 1, true);
      const hip = new THREE.Mesh(hipGeo, new THREE.MeshStandardMaterial({ color: accentColor === '#7c3aed' ? '#a8583f' : accentColor, roughness: 0.75 }));
      hip.rotation.y = Math.PI / 4;
      hip.position.y = wallHeight + (Math.min(width, depth) * 0.34) / 2;
      hip.scale.set(width / (Math.max(width, depth) * 0.7), 1, depth / (Math.max(width, depth) * 0.7));
      hip.castShadow = true;
      group.add(hip);
      break;
    }
    case 'shed': {
      // A single-slope lean-to roof — the cheapest, smallest houses
      // (shacks, trailers) get this instead of a proper gable/hip, which
      // reads immediately as "modest" without needing a text label.
      const shedGeo = new THREE.BoxGeometry(width * 1.05, 0.14, depth * 1.05);
      const shed = new THREE.Mesh(shedGeo, new THREE.MeshStandardMaterial({ color: '#5b5347', roughness: 0.9 }));
      shed.position.set(0, wallHeight + 0.18, -depth * 0.08);
      shed.rotation.x = -0.12;
      shed.castShadow = true;
      group.add(shed);
      break;
    }
    case 'sawtooth': {
      const teeth = 3;
      for (let i = 0; i < teeth; i++) {
        const tw = width / teeth;
        const tooth = new THREE.Mesh(
          new THREE.BoxGeometry(tw * 0.98, 0.35, depth),
          new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.6 })
        );
        tooth.position.set(-width / 2 + tw * (i + 0.5), wallHeight + 0.18, 0);
        tooth.rotation.z = 0.15;
        tooth.castShadow = true;
        group.add(tooth);
      }
      break;
    }
    case 'none':
      break;
    default: {
      const rim = new THREE.Mesh(
        new THREE.BoxGeometry(width * 1.02, 0.22, depth * 1.02),
        new THREE.MeshStandardMaterial({ color: '#1c2233', roughness: 0.7 })
      );
      rim.position.y = wallHeight + 0.11;
      rim.castShadow = true;
      group.add(rim);
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.94, 0.06, depth * 0.94),
        new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.4, metalness: 0.2 })
      );
      cap.position.y = wallHeight + 0.25;
      group.add(cap);
    }
  }
}

/**
 * @param {Object} b building/house record from worldData (unchanged shape)
 * @param {Object} opts { scale, zoneKey, kind: 'building'|'house' }
 */
export function buildStructure(b, opts) {
  const { scale, zoneKey, kind = 'building' } = opts;
  const style = kind === 'house' ? { ...DEFAULT_STYLE, ...classifyHouse(b), accent: b.color || '#7c3aed' } : TYPE_STYLE[b.type] || DEFAULT_STYLE;

  // Houses get a bigger footprint multiplier than other buildings (see
  // HOUSE_SIZE_MULTIPLIER's comment) specifically so a character can
  // walk inside one — computeHouseWalls() below uses this exact same
  // multiplier, so the visual walls and the physics collider walls are
  // guaranteed to describe the same rectangle.
  const width = kind === 'house' ? Math.max(3, b.width * scale * HOUSE_SIZE_MULTIPLIER) : Math.max(3, (b.width * scale) * 0.92);
  const depth = kind === 'house' ? Math.max(3, b.height * scale * HOUSE_SIZE_MULTIPLIER) : Math.max(3, (b.height * scale) * 0.92);

  const floors = style.floors;
  const baseColor = kind === 'house' ? b.color || '#4a5170' : zoneWallColor(zoneKey);

  // Houses need real room-height floors now that they're walkable
  // interiors, not just a decorative box — HOUSE_FLOOR_CLEARANCE (2.35)
  // interior height + the wall/ceiling thickness below.
  // Buildings' per-floor height (1.05) used to be shorter than the
  // character itself (1.75, see PLAYER_HEIGHT) — harmless while doors
  // were purely decorative, but it's the real reason a properly
  // human-sized door (see doorW/doorH below) couldn't fit: there wasn't
  // a floor's worth of wall tall enough to put one in. 2.2 is a normal
  // single-storey height with room for a real doorway plus header space
  // above it, without being as tall as houses' own 2.57 (kept slightly
  // shorter so the two aren't visually identical).
  const floorHeight = kind === 'house' ? HOUSE_FLOOR_CLEARANCE + HOUSE_WALL_THICKNESS : 2.2;
  const wallHeight = floors * floorHeight;

  const group = new THREE.Group();
  group.name = b.id;
  group.userData = { id: b.id, name: b.name, type: b.type || b.houseType, kind };

  const wallColor = new THREE.Color(baseColor);
  if (style.wallTint) wallColor.lerp(new THREE.Color('#ffffff'), Math.max(0, style.wallTint));

  // Windows on the front/back AND both sides now (previously only the
  // front face had them and the rest were flat, so buildings looked like
  // a stage-prop facade from any other angle). Each face gets its own
  // texture instance so the window grid isn't stretched on the narrower
  // side walls.
  const winRows = Math.max(1, floors * 2);
  const frontBackTex = makeWindowTexture('#20263c', Math.max(2, Math.round(width / (kind === 'house' ? 1.4 : 1.9))), winRows);
  const sideTex = makeWindowTexture('#1c2136', Math.max(2, Math.round(depth / (kind === 'house' ? 1.4 : 1.9))), winRows);

  const wallMat = (tex) => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.65, metalness: 0.08, map: tex });
  const plainMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.85, metalness: 0.03 });

  // Tech/lab towers get a reflective blue glass curtain wall instead of
  // the standard lit-window texture — reads as unmistakably "glass tower"
  // from a distance, distinct from every other building category.
  const isGlassTower = kind === 'building' && ['tech_campus', 'quantum_labs'].includes(b.type);
  const glassMat = () =>
    new THREE.MeshStandardMaterial({ color: '#0e7490', roughness: 0.15, metalness: 0.75, emissive: '#0891b2', emissiveIntensity: 0.08 });

  // BoxGeometry material order: [+X, -X, +Y(top), -Y(bottom), +Z(front), -Z(back)]
  const materials = isGlassTower
    ? [glassMat(), glassMat(), plainMat, plainMat, glassMat(), glassMat()]
    : [wallMat(sideTex.clone()), wallMat(sideTex.clone()), plainMat, plainMat, wallMat(frontBackTex), wallMat(frontBackTex.clone())];

  const geo = new THREE.BoxGeometry(width, wallHeight, depth);
  if (kind === 'house') {
    // Real walk-in shell: separate wall segments with a doorway gap and
    // an actual interior (floor, furnished rooms, stairs to any upper
    // floors) — see buildHouseShell(). Deliberately NOT the single solid
    // box every other structure uses, since that box had no way in.
    buildHouseShell(group, {
      b,
      scale,
      width,
      depth,
      wallHeight,
      floors,
      floorHeight,
      baseColor,
      style,
      frontBackTex,
      sideTex,
      wallMat,
      plainMat,
    });
  } else {
    const walls = new THREE.Mesh(geo, materials);
    walls.position.y = wallHeight / 2;
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);
  }

  // A slightly wider, darker base plinth so the building looks grounded
  // instead of a box just resting on top of the pavement.
  const plinthH = Math.min(0.35, wallHeight * 0.12);
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(width * 1.03, plinthH, depth * 1.03),
    new THREE.MeshStandardMaterial({ color: shadeColor(baseColor, -0.35), roughness: 0.9 })
  );
  plinth.position.y = plinthH / 2;
  plinth.receiveShadow = true;
  group.add(plinth);

  addRoof(group, style, width, depth, wallHeight, style.accent);
  if (style.roof === 'flat' && floors >= 3) addRoofClutter(group, width, depth, wallHeight);

  // A thin protruding string-course band at every floor boundary — the
  // single biggest reason multi-storey buildings previously read as one
  // undifferentiated slab. Skipped on 1-floor buildings/houses (nothing
  // to separate).
  if (floors >= 2) {
    const bandMat = new THREE.MeshStandardMaterial({ color: shadeColor(baseColor, -0.22), roughness: 0.75 });
    for (let f = 1; f < floors; f++) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(width * 1.015, 0.07, depth * 1.015), bandMat);
      band.position.y = f * floorHeight;
      band.castShadow = true;
      group.add(band);
    }
  }

  // Civic buildings get a columned portico; very tall towers get a
  // tiered skyscraper crown — both make the type instantly readable at a
  // glance instead of every building being an interchangeable box.
  const COLUMN_TYPES = ['bank', 'city_hall', 'courthouse', 'government_complex', 'university', 'embassy'];
  if (kind === 'building' && COLUMN_TYPES.includes(b.type)) {
    addColumns(group, width, depth, wallHeight, width > 24 ? 6 : 4);
  }
  const TOWER_TYPES = ['tech_campus', 'quantum_labs', 'stock_exchange'];
  if (kind === 'building' && TOWER_TYPES.includes(b.type) && style.roof === 'flat') {
    addSkyscraperSetback(group, width, depth, wallHeight, style.accent);
  }
  if (kind === 'building') addCategoryDetails(group, b.type, width, depth, wallHeight);

  // House-only massing details — porch, chimney, balconies, columns, a
  // turret for the grandest estates — driven by the archetype resolved
  // in classifyHouse() above. All purely additive geometry.
  if (kind === 'house') {
    if (style.porch) addPorch(group, width, depth, wallHeight, style.accent);
    if (style.chimney) addChimney(group, width, depth, wallHeight);
    if (style.balconies) addBalconies(group, width, depth, wallHeight, floors, floorHeight, style.accent);
    if (style.columns) addColumns(group, width, depth, wallHeight, width > 16 ? 4 : 2);
    if (style.turret) addTurret(group, width, depth, wallHeight, style.accent);
  }

  // Door + frame + a small threshold step, instead of a flat rectangle
  // stuck to the wall. The door itself is hinged at its left edge (not
  // centered) so it can be swung open — GameEngine rotates `doorHinge`
  // as the player approaches/leaves, the same interaction the yard gate
  // below uses.
  // A real human doorway needs to comfortably clear the character's own
  // height (1.75 units, see PLAYER_HEIGHT in PhysicsController.js) with
  // headroom — the previous doorH (1.15) was actually SHORTER than the
  // character itself, so even though the collision gap was technically
  // walkable, the door visually looked far too small to fit through
  // (which is exactly what "too small to enter" looks like). Width gets
  // the same generous treatment, with a floor so even a narrow shop
  // front gets a comfortably human-sized doorway, not a slit.
  const doorW = Math.max(1.3, Math.min(width * 0.24, 1.7));
  const doorH = 1.85;
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(doorW + 0.14, doorH + 0.12, 0.1),
    new THREE.MeshStandardMaterial({ color: '#efe6d8', roughness: 0.6 })
  );
  frame.position.set(0, doorH / 2 + 0.03, depth / 2 + 0.03);
  group.add(frame);

  const doorHinge = new THREE.Group();
  doorHinge.position.set(-doorW / 2, doorH / 2 + 0.06, depth / 2 + 0.06);
  doorHinge.userData.isDoor = true;
  group.add(doorHinge);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(doorW, doorH, 0.08),
    new THREE.MeshStandardMaterial({ color: '#241a12', roughness: 0.5 })
  );
  door.position.set(doorW / 2, 0, 0);
  doorHinge.add(door);

  const step = new THREE.Mesh(
    new THREE.BoxGeometry(doorW + 0.5, 0.1, 0.35),
    new THREE.MeshStandardMaterial({ color: '#9ca3af', roughness: 0.9 })
  );
  step.position.set(0, 0.05, depth / 2 + 0.2);
  group.add(step);

  if (kind === 'house' && style.archDoor) addArchDoor(group, doorW, doorH, depth);

  // Yard fence + gate for houses — decorative only (see addFenceAndGate),
  // returned below so GameEngine can swing it open on approach.
  const gateHinge = kind === 'house' ? addFenceAndGate(group, width, depth, style.fenceTier) : null;

  // Accent awning above door for shops/food/leisure types
  if (['restaurant', 'market', 'boutique', 'electronics', 'jeweler', 'trading_post', 'hardware_store', 'fish_market'].includes(b.type)) {
    const awning = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, doorW * 2.2, 8, 1, false, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: style.accent, roughness: 0.7 })
    );
    awning.rotation.z = Math.PI / 2;
    awning.rotation.y = Math.PI / 2;
    awning.position.set(0, 1.55, depth / 2 + 0.35);
    awning.scale.set(1, 0.45, 1);
    awning.castShadow = true;
    group.add(awning);
  }

  // Name sign (billboard sprite, always faces camera) — only for real
  // buildings and larger houses, matching the old "only wide houses get a
  // label" rule so small houses don't get visually noisy.
  if (kind === 'building' || b.width >= 150) {
    const signTex = makeSignTexture(b.name, style.accent);
    const signMat = new THREE.SpriteMaterial({ map: signTex, transparent: true, depthWrite: false });
    const sign = new THREE.Sprite(signMat);
    const signScale = Math.min(width * 0.9, 6);
    sign.scale.set(signScale, signScale * 0.25, 1);
    sign.position.set(0, wallHeight + (style.roof === 'none' ? 0.6 : 1.0), depth / 2 + 0.5);
    // A floating text label isn't solid geometry — it shouldn't count as
    // something the third-person camera needs to avoid clipping through.
    sign.raycast = () => {};
    group.add(sign);
  }

  group.position.set(b.x * scale, 0, b.y * scale);

  return {
    group,
    footprint: { x: b.x * scale, z: b.y * scale, halfW: width / 2, halfD: depth / 2, height: wallHeight },
    // Both hinges rotate around local Y; GameEngine swings them open
    // (negative rotation, door/gate leaf sweeps outward-left) as the
    // player nears the entrance, and eases them back closed when they
    // leave. `gateHinge` is null for house tiers with no fence.
    doorHinge,
    gateHinge,
  };
}
