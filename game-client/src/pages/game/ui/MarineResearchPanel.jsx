import React from 'react';
import { X, FlaskConical } from 'lucide-react';
import LocationCareers from './LocationCareers';

/**
 * A new 2-tier research track (Marine Biologist -> Chief Oceanographer),
 * deliberately short like Quantum Labs' research track — a smaller, more
 * specialized field than the 3-tier tracks.
 */
const MarineResearchPanel = ({ onClose }) => (
  <div className="veltriz-game-panel-backdrop" onClick={onClose}>
    <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
      <div className="veltriz-game-panel-header">
        <h2>
          <FlaskConical size={20} /> Deepwater Research Institute
        </h2>
        <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </div>
      <p>Small team, serious work — everything Veltriz knows about the sea starts here.</p>
      <LocationCareers locationType="marine_research" />
    </div>
  </div>
);

export default MarineResearchPanel;
