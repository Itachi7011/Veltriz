import React from 'react';
import { Play, LogOut, Volume2 } from 'lucide-react';

const PauseMenu = ({ onResume, onExit }) => {
  return (
    <div className="veltriz-game-panel-backdrop">
      <div className="veltriz-game-pause-menu">
        <h2>Paused</h2>
        <button className="veltriz-game-pause-btn primary" onClick={onResume}>
          <Play size={16} /> Resume
        </button>
        <button className="veltriz-game-pause-btn" disabled>
          <Volume2 size={16} /> Settings (coming soon)
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
