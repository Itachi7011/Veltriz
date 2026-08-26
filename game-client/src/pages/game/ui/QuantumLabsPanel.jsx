import React from 'react';
import { X, FlaskConical } from 'lucide-react';
import LocationCareers from './LocationCareers';

const QuantumLabsPanel = ({ onClose }) => (
  <div className="veltriz-game-panel-backdrop" onClick={onClose}>
    <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
      <div className="veltriz-game-panel-header">
        <h2>
          <FlaskConical size={20} /> Quantum Labs
        </h2>
        <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </div>
      <p>The city's premier research facility — small team, serious work.</p>
      <LocationCareers locationType="quantum_labs" />
    </div>
  </div>
);

export default QuantumLabsPanel;
