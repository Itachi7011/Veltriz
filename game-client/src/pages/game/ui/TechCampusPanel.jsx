import React from 'react';
import { X, Building2 } from 'lucide-react';
import LocationCareers from './LocationCareers';

/**
 * Neo Meridian's flagship building — a genuinely new 3-tier career track
 * (Data Analyst -> Product Manager -> Tech Director), not a reskin of an
 * existing one. No mechanic of its own beyond hiring, same pattern as
 * Factory/University in Old Meridian.
 */
const TechCampusPanel = ({ onClose }) => (
  <div className="veltriz-game-panel-backdrop" onClick={onClose}>
    <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
      <div className="veltriz-game-panel-header">
        <h2>
          <Building2 size={20} /> Neo Meridian Tower
        </h2>
        <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </div>
      <p>The tallest building in the city — dozens of tech firms under one roof.</p>
      <LocationCareers locationType="tech_campus" />
    </div>
  </div>
);

export default TechCampusPanel;
