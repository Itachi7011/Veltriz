import * as THREE from 'three';

const ZONE_THEME = {
  old_meridian: { ground: '#3a4a3a', ground2: '#334033', label: '#c7d2fe', road: '#2b2e38' },
  neo_meridian: { ground: '#2c3a44', ground2: '#28333c', label: '#67e8f9', road: '#242833' },
  dustridge_county: { ground: '#6b6033', ground2: '#5f5530', label: '#eab676', road: '#4a4530' },
  port_haven: { ground: '#2e4650', ground2: '#293f48', label: '#7dd3fc', road: '#232e34' },
  veltriz_sea: { ground: '#0e4258', ground2: '#0c3a4d', label: '#5eead4', road: '#0a3040' },
  default: { ground: '#3a4a3a', ground2: '#334033', label: '#c7d2fe', road: '#2b2e38' },
};

function grassTexture(theme) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = theme.ground2;
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 128;
    const y = Math.random() * 128;
    ctx.fillRect(x, y, 2, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function roadTexture(theme) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = theme.road;
  ctx.fillRect(0, 0, 128, 128);
  // subtle asphalt speckle
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  for (let i = 0; i < 200; i++) {
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 1, 1);
  }
  // center dashed line
  ctx.fillStyle = '#e8c34a';
  ctx.fillRect(60, 8, 8, 30);
  ctx.fillRect(60, 90, 8, 30);
  // edge lines
  ctx.fillStyle = 'rgba(240,240,240,0.55)';
  ctx.fillRect(6, 0, 4, 128);
  ctx.fillRect(118, 0, 4, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function sidewalkTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#8a8f9c';
  ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 62, 62);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * Builds the ground: one tinted, textured terrain slab per zone (so
 * crossing from Old Meridian into Neo Meridian is felt in the terrain
 * itself, not just a color), a procedural road grid laid across each
 * zone's footprint, and a paved apron around every building/house so
 * structures don't look like they're floating on grass.
 */
export function buildWorld(scene, mapConfig, scale) {
  const { width, height, zones = [], buildings = [], houses = [], obstacles = [] } = mapConfig;
  const group = new THREE.Group();
  group.name = 'world';

  const worldW = width * scale;
  const worldD = height * scale;

  const zoneList = zones.length
    ? zones
    : [{ key: 'default', name: 'Veltriz City', minX: 0, maxX: width }];

  zoneList.forEach((z) => {
    const theme = ZONE_THEME[z.key] || ZONE_THEME.default;
    const zW = (z.maxX - z.minX) * scale;
    const cx = (z.minX + (z.maxX - z.minX) / 2) * scale;

    const isWater = z.key === 'veltriz_sea';
    const tex = grassTexture(theme);
    tex.repeat.set(zW / 6, worldD / 6);

    const groundMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: isWater ? 0.15 : 0.95,
      metalness: isWater ? 0.4 : 0,
      color: isWater ? '#bfe9ff' : '#ffffff',
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(zW, worldD), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(cx, 0, worldD / 2);
    ground.receiveShadow = true;
    group.add(ground);

    // Road grid within this zone, spaced roughly like city blocks.
    if (!isWater) {
      const roadTex = roadTexture(theme);
      const blockX = Math.max(6, Math.round(zW / 26));
      const blockZ = Math.max(4, Math.round(worldD / 26));
      const stepX = zW / blockX;
      const stepZ = worldD / blockZ;

      for (let i = 1; i < blockX; i++) {
        const rx = z.minX * scale + i * stepX;
        const rt = roadTex.clone();
        rt.needsUpdate = true;
        rt.repeat.set(1, worldD / 6);
        rt.rotation = Math.PI / 2;
        const road = new THREE.Mesh(
          new THREE.PlaneGeometry(3.2, worldD),
          new THREE.MeshStandardMaterial({ map: rt, roughness: 0.9 })
        );
        road.rotation.x = -Math.PI / 2;
        road.position.set(rx, 0.01, worldD / 2);
        road.receiveShadow = true;
        group.add(road);
      }
      for (let j = 1; j < blockZ; j++) {
        const rz = j * stepZ;
        const rt = roadTex.clone();
        rt.needsUpdate = true;
        rt.repeat.set(zW / 6, 1);
        const road = new THREE.Mesh(
          new THREE.PlaneGeometry(zW, 3.2),
          new THREE.MeshStandardMaterial({ map: rt, roughness: 0.9 })
        );
        road.rotation.x = -Math.PI / 2;
        road.position.set(cx, 0.01, rz);
        road.receiveShadow = true;
        group.add(road);
      }
    }

    // Zone label, floating over its own territory.
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = theme.label;
    ctx.font = 'bold 90px "Segoe UI", Arial';
    ctx.textAlign = 'center';
    ctx.globalAlpha = 0.55;
    ctx.fillText(z.name.toUpperCase(), 512, 90);
    const labelTex = new THREE.CanvasTexture(canvas);
    const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex, transparent: true }));
    labelSprite.scale.set(60, 7.5, 1);
    labelSprite.position.set(cx, 40, worldD / 2);
    labelSprite.raycast = () => {};
    group.add(labelSprite);
  });

  // Paved aprons under buildings/houses.
  const sidewalkTex = sidewalkTexture();
  const apronGeo = new THREE.PlaneGeometry(1, 1);
  const apronMat = new THREE.MeshStandardMaterial({ map: sidewalkTex, roughness: 1 });
  const allStructures = [...buildings, ...houses];
  allStructures.forEach((b) => {
    const w = b.width * scale + 1.4;
    const d = b.height * scale + 1.4;
    const apron = new THREE.Mesh(apronGeo, apronMat);
    apron.rotation.x = -Math.PI / 2;
    apron.scale.set(w, d, 1);
    apron.position.set(b.x * scale, 0.005, b.y * scale);
    apron.receiveShadow = true;
    group.add(apron);
  });

  // Obstacles → simple concrete jersey-barrier-style blocks (kept, just
  // reskinned from a flat rectangle).
  const obstacleMat = new THREE.MeshStandardMaterial({ color: '#5a6178', roughness: 0.85 });
  obstacles.forEach((o) => {
    const w = Math.max(0.3, o.width * scale);
    const d = Math.max(0.3, o.height * scale);
    const h = 0.7;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), obstacleMat);
    mesh.position.set(o.x * scale, h / 2, o.y * scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });

  scene.add(group);
  return group;
}

export { ZONE_THEME };
