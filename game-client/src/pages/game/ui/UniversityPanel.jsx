import React from 'react';
import { X, GraduationCap } from 'lucide-react';
import LocationCareers from './LocationCareers';

/**
 * Like Factory, this has no mechanic of its own — it gives the existing
 * 3-tier engineering career track (Junior -> Software -> Senior Engineer,
 * already in economy-service's seed) a physical place to be hired from.
 * The School building (separate) is where the tuition-for-skill system
 * lives — University is purely a workplace.
 */
const UniversityPanel = ({ onClose }) => (
  <div className="veltriz-game-panel-backdrop" onClick={onClose}>
    <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
      <div className="veltriz-game-panel-header">
        <h2>
          <GraduationCap size={20} /> Veltriz University
        </h2>
        <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </div>
      <p>Research labs and lecture halls — the city's engineering talent starts here.</p>
      <LocationCareers locationType="university" />
    </div>
  </div>
);

export default UniversityPanel;
