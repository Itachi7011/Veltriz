import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import gameEvents from '../gameEvents';
import { BUILDING_COLORS, DEFAULT_BUILDING_COLOR, ZONE_MAP_COLORS, zoneForX } from './mapColors';

const EVENT_COLORS = {
  rally: '#38bdf8',
  gathering: '#38bdf8',
  food_distribution: '#22c55e',
  political_clash: '#f97316',
  gang_war: '#ef4444',
  economic_distress: '#eab308',
};

const PANEL_MAX_WIDTH = 1040;
const PANEL_MAX_HEIGHT = 640;
const OVERVIEW_WIDTH = 1040;
const OVERVIEW_HEIGHT = 320;

// Distinct silhouette per building category — so two buildings of
// different types are never just "a different colored square", they're a
// different shape too (a bank reads as a diamond, a park as a leaf/circle,
// a factory as a hexagon, etc.), while every building of the SAME type
// still renders identically everywhere it appears.
const CATEGORY_SHAPE = {
  civic: 'pentagon',
  finance: 'diamond',
  shop: 'square',
  leisure: 'circle',
  industrial: 'hexagon',
  nature: 'triangle',
  maritime: 'boat',
  home: 'house',
};

const TYPE_CATEGORY = {
  city_hall: 'civic', courthouse: 'civic', government_complex: 'civic', police_station: 'civic',
  embassy: 'civic', university: 'civic', school: 'civic', job_center: 'civic',
  bank: 'finance', stock_exchange: 'finance', credit_union: 'finance', insurance_office: 'finance',
  real_estate: 'finance', lottery: 'finance',
  market: 'shop', boutique: 'shop', electronics: 'shop', jeweler: 'shop', hardware_store: 'shop',
  trading_post: 'shop', vehicle_dealer: 'shop', gun_store: 'shop', pearl_exchange: 'shop',
  restaurant: 'leisure', cinema: 'leisure', casino: 'leisure', gym: 'leisure', hospital: 'leisure',
  factory: 'industrial', tech_campus: 'industrial', quantum_labs: 'industrial', logistics_hub: 'industrial',
  oil_rig: 'industrial', marine_research: 'industrial', port_authority: 'industrial',
  park: 'nature', farm: 'nature',
  marina: 'maritime', fish_market: 'maritime', fishing_wharf: 'maritime', smugglers_den: 'maritime',
  home: 'home',
};

const shapeFor = (type) => CATEGORY_SHAPE[TYPE_CATEGORY[type]] || 'square';

/** Renders one of a small set of recognizable silhouettes at (cx,cy). */
const BuildingGlyph = ({ cx, cy, size, color, shape }) => {
  const s = size;
  const fillProps = { fill: color, stroke: '#0a0c14', strokeWidth: 1 };
  switch (shape) {
    case 'diamond':
      return <polygon points={`${cx},${cy - s} ${cx + s},${cy} ${cx},${cy + s} ${cx - s},${cy}`} {...fillProps} />;
    case 'pentagon': {
      const pts = [0, 1, 2, 3, 4]
        .map((i) => {
          const a = (Math.PI * 2 * i) / 5 - Math.PI / 2;
          return `${cx + Math.cos(a) * s},${cy + Math.sin(a) * s}`;
        })
        .join(' ');
      return <polygon points={pts} {...fillProps} />;
    }
    case 'hexagon': {
      const pts = [0, 1, 2, 3, 4, 5]
        .map((i) => {
          const a = (Math.PI * 2 * i) / 6;
          return `${cx + Math.cos(a) * s},${cy + Math.sin(a) * s}`;
        })
        .join(' ');
      return <polygon points={pts} {...fillProps} />;
    }
    case 'triangle':
      return <polygon points={`${cx},${cy - s} ${cx + s},${cy + s * 0.8} ${cx - s},${cy + s * 0.8}`} {...fillProps} />;
    case 'circle':
      return <circle cx={cx} cy={cy} r={s} {...fillProps} />;
    case 'boat':
      return (
        <polygon
          points={`${cx - s},${cy - s * 0.3} ${cx + s},${cy - s * 0.3} ${cx + s * 0.6},${cy + s} ${cx - s * 0.6},${cy + s}`}
          {...fillProps}
        />
      );
    case 'house':
      return (
        <g>
          <rect x={cx - s * 0.75} y={cy - s * 0.3} width={s * 1.5} height={s * 1.1} {...fillProps} />
          <polygon points={`${cx - s},${cy - s * 0.3} ${cx},${cy - s * 1.15} ${cx + s},${cy - s * 0.3}`} {...fillProps} />
        </g>
      );
    default:
      return <rect x={cx - s} y={cy - s} width={s * 2} height={s * 2} rx={s * 0.25} {...fillProps} />;
  }
};

