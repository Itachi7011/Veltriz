import * as THREE from 'three';

/**
 * Turns the existing flat "colored rectangle + name" building/house data
 * (unchanged — nothing removed from worldData.js) into real extruded 3D
 * structures: walls, a roof (flat or pitched depending on footprint), a
 * window grid, a door, and a floating name sign — instead of a single
 * painted square.
 */

const canvasCache = new Map();

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
  stock_exchange: { floors: 9, wallTint: 0.08, roof: 'flat', accent: '#eab308' },
  city_hall: { floors: 4, wallTint: -0.02, roof: 'dome', accent: '#f8fafc' },
  government_complex: { floors: 5, wallTint: -0.02, roof: 'flat', accent: '#f8fafc' },
  courthouse: { floors: 4, wallTint: -0.02, roof: 'pediment', accent: '#f8fafc' },
  hospital: { floors: 5, wallTint: 0.06, roof: 'flat', accent: '#22c55e' },
  police_station: { floors: 3, wallTint: -0.05, roof: 'flat', accent: '#3b82f6' },
  school: { floors: 3, wallTint: 0.02, roof: 'flat', accent: '#f97316' },
  university: { floors: 5, wallTint: 0.02, roof: 'dome', accent: '#f97316' },
  casino: { floors: 4, wallTint: 0.1, roof: 'flat', accent: '#ec4899' },
  cinema: { floors: 2, wallTint: 0.1, roof: 'flat', accent: '#a855f7' },
  factory: { floors: 2, wallTint: -0.1, roof: 'sawtooth', accent: '#f59e0b' },
  tech_campus: { floors: 10, wallTint: 0.12, roof: 'flat', accent: '#22d3ee' },
  quantum_labs: { floors: 8, wallTint: 0.14, roof: 'flat', accent: '#22d3ee' },
  logistics_hub: { floors: 2, wallTint: -0.08, roof: 'flat', accent: '#94a3b8' },
  market: { floors: 2, wallTint: 0.02, roof: 'flat', accent: '#f59e0b' },
  restaurant: { floors: 2, wallTint: 0.04, roof: 'flat', accent: '#ef4444' },
  gym: { floors: 2, wallTint: 0.03, roof: 'flat', accent: '#ef4444' },
  park: { floors: 1, wallTint: 0, roof: 'none', accent: '#22c55e' },
  farm: { floors: 1, wallTint: -0.1, roof: 'gable', accent: '#84cc16' },
  marina: { floors: 1, wallTint: 0, roof: 'flat', accent: '#0ea5e9' },
  port_authority: { floors: 5, wallTint: -0.05, roof: 'flat', accent: '#0ea5e9' },
};
const DEFAULT_STYLE = { floors: 3, wallTint: 0, roof: 'flat', accent: '#7c3aed' };

// Houses use a `houseType` key (not `type`), and there are 100+ distinct
// keys across the catalogs — too many to hand-list, and previously this
// meant EVERY house silently fell through to DEFAULT_STYLE (flat roof,
// purple accent) regardless of whether it was a "tiny_shack" or a
// "grand_atrium_home". Classify by price/name pattern instead: anything
// condo/tower/flat/loft/penthouse-shaped gets a flat-roofed multi-storey
// look, everything else gets a real pitched roof like an actual house.
function classifyHouse(h) {
  const key = h.houseType || '';
  const isTowerLike = /tower|condo|flat|loft|penthouse|apartment|suite|estate|complex|residence|studio|unit/i.test(key);
  const price = h.price || 0;

  if (isTowerLike && price > 2200) {
    const floors = Math.max(2, Math.min(9, 2 + Math.floor(price / 3200)));
    return { roof: 'flat', floors };
  }
  const floors = price > 4500 ? 2 : 1;
  return { roof: 'gable', floors };
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

  const width = Math.max(3, (b.width * scale) * 0.92);
  const depth = Math.max(3, (b.height * scale) * 0.92);

  const floors = style.floors;
  const baseColor = kind === 'house' ? b.color || '#4a5170' : zoneWallColor(zoneKey);

  const floorHeight = kind === 'house' ? 0.95 : 1.05;
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

  // BoxGeometry material order: [+X, -X, +Y(top), -Y(bottom), +Z(front), -Z(back)]
  const materials = [wallMat(sideTex.clone()), wallMat(sideTex.clone()), plainMat, plainMat, wallMat(frontBackTex), wallMat(frontBackTex.clone())];

  const geo = new THREE.BoxGeometry(width, wallHeight, depth);
  const walls = new THREE.Mesh(geo, materials);
  walls.position.y = wallHeight / 2;
  walls.castShadow = true;
  walls.receiveShadow = true;
  group.add(walls);

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

  // Door + frame + a small threshold step, instead of a flat rectangle
  // stuck to the wall.
  const doorW = Math.min(width * 0.22, 1.1);
  const doorH = 1.15;
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(doorW + 0.14, doorH + 0.12, 0.1),
    new THREE.MeshStandardMaterial({ color: '#efe6d8', roughness: 0.6 })
  );
  frame.position.set(0, doorH / 2 + 0.03, depth / 2 + 0.03);
  group.add(frame);
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(doorW, doorH, 0.08),
    new THREE.MeshStandardMaterial({ color: '#241a12', roughness: 0.5 })
  );
  door.position.set(0, doorH / 2 + 0.06, depth / 2 + 0.06);
  group.add(door);
  const step = new THREE.Mesh(
    new THREE.BoxGeometry(doorW + 0.5, 0.1, 0.35),
    new THREE.MeshStandardMaterial({ color: '#9ca3af', roughness: 0.9 })
  );
  step.position.set(0, 0.05, depth / 2 + 0.2);
  group.add(step);

  // Accent awning above door for shops/food/leisure types
  if (['restaurant', 'market', 'boutique', 'electronics', 'jeweler', 'trading_post', 'hardware_store'].includes(b.type)) {
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
  };
}
