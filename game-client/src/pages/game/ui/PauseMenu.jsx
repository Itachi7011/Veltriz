import React, { useState } from 'react';
import { Play, LogOut, Volume2, VolumeX } from 'lucide-react';
import gameEvents from '../gameEvents';

const PauseMenu = ({ onResume, onExit }) => {
  const [muted, setMuted] = useState(false);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    gameEvents.emit('audio:setMuted', next);
  };

  return (
    <div className="veltriz-game-panel-backdrop">
      <div className="veltriz-game-pause-menu">
        <h2>Paused</h2>
        <button className="veltriz-game-pause-btn primary" onClick={onResume}>
          <Play size={16} /> Resume
        </button>
        <button className="veltriz-game-pause-btn" onClick={toggleMute}>
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />} {muted ? 'Unmute audio' : 'Mute audio'}
        </button>
        <button className="veltriz-game-pause-btn danger" onClick={onExit}>
          <LogOut size={16} /> Exit to main menu
        </button>
        <p className="veltriz-game-pause-hint">Press Esc again to resume</p>
      </div>
    </div>
  );
};

export default PauseMenu;