const LEGEND_ENTRIES = [
  ['home', 'Home'],
  ['job_center', 'Job Center'],
  ['market', 'Market'],
  ['bank', 'Bank'],
  ['hospital', 'Hospital'],
  ['restaurant', 'Restaurant'],
  ['city_hall', 'City Hall'],
  ['park', 'Park'],
  ['police_station', 'Police Station'],
  ['school', 'School'],
  ['university', 'University'],
  ['casino', 'Casino'],
  ['stock_exchange', 'Stock Exchange'],
  ['tech_campus', 'Tech Campus'],
  ['factory', 'Factory'],
  ['marina', 'Marina'],
  ['farm', 'Farm'],
];

/**
 * Previously this squeezed the entire 62,400 x 6,400px world into one
 * 560x373 box — at that scale every building/house overlapped into an
 * illegible pile of dots. The world is split into 5 real zones with very
 * different widths (4,800px up to 18,000px), so it's rebuilt here as:
 *
 *  - a per-zone tab view, each rendered at a scale that actually fits its
 *    own bounding box (so buildings are spaced out and readable, with
 *    names), defaulting to whichever zone you're currently standing in
 *  - an "All Zones" overview tab for orientation — zone-colored bands
 *    with dividers and labels, buildings only (no house-clutter), so it
 *    reads as a real region map instead of a stress test for your eyes
 */
