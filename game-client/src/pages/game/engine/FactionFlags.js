import * as THREE from 'three';

const cache = new Map();

function drawEmblem(ctx, emblem, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = '#0a0c14';
  ctx.lineWidth = 3;
  ctx.beginPath();
  switch (emblem) {
    case 'star': {
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
        const a2 = a + Math.PI / 5;
        const x1 = cx + Math.cos(a) * r;
        const y1 = cy + Math.sin(a) * r;
        const x2 = cx + Math.cos(a2) * r * 0.45;
        const y2 = cy + Math.sin(a2) * r * 0.45;
        if (i === 0) ctx.moveTo(x1, y1);
        else ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.closePath();
      break;
    }
    case 'leaf':
      ctx.ellipse(cx, cy, r, r * 0.55, Math.PI / 4, 0, Math.PI * 2);
      break;
    case 'torch':
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.5, cy + r * 0.6);
      ctx.lineTo(cx - r * 0.5, cy + r * 0.6);
      ctx.closePath();
      break;
    case 'claw':
      [-1, 0, 1].forEach((i) => {
        ctx.moveTo(cx + i * r * 0.4, cy - r);
        ctx.lineTo(cx + i * r * 0.5, cy + r);
      });
      ctx.lineWidth = r * 0.35;
      ctx.stroke();
      return;
    case 'wave':
      ctx.moveTo(cx - r, cy);
      ctx.bezierCurveTo(cx - r * 0.4, cy - r, cx + r * 0.4, cy + r, cx + r, cy);
      ctx.lineWidth = r * 0.3;
      ctx.stroke();
      return;
    case 'bolt':
      ctx.moveTo(cx + r * 0.2, cy - r);
      ctx.lineTo(cx - r * 0.3, cy + r * 0.15);
      ctx.lineTo(cx + r * 0.1, cy + r * 0.15);
      ctx.lineTo(cx - r * 0.2, cy + r);
      ctx.lineTo(cx + r * 0.4, cy - r * 0.1);
      ctx.lineTo(cx, cy - r * 0.1);
      ctx.closePath();
      break;
    default:
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
}

function makeFlagTexture(faction) {
  const key = faction.key;
  if (cache.has(key)) return cache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  ctx.strokeStyle = '#3a2f22';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(20, 20);
  ctx.lineTo(20, 150);
  ctx.stroke();

  ctx.fillStyle = faction.color;
  ctx.fillRect(20, 20, 90, 56);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, 90, 56);

  drawEmblem(ctx, faction.emblem, 65, 48, 20, '#ffffff');

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 16px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(faction.short || faction.name.slice(0, 4).toUpperCase(), 65, 100);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
}

/** Builds a small flag sprite meant to float above an NPC's head. Hidden by default. */
export function buildFactionFlag(faction) {
  const tex = makeFlagTexture(faction);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(0.5, 0.62, 1);
  sprite.raycast = () => {};
  sprite.visible = false;
  return sprite;
}
