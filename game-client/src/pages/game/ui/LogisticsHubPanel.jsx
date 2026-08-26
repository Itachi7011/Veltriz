import React from 'react';
import { X, Truck } from 'lucide-react';
import LocationCareers from './LocationCareers';

const LogisticsHubPanel = ({ onClose }) => (
  <div className="veltriz-game-panel-backdrop" onClick={onClose}>
    <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
      <div className="veltriz-game-panel-header">
        <h2>
          <Truck size={20} /> Veltriz Logistics Hub
        </h2>
        <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </div>
      <p>Trucks in, trucks out — the city's supply chain runs through here.</p>
      <LocationCareers locationType="logistics_hub" />
    </div>
  </div>
);

export default LogisticsHubPanel;
