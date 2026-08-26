import React from 'react';
import { X, Wheat } from 'lucide-react';
import LocationCareers from './LocationCareers';

/**
 * A genuinely new 3-tier career track (Farmhand -> Farm Foreman -> Ranch
 * Owner), not a reskin. No mechanic beyond hiring, same pattern as
 * Factory/University/Tech Campus.
 */
const FarmPanel = ({ onClose }) => (
  <div className="veltriz-game-panel-backdrop" onClick={onClose}>
    <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
      <div className="veltriz-game-panel-header">
        <h2>
          <Wheat size={20} /> Dustridge Farm
        </h2>
        <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </div>
      <p>Fields as far as you can see — the county's biggest employer.</p>
      <LocationCareers locationType="farm" />
    </div>
  </div>
);

export default FarmPanel;
