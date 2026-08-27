import React, { useEffect, useState } from 'react';
import gameEvents from '../gameEvents';

/**
 * Crosshair + ammo/weapon readout + the sniper's scope vignette. Purely
 * a display layer — WeaponSystem is the source of truth, this just
 * listens for its 'weapon:update' events.
 */
const WeaponHUD = () => {
  const [status, setStatus] = useState(null);
  const [hitFlashAt, setHitFlashAt] = useState(0);

  useEffect(() => {
    const onUpdate = (s) => setStatus(s);
    const onHit = () => setHitFlashAt(Date.now());
    gameEvents.on('weapon:update', onUpdate);
    gameEvents.on('weapon:hit', onHit);
    return () => {
      gameEvents.off('weapon:update', onUpdate);
      gameEvents.off('weapon:hit', onHit);
    };
  }, []);

  if (!status) return null;

  const showScope = status.isAiming && status.scoped;
  const recentHit = Date.now() - hitFlashAt < 220;

  return (
    <>
      {showScope ? (
        <div className="veltriz-weapon-scope">
          <div className="veltriz-weapon-scope-crosshair">
            <div className="veltriz-weapon-scope-line h" />
            <div className="veltriz-weapon-scope-line v" />
          </div>
        </div>
      ) : (
        status.key !== 'unarmed' && (
          <div className={`veltriz-weapon-crosshair ${recentHit ? 'hit' : ''}`}>
            <span />
            <span />
            <span />
            <span />
          </div>
        )
      )}

      {status.key !== 'unarmed' && (
        <div className="veltriz-weapon-hud">
          <div className="veltriz-weapon-hud-name">{status.name}</div>
          {status.type === 'ranged' ? (
            <div className="veltriz-weapon-hud-ammo">
              {status.isReloading ? 'Reloading…' : `${status.magAmmo} / ${status.reserveAmmo}`}
            </div>
          ) : (
            <div className="veltriz-weapon-hud-ammo">Melee</div>
          )}
        </div>
      )}
    </>
  );
};

export default WeaponHUD;
