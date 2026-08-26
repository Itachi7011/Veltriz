import React from 'react';
import { X, Building2 } from 'lucide-react';
import LocationCareers from './LocationCareers';

/**
 * Civil service jobs (Clerk -> Civil Officer -> Administrator) now hire
 * from here instead of only the abstract Job Center — separate from City
 * Hall, which is where the actual elected politics (Mayor, tax policy)
 * lives. This building is just the city's day-to-day bureaucracy.
 */
const GovernmentComplexPanel = ({ onClose }) => (
  <div className="veltriz-game-panel-backdrop" onClick={onClose}>
    <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
      <div className="veltriz-game-panel-header">
        <h2>
          <Building2 size={20} /> Veltriz Government Complex
        </h2>
        <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </div>
      <p>The city's day-to-day administration — permits, records, and public service careers.</p>
      <LocationCareers locationType="government_complex" />
    </div>
  </div>
);

export default GovernmentComplexPanel;
