import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import gameEvents from '../gameEvents';
import { BUILDING_COLORS, DEFAULT_BUILDING_COLOR, ZONE_MAP_COLORS, zoneForX } from './mapColors';

const PANEL_MAX_WIDTH = 780;
const PANEL_MAX_HEIGHT = 500;
const OVERVIEW_WIDTH = 780;
const OVERVIEW_HEIGHT = 260;

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

  useEffect(() => {
    const onUpdate = ({ self: s, others: o }) => {
      setSelf(s);
      setOthers(o);
    };
    gameEvents.on('minimap:update', onUpdate);
    return () => gameEvents.off('minimap:update', onUpdate);
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
      <div className="veltriz-game-panel veltriz-game-panel-wide" onClick={(e) => e.stopPropagation()}>
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
          <OverviewMap mapConfig={mapConfig} zones={zones} self={self} others={others} />
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
                    <rect
                      x={(b.x - layout.minX) * layout.scaleX - 7}
                      y={b.y * layout.scaleY - 7}
                      width={14}
                      height={14}
                      fill={BUILDING_COLORS[b.type] || DEFAULT_BUILDING_COLOR}
                      stroke="#0a0c14"
                      strokeWidth={1}
                      rx={3}
                    />
                    <text
                      x={(b.x - layout.minX) * layout.scaleX}
                      y={b.y * layout.scaleY + 22}
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
                <circle
                  cx={(self.x - layout.minX) * layout.scaleX}
                  cy={self.y * layout.scaleY}
                  r={6}
                  fill="#ffd76a"
                  stroke="#fff"
                  strokeWidth={1.4}
                />
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
const OverviewMap = ({ mapConfig, zones, self, others }) => {
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
        <rect
          key={b.id}
          x={b.x * scaleX - 2.5}
          y={b.y * scaleY - 2.5}
          width={5}
          height={5}
          fill={BUILDING_COLORS[b.type] || DEFAULT_BUILDING_COLOR}
          rx={1}
        />
      ))}

      {others.map((o, i) => (
        <circle key={i} cx={o.x * scaleX} cy={o.y * scaleY} r={2.6} fill="#6b7094" />
      ))}

      {self && <circle cx={self.x * scaleX} cy={self.y * scaleY} r={3.6} fill="#ffd76a" stroke="#fff" strokeWidth={0.8} />}
    </svg>
  );
};

export default FullMap;
