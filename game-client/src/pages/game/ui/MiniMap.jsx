import React, { useEffect, useState } from 'react';
import gameEvents from '../gameEvents';

const BOX_WIDTH = 180;
const BOX_HEIGHT = 120;

const BUILDING_COLORS = {
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

/**
 * Always-visible small map, top-right corner (the standard "minimap"
 * convention most games use). Positions are pushed from MainScene via the
 * shared gameEvents bus (see 'minimap:update' in MainScene.js's update
 * loop) rather than polling — cheap and stays in sync with movement.
 */
const MiniMap = ({ mapConfig, onExpand }) => {
  const [self, setSelf] = useState(null);
  const [others, setOthers] = useState([]);

  useEffect(() => {
    const onUpdate = ({ self: s, others: o }) => {
      setSelf(s);
      setOthers(o);
    };
    gameEvents.on('minimap:update', onUpdate);
    return () => gameEvents.off('minimap:update', onUpdate);
  }, []);

  if (!mapConfig) return null;

  const scaleX = BOX_WIDTH / mapConfig.width;
  const scaleY = BOX_HEIGHT / mapConfig.height;

  return (
    <button
      type="button"
      className="veltriz-game-minimap"
      onClick={onExpand}
      aria-label="Open full map (M)"
      title="Open full map (M)"
    >
      <svg width={BOX_WIDTH} height={BOX_HEIGHT} viewBox={`0 0 ${BOX_WIDTH} ${BOX_HEIGHT}`}>
        <rect x={0} y={0} width={BOX_WIDTH} height={BOX_HEIGHT} fill="#1a1e33" />

        {mapConfig.buildings.map((b) => (
          <rect
            key={b.id}
            x={b.x * scaleX - 3}
            y={b.y * scaleY - 3}
            width={6}
            height={6}
            fill={BUILDING_COLORS[b.type] || '#9ca0c2'}
            rx={1}
          />
        ))}

        {others.map((o, i) => (
          <circle key={i} cx={o.x * scaleX} cy={o.y * scaleY} r={2} fill="#6b7094" />
        ))}

        {self && <circle cx={self.x * scaleX} cy={self.y * scaleY} r={3.2} fill="#ffd76a" stroke="#fff" strokeWidth={0.6} />}
      </svg>
      <span className="veltriz-game-minimap-hint">M</span>
    </button>
  );
};

export default MiniMap;