const FullMap = ({ mapConfig, onClose }) => {
  const [self, setSelf] = useState(null);
  const [others, setOthers] = useState([]);
  const [activeZoneKey, setActiveZoneKey] = useState(null);
  const [worldEvent, setWorldEvent] = useState(null);

  useEffect(() => {
    const onUpdate = ({ self: s, others: o }) => {
      setSelf(s);
      setOthers(o);
    };
    const onEvent = (ev) => setWorldEvent(ev);
    gameEvents.on('minimap:update', onUpdate);
    gameEvents.on('worldevent:active', onEvent);
    return () => {
      gameEvents.off('minimap:update', onUpdate);
      gameEvents.off('worldevent:active', onEvent);
    };
  }, []);

  const zones = mapConfig.zones || [{ key: 'default', name: mapConfig.name || 'Veltriz City', minX: 0, maxX: mapConfig.width }];

  // Default to the player's current zone the first time we know where they are.
  useEffect(() => {
    if (activeZoneKey || !self) return;
    const z = zoneForX(zones, self.x);
    setActiveZoneKey(z ? z.key : zones[0].key);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [self]);

  const isOverview = activeZoneKey === 'overview';
  const activeZone = zones.find((z) => z.key === activeZoneKey);

  const layout = useMemo(() => {
    if (isOverview || !activeZone) return null;
    const zoneWidth = activeZone.maxX - activeZone.minX;
    const zoneHeight = mapConfig.height;
    const aspect = zoneWidth / zoneHeight;
    let w = PANEL_MAX_WIDTH;
    let h = w / aspect;
    if (h > PANEL_MAX_HEIGHT) {
      h = PANEL_MAX_HEIGHT;
      w = h * aspect;
    }
    return { w, h, scaleX: w / zoneWidth, scaleY: h / zoneHeight, minX: activeZone.minX };
  }, [activeZone, isOverview, mapConfig.height]);

  const zoneColors = activeZone ? ZONE_MAP_COLORS[activeZone.key] || ZONE_MAP_COLORS.default : ZONE_MAP_COLORS.default;

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel veltriz-game-panel-wide veltriz-game-fullmap-panel" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>{mapConfig.name || 'Map'}</h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close map (M or Esc)">
            <X size={20} />
          </button>
        </div>

        <div className="veltriz-game-fullmap-tabs">
          {zones.map((z) => (
            <button
              key={z.key}
              type="button"
              className={`veltriz-game-fullmap-tab ${activeZoneKey === z.key ? 'active' : ''}`}
              style={activeZoneKey === z.key ? { borderColor: (ZONE_MAP_COLORS[z.key] || ZONE_MAP_COLORS.default).border } : undefined}
              onClick={() => setActiveZoneKey(z.key)}
            >
              {z.name}
            </button>
          ))}
          <button
            type="button"
            className={`veltriz-game-fullmap-tab ${isOverview ? 'active' : ''}`}
            onClick={() => setActiveZoneKey('overview')}
          >
            All Zones
          </button>
        </div>

        {isOverview ? (
          <OverviewMap mapConfig={mapConfig} zones={zones} self={self} others={others} worldEvent={worldEvent} />
        ) : (
          activeZone &&
          layout && (
            <svg width={layout.w} height={layout.h} viewBox={`0 0 ${layout.w} ${layout.h}`} className="veltriz-game-fullmap-svg">
              <rect x={0} y={0} width={layout.w} height={layout.h} fill={zoneColors.ground} rx={8} />

              {(mapConfig.houses || [])
                .filter((h) => h.zone === activeZone.key)
                .map((h) => (
                  <rect
                    key={h.id}
                    x={(h.x - layout.minX) * layout.scaleX - 3}
                    y={h.y * layout.scaleY - 3}
                    width={6}
                    height={6}
                    fill={h.color || '#4a5170'}
                    opacity={0.7}
                    rx={1}
                  />
                ))}

              {(mapConfig.buildings || [])
                .filter((b) => b.zone === activeZone.key)
                .map((b) => (
                  <g key={b.id}>
                    <BuildingGlyph
                      cx={(b.x - layout.minX) * layout.scaleX}
                      cy={b.y * layout.scaleY}
                      size={9}
                      color={BUILDING_COLORS[b.type] || DEFAULT_BUILDING_COLOR}
                      shape={shapeFor(b.type)}
                    />
                    <text
                      x={(b.x - layout.minX) * layout.scaleX}
                      y={b.y * layout.scaleY + 24}
                      fill="#eef0ff"
                      fontSize="10"
                      textAnchor="middle"
                    >
                      {b.name}
                    </text>
                  </g>
                ))}

              {others
                .filter((o) => zoneForX(zones, o.x)?.key === activeZone.key)
                .map((o, i) => (
                  <circle
                    key={i}
                    cx={(o.x - layout.minX) * layout.scaleX}
                    cy={o.y * layout.scaleY}
                    r={4.5}
                    fill="#6b7094"
                    stroke="#0f1220"
                    strokeWidth={1}
                  />
                ))}

              {self && zoneForX(zones, self.x)?.key === activeZone.key && (
                <g>
                  <circle
                    cx={(self.x - layout.minX) * layout.scaleX}
                    cy={self.y * layout.scaleY}
                    r={12}
                    fill="#ffd76a"
                    opacity={0.3}
                  />
                  <circle
                    cx={(self.x - layout.minX) * layout.scaleX}
                    cy={self.y * layout.scaleY}
                    r={7}
                    fill="#ffd76a"
                    stroke="#fff"
                    strokeWidth={1.8}
                  />
                </g>
              )}

              {worldEvent && zoneForX(zones, worldEvent.x)?.key === activeZone.key && (
                <g>
                  <circle
                    cx={(worldEvent.x - layout.minX) * layout.scaleX}
                    cy={worldEvent.z * layout.scaleY}
                    r={16}
                    fill={EVENT_COLORS[worldEvent.type] || '#f97316'}
                    opacity={0.28}
                  />
                  <circle
                    cx={(worldEvent.x - layout.minX) * layout.scaleX}
                    cy={worldEvent.z * layout.scaleY}
                    r={7}
                    fill={EVENT_COLORS[worldEvent.type] || '#f97316'}
                    stroke="#fff"
                    strokeWidth={1.6}
                  />
                  <text
                    x={(worldEvent.x - layout.minX) * layout.scaleX}
                    y={worldEvent.z * layout.scaleY - 20}
                    fill="#f8fafc"
                    fontSize="12"
                    fontWeight="700"
                    textAnchor="middle"
                  >
                    {worldEvent.label}
                  </text>
                </g>
              )}
            </svg>
          )
        )}

        <div className="veltriz-game-fullmap-legend">
          <span>
            <i style={{ background: '#ffd76a' }} /> You
          </span>
          <span>
            <i style={{ background: '#6b7094' }} /> Other players
          </span>
          {LEGEND_ENTRIES.map(([type, label]) => (
            <span key={type}>
              <i style={{ background: BUILDING_COLORS[type] }} /> {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Decluttered bird's-eye view of the whole map: zone-colored vertical
 * bands with dividers/labels, buildings only (houses are omitted here —
 * they're the majority of the visual noise and are already visible in
 * each zone's own tab).
 */
const OverviewMap = ({ mapConfig, zones, self, others, worldEvent }) => {
  const scaleX = OVERVIEW_WIDTH / mapConfig.width;
  const scaleY = OVERVIEW_HEIGHT / mapConfig.height;

  return (
    <svg width={OVERVIEW_WIDTH} height={OVERVIEW_HEIGHT} viewBox={`0 0 ${OVERVIEW_WIDTH} ${OVERVIEW_HEIGHT}`} className="veltriz-game-fullmap-svg">
      {zones.map((z) => {
        const colors = ZONE_MAP_COLORS[z.key] || ZONE_MAP_COLORS.default;
        return (
          <rect
            key={z.key}
            x={z.minX * scaleX}
            y={0}
            width={(z.maxX - z.minX) * scaleX}
            height={OVERVIEW_HEIGHT}
            fill={colors.ground}
            stroke={colors.border}
            strokeWidth={1}
          />
        );
      })}

      {zones.map((z) => {
        const colors = ZONE_MAP_COLORS[z.key] || ZONE_MAP_COLORS.default;
        const cx = ((z.minX + z.maxX) / 2) * scaleX;
        return (
          <text key={z.key} x={cx} y={16} fill={colors.label} fontSize="11" fontWeight="700" textAnchor="middle">
            {z.name.toUpperCase()}
          </text>
        );
      })}

      {(mapConfig.buildings || []).map((b) => (
        <BuildingGlyph
          key={b.id}
          cx={b.x * scaleX}
          cy={b.y * scaleY}
          size={4}
          color={BUILDING_COLORS[b.type] || DEFAULT_BUILDING_COLOR}
          shape={shapeFor(b.type)}
        />
      ))}

      {others.map((o, i) => (
        <circle key={i} cx={o.x * scaleX} cy={o.y * scaleY} r={2.6} fill="#6b7094" />
      ))}

      {worldEvent && (
        <circle
          cx={worldEvent.x * scaleX}
          cy={worldEvent.z * scaleY}
          r={6}
          fill={EVENT_COLORS[worldEvent.type] || '#f97316'}
          stroke="#fff"
          strokeWidth={1.2}
        />
      )}

      {self && (
        <g>
          <circle cx={self.x * scaleX} cy={self.y * scaleY} r={6} fill="#ffd76a" opacity={0.3} />
          <circle cx={self.x * scaleX} cy={self.y * scaleY} r={4} fill="#ffd76a" stroke="#fff" strokeWidth={1} />
        </g>
      )}
    </svg>
  );
};

export default FullMap;
