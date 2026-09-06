import React, { useEffect, useState } from 'react';
import gameEvents from '../gameEvents';

/**
 * Shows a "Press F to enter <vehicle>" prompt when near a parked vehicle,
 * and swaps to a speedometer + vehicle name while actually driving one.
 */
const VehicleHUD = () => {
  const [nearby, setNearby] = useState(null);
  const [driving, setDriving] = useState(null);

  useEffect(() => {
    const onNearby = (info) => setNearby(info);
    const onUpdate = (status) => setDriving(status);
    gameEvents.on('vehicle:nearby', onNearby);
    gameEvents.on('vehicle:update', onUpdate);
    return () => {
      gameEvents.off('vehicle:nearby', onNearby);
      gameEvents.off('vehicle:update', onUpdate);
    };
  }, []);

  if (driving) {
    return (
      <div className="veltriz-vehicle-hud">
        <div className="veltriz-vehicle-hud-speed">{driving.speedKmh}</div>
        <div className="veltriz-vehicle-hud-unit">km/h{driving.reversing ? ' · R' : ''}</div>
        <div className="veltriz-vehicle-hud-name">{driving.name}</div>
        <div className="veltriz-vehicle-hud-hint">
          <kbd>F</kbd> exit &nbsp;·&nbsp; <kbd>Space</kbd> handbrake
          {driving.hasTrunk && (
            <>
              &nbsp;·&nbsp; <kbd>T</kbd> {driving.trunkOpen ? 'close' : 'open'} trunk
            </>
          )}
        </div>
      </div>
    );
  }

  if (nearby?.mode === 'jack') {
    return (
      <div className="veltriz-game-interact-prompt veltriz-game-interact-prompt-jack">
        Press <kbd>F</kbd> to carjack the {nearby.name} — this will draw police attention
      </div>
    );
  }

  if (nearby) {
    return (
      <div className="veltriz-game-interact-prompt veltriz-game-interact-prompt-vehicle">
        Press <kbd>F</kbd> to get in the {nearby.name}
      </div>
    );
  }

  return null;
};

export default VehicleHUD;
