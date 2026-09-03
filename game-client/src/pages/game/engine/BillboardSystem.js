import * as THREE from 'three';
import http from '../../../lib/httpClient';

/**
 * Big banners and TV screens mounted on building facades — showing real
 * game data, not decorative placeholder text:
 *  - Banks/stock exchange/credit union → a stock-price ticker screen
 *  - Markets/trading posts → a commodity-price board (gold, silver, oil,
 *    wheat, fuel)
 *  - City Hall/government complex/courthouse → a political banner with
 *    the current Mayor and this term's candidates (all in-fiction —
 *    Veltriz's own election system, not real people)
 *  - Casinos/cinemas → a neon ad screen
 *
 * Both the stock/commodity prices and the government data are fetched
 * from the real economy-service/game-world-service APIs and redrawn
 * periodically — this is live, not static art.
 */

const TICKER_TYPES = ['bank', 'stock_exchange', 'credit_union'];
const COMMODITY_TYPES = ['market', 'trading_post'];
const POLITICAL_TYPES = ['city_hall', 'government_complex', 'courthouse'];
const AD_TYPES = ['casino', 'cinema'];
const COMMODITY_KEYS = ['gold', 'silver', 'oil_barrel', 'wheat', 'fuel'];

const FETCH_INTERVAL_MS = 45000;

export class BillboardSystem {
  constructor({ buildingEntries }) {
    this.screens = [];
    this.marketItems = [];
    this.govStatus = null;
    this._lastFetchAt = -Infinity;

    buildingEntries.forEach((entry) => {
      const type = entry.data.type;
      let kind = null;
      if (TICKER_TYPES.includes(type)) kind = 'stock';
      else if (COMMODITY_TYPES.includes(type)) kind = 'commodity';
      else if (POLITICAL_TYPES.includes(type)) kind = 'political';
      else if (AD_TYPES.includes(type)) kind = 'ad';
      if (kind) this._attachScreen(entry, kind);
    });
  }

