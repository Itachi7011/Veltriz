import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import gameEvents from '../gameEvents';

const MAP_WIDTH = 560;
const MAP_HEIGHT = 373; // fixed display box — scaleX/scaleY below are computed independently per axis from mapConfig's actual width/height, so this stays correct regardless of the world's real aspect ratio (currently 62400x6400, after the Port Haven + Veltriz Sea expansion)

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

const FullMap = ({ mapConfig, onClose }) => {
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

  const scaleX = MAP_WIDTH / mapConfig.width;
  const scaleY = MAP_HEIGHT / mapConfig.height;

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel veltriz-game-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>{mapConfig.name || 'Map'}</h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close map (M or Esc)">
            <X size={20} />
          </button>
        </div>

        <svg width={MAP_WIDTH} height={MAP_HEIGHT} viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} className="veltriz-game-fullmap-svg">
          <rect x={0} y={0} width={MAP_WIDTH} height={MAP_HEIGHT} fill="#1a1e33" rx={8} />

          {/* Houses render as subtle background texture — not individually
              labeled, so 100+ of them don't drown out the interactive
              locations below. */}
          {(mapConfig.houses || []).map((h) => (
            <rect
              key={h.id}
              x={h.x * scaleX - 2}
              y={h.y * scaleY - 2}
              width={4}
              height={4}
              fill={h.color || '#4a5170'}
              opacity={0.6}
              rx={1}
            />
          ))}

          {mapConfig.buildings.map((b) => (
            <g key={b.id}>
              <rect
                x={b.x * scaleX - 6}
                y={b.y * scaleY - 6}
                width={12}
                height={12}
                fill={BUILDING_COLORS[b.type] || '#9ca0c2'}
                rx={2}
              />
              <text x={b.x * scaleX} y={b.y * scaleY + 22} fill="#dfe3ff" fontSize="10" textAnchor="middle">
                {b.name}
              </text>
            </g>
          ))}

          {others.map((o, i) => (
            <circle key={i} cx={o.x * scaleX} cy={o.y * scaleY} r={4} fill="#6b7094" stroke="#0f1220" strokeWidth={1} />
          ))}

          {self && (
            <circle cx={self.x * scaleX} cy={self.y * scaleY} r={5.5} fill="#ffd76a" stroke="#fff" strokeWidth={1.2} />
          )}
        </svg>

        <div className="veltriz-game-fullmap-legend">
          <span>
            <i style={{ background: '#ffd76a' }} /> You
          </span>
          <span>
            <i style={{ background: '#6b7094' }} /> Other players
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.job_center }} /> Job Center
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.market }} /> Market
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.bank }} /> Bank
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.home }} /> Home
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.hospital }} /> Hospital
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.restaurant }} /> Restaurant
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.city_hall }} /> City Hall
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.park }} /> Park
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.electronics }} /> Electronics
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.boutique }} /> Boutique
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.jeweler }} /> Jeweler
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.gym }} /> Gym
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.casino }} /> Casino
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.stock_exchange }} /> Stock Exchange
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.school }} /> School
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.real_estate }} /> Real Estate
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.police_station }} /> Police Station
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.cinema }} /> Cinema
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.factory }} /> Factory
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.credit_union }} /> Credit Union
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.insurance_office }} /> Insurance
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.lottery }} /> Lottery
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.courthouse }} /> Courthouse
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.university }} /> University
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.logistics_hub }} /> Logistics Hub
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.government_complex }} /> Gov. Complex
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.hardware_store }} /> Hardware Store
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.trading_post }} /> Trading Post
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.embassy }} /> Embassy
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.tech_campus }} /> Tech Campus
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.quantum_labs }} /> Quantum Labs
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.gun_store }} /> Gun Store
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.farm }} /> Farm
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.port_authority }} /> Port Authority
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.fish_market }} /> Fish Market
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.pearl_exchange }} /> Pearl Exchange
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.vehicle_dealer }} /> Vehicle Dealer
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.marina }} /> Marina
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.fishing_wharf }} /> Fishing Wharf
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.oil_rig }} /> Oil Platform
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.marine_research }} /> Marine Research
          </span>
          <span>
            <i style={{ background: BUILDING_COLORS.smugglers_den }} /> Smugglers' Cove
          </span>
        </div>
      </div>
    </div>
  );
};

export default FullMap;
