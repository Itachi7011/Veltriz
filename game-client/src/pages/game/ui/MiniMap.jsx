import React, { useEffect, useState } from 'react';
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

const BOX_SIZE = 168; // square widget, circular radar clipped inside it
const RADIUS_PX = BOX_SIZE / 2 - 6;
// How much of the world (in original map pixels) is visible in the radar
// at once. Buildings are ~150-400 map-px wide and houses ~100-150, so a
// ~1500px-diameter window reliably shows several nearby structures
// clearly instead of the old approach of squeezing the ENTIRE 62,400px
// map into a 180x120 box (where every building overlapped into noise).
const VIEW_RADIUS = 800;

/**
 * Always-visible small radar, top-right corner — like the minimap in
 * GTA/most open-world games: zoomed in on your immediate surroundings,
 * centered on you, and rotating so "forward" (the way the camera is
 * facing) is always up. Positions are pushed from the 3D engine via the
 * shared gameEvents bus ('minimap:update'), not polled.
 */
const MiniMap = ({ mapConfig, onExpand }) => {
  const [self, setSelf] = useState(null);
  const [others, setOthers] = useState([]);
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

  if (!mapConfig || !self) return null;

  const pxPerUnit = RADIUS_PX / VIEW_RADIUS;
  const zone = zoneForX(mapConfig.zones, self.x);
  const zoneColors = (zone && ZONE_MAP_COLORS[zone.key]) || ZONE_MAP_COLORS.default;

  // Rotate the world so the current facing direction always points up on
  // screen: forward direction in map-space is (sin(yaw), cos(yaw)), and
  // the SVG group needs rotating by (yaw - 180deg) to bring that vector
  // to point straight up. See CHANGES notes for the derivation.
  const facing = self.facing || 0;
  const rotateDeg = (facing * 180) / Math.PI - 180;

  const nearby = (list, pad = 1.4) =>
    list.filter((item) => Math.hypot(item.x - self.x, item.y - self.y) < VIEW_RADIUS * pad);

  const buildings = nearby(mapConfig.buildings || []);
  const houses = nearby(mapConfig.houses || [], 1.15);
  const visibleOthers = others.filter((o) => Math.hypot(o.x - self.x, o.y - self.y) < VIEW_RADIUS * 1.4);
  const eventInRange = worldEvent && Math.hypot(worldEvent.x - self.x, worldEvent.z - self.y) < VIEW_RADIUS * 1.4;

  const worldToLocal = (x, y) => ({ x: (x - self.x) * pxPerUnit, y: (y - self.y) * pxPerUnit });

  return (
    <button
      type="button"
      className="veltriz-game-minimap"
      onClick={onExpand}
      aria-label="Open full map (M)"
      title="Open full map (M)"
    >
      <svg width={BOX_SIZE} height={BOX_SIZE} viewBox={`0 0 ${BOX_SIZE} ${BOX_SIZE}`}>
        <defs>
          <clipPath id="veltriz-minimap-clip">
            <circle cx={BOX_SIZE / 2} cy={BOX_SIZE / 2} r={RADIUS_PX} />
          </clipPath>
        </defs>

        <circle cx={BOX_SIZE / 2} cy={BOX_SIZE / 2} r={RADIUS_PX + 3} fill="#0a0c14" stroke="#3a3f5c" strokeWidth={2} />

        <g clipPath="url(#veltriz-minimap-clip)">
          <g transform={`translate(${BOX_SIZE / 2} ${BOX_SIZE / 2}) rotate(${rotateDeg})`}>
            <rect
              x={-VIEW_RADIUS * pxPerUnit}
              y={-VIEW_RADIUS * pxPerUnit}
              width={VIEW_RADIUS * pxPerUnit * 2}
              height={VIEW_RADIUS * pxPerUnit * 2}
              fill={zoneColors.ground}
            />

            {houses.map((h) => {
              const p = worldToLocal(h.x, h.y);
              return <rect key={h.id} x={p.x - 2} y={p.y - 2} width={4} height={4} fill={h.color || '#4a5170'} opacity={0.75} />;
            })}

            {buildings.map((b) => {
              const p = worldToLocal(b.x, b.y);
              return (
                <rect
                  key={b.id}
                  x={p.x - 4}
                  y={p.y - 4}
                  width={8}
                  height={8}
                  rx={1.5}
                  fill={BUILDING_COLORS[b.type] || DEFAULT_BUILDING_COLOR}
                  stroke="#0a0c14"
                  strokeWidth={0.6}
                />
              );
            })}

            {visibleOthers.map((o, i) => {
              const p = worldToLocal(o.x, o.y);
              return <circle key={i} cx={p.x} cy={p.y} r={3} fill="#6b7094" stroke="#0a0c14" strokeWidth={0.8} />;
            })}

            {eventInRange && (() => {
              const p = worldToLocal(worldEvent.x, worldEvent.z);
              const color = EVENT_COLORS[worldEvent.type] || '#f97316';
              return (
                <g>
                  <circle cx={p.x} cy={p.y} r={10} fill={color} opacity={0.25}>
                    <animate attributeName="r" values="8;14;8" dur="1.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.35;0.05;0.35" dur="1.6s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={p.x} cy={p.y} r={5} fill={color} stroke="#fff" strokeWidth={1} />
                </g>
              );
            })()}

            {/* Player marker: a fixed triangle pointing up (since the map
                rotates around them, they never need to rotate themselves). */}
            <circle cx={0} cy={0} r={10} fill="#ffd76a" opacity={0.25} />
            <polygon points="0,-9 7,8 -7,8" fill="#ffd76a" stroke="#fff" strokeWidth={1.4} />
          </g>
        </g>

        {/* Fixed compass-north tick, rotates opposite the world so it
            always shows true north regardless of facing. */}
        <g transform={`translate(${BOX_SIZE / 2} ${BOX_SIZE / 2}) rotate(${rotateDeg})`}>
          <text x={0} y={-RADIUS_PX + 12} fill="#ffffffaa" fontSize="9" textAnchor="middle" fontWeight="700">
            N
          </text>
        </g>
      </svg>
      <span className="veltriz-game-minimap-hint">M</span>
      {zone && <span className="veltriz-game-minimap-zone">{zone.name}</span>}
      {eventInRange && (
        <span className="veltriz-game-minimap-event" style={{ color: EVENT_COLORS[worldEvent.type] || '#f97316' }}>
          {worldEvent.label}
        </span>
      )}
    </button>
  );
};

export default MiniMap;