  _attachScreen(entry, kind) {
    const fp = entry.footprint;
    const width = Math.min(Math.max(fp.halfW * 1.5, 2.4), 6.5);
    const height = width * 0.4;

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = Math.round(640 * (height / width));
    const ctx = canvas.getContext('2d');
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      emissive: '#ffffff',
      emissiveMap: texture,
      emissiveIntensity: 0.55,
      roughness: 0.6,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    const mountY = Math.min(fp.height * 0.62, Math.max(fp.height - 0.7, 1.2));
    mesh.position.set(0, mountY, fp.halfD + 0.06);
    entry.group.add(mesh);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.14, height + 0.14, 0.06),
      new THREE.MeshStandardMaterial({ color: '#0c0e14', roughness: 0.5 })
    );
    frame.position.set(0, mountY, fp.halfD + 0.03);
    entry.group.add(frame);

    this.screens.push({ mesh, canvas, ctx, texture, kind, scrollT: Math.random() * 1000 });
  }

  async _fetchData() {
    try {
      const { data } = await http.get('/api/market');
      this.marketItems = data.items || [];
    } catch {
      // Billboards just keep showing whatever they last had — a fetch
      // failure shouldn't be visible as a broken screen.
    }
    try {
      const { data } = await http.get('/api/government/me');
      this.govStatus = data;
    } catch {
      /* same as above */
    }
  }

  update(dt, now) {
    if (now - this._lastFetchAt > FETCH_INTERVAL_MS) {
      this._lastFetchAt = now;
      this._fetchData();
    }
    this.screens.forEach((s) => {
      s.scrollT += dt;
      this._draw(s);
    });
  }

  _draw(screen) {
    const { ctx, canvas, kind } = screen;
    ctx.fillStyle = '#04060b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (kind === 'stock') this._drawTicker(screen, 'stock', 'MARKET WATCH');
    else if (kind === 'commodity') this._drawTicker(screen, 'commodity', 'COMMODITIES', COMMODITY_KEYS);
    else if (kind === 'political') this._drawPolitical(screen);
    else this._drawAd(screen);

    screen.texture.needsUpdate = true;
  }

  _drawTicker({ ctx, canvas, scrollT }, category, title, onlyKeys) {
    let rows = this.marketItems.filter((i) => i.category === category);
    if (onlyKeys) rows = rows.filter((i) => onlyKeys.includes(i.key));
    if (!rows.length) {
      ctx.fillStyle = '#4b5563';
      ctx.font = '28px monospace';
      ctx.fillText('CONNECTING…', 20, canvas.height / 2);
      return;
    }

    ctx.fillStyle = '#0ea5e9';
    ctx.font = 'bold 30px monospace';
    ctx.fillText(title, 16, 40);
    ctx.strokeStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.moveTo(16, 52);
    ctx.lineTo(canvas.width - 16, 52);
    ctx.stroke();

    const rowH = (canvas.height - 70) / Math.min(rows.length, 5);
    rows.slice(0, 5).forEach((item, i) => {
      const y = 78 + i * rowH;
      const up = item.currentPrice >= item.previousPrice;
      ctx.fillStyle = '#e5e7eb';
      ctx.font = '24px monospace';
      ctx.fillText(item.name, 20, y);
      const priceStr = `$${item.currentPrice.toLocaleString()}`;
      ctx.fillStyle = up ? '#22c55e' : '#ef4444';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${up ? '▲' : '▼'} ${priceStr}`, canvas.width - 20, y);
      ctx.textAlign = 'left';
    });

    const tickerText = rows.map((r) => `${r.name} $${r.currentPrice}`).join('   •   ');
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, canvas.height - 26, canvas.width, 26);
    ctx.fillStyle = '#facc15';
    ctx.font = '16px monospace';
    const textWidth = ctx.measureText(tickerText).width;
    const x = canvas.width - ((scrollT * 60) % (textWidth + canvas.width));
    ctx.fillText(tickerText, x, canvas.height - 8);
  }

  _drawPolitical({ ctx, canvas }) {
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 30px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CITY OF VELTRIZ', canvas.width / 2, 42);

    const gov = this.govStatus?.government;
    const election = this.govStatus?.election;

    ctx.font = '20px "Segoe UI", sans-serif';
    ctx.fillStyle = '#94a3b8';
    if (gov?.mayorName) {
      ctx.fillText(`Mayor ${gov.mayorName} · Term ${gov.termNumber}`, canvas.width / 2, 78);
    } else {
      ctx.fillText('Office of the Mayor — vacant', canvas.width / 2, 78);
    }

    if (election?.candidates?.length) {
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 22px "Segoe UI", sans-serif';
      ctx.fillText(`TERM ${election.termNumber} — VOTE AT CITY HALL`, canvas.width / 2, 118);
      ctx.font = '19px "Segoe UI", sans-serif';
      election.candidates.slice(0, 3).forEach((c, i) => {
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(`${c.displayName}${c.slogan ? ` — "${c.slogan}"` : ''}`, canvas.width / 2, 155 + i * 28);
      });
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '18px "Segoe UI", sans-serif';
      ctx.fillText('No declared candidates yet this term', canvas.width / 2, 130);
    }
    ctx.textAlign = 'left';
  }

  _drawAd({ ctx, canvas, scrollT }) {
    const hue = (scrollT * 30) % 360;
    ctx.fillStyle = `hsl(${hue}, 70%, 12%)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = `hsl(${hue}, 90%, 65%)`;
    ctx.font = 'bold 46px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VELTRIZ NIGHTS', canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = '20px "Segoe UI", sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('Open till sunrise', canvas.width / 2, canvas.height / 2 + 26);
    ctx.textAlign = 'left';
  }

  dispose() {
    this.screens.forEach((s) => {
      s.texture.dispose();
      s.mesh.material.dispose();
      s.mesh.geometry.dispose();
    });
    this.screens = [];
  }
}
