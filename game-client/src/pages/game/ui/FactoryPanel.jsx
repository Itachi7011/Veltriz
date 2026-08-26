import React from 'react';
import { X, Factory } from 'lucide-react';
import LocationCareers from './LocationCareers';

/**
 * Unlike the other 5 new locations, Factory has no mechanic of its own — it
 * just gives the existing 3-tier industrial career track (Factory Worker ->
 * Line Supervisor -> Plant Manager, already in economy-service's seed) a
 * physical place to be hired from, instead of only ever surfacing at the
 * generic Job Center.
 */
const FactoryPanel = ({ onClose }) => (
  <div className="veltriz-game-panel-backdrop" onClick={onClose}>
    <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
      <div className="veltriz-game-panel-header">
        <h2>
          <Factory size={20} /> Veltriz Factory
        </h2>
        <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </div>
      <p>Heavy industry — steady work, and a real career ladder if you stick with it.</p>
      <LocationCareers locationType="factory" />
    </div>
  </div>
);

export default FactoryPanel;
