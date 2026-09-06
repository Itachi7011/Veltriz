import React, { useEffect, useState } from 'react';
import gameEvents from '../gameEvents';

/**
 * GameEngine only computes/emits FPS at all when this.showFps is true
 * (see applySettings), so this component costs nothing when the setting
 * is off — it just never receives an event to render.
 */
const FpsCounter = () => {
  const [fps, setFps] = useState(null);

  useEffect(() => {
    const onUpdate = (value) => setFps(value);
    gameEvents.on('fps:update', onUpdate);
    return () => gameEvents.off('fps:update', onUpdate);
  }, []);

  if (fps === null) return null;

  const color = fps >= 50 ? '#4ade80' : fps >= 30 ? '#facc15' : '#f87171';

  return (
    <div className="veltriz-game-fps-counter" style={{ color }}>
      {fps} FPS
    </div>
  );
};

export default FpsCounter;
