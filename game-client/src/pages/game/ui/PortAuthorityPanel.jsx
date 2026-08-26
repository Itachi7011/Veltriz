import React from 'react';
import { X, Anchor } from 'lucide-react';
import LocationCareers from './LocationCareers';

/**
 * Port Haven's flagship building — a genuinely new 3-tier career track
 * (Dockhand -> Crane Operator -> Harbor Master), same pattern as Neo
 * Meridian Tower / Dustridge Farm: hiring only, no shop of its own.
 */
const PortAuthorityPanel = ({ onClose }) => (
  <div className="veltriz-game-panel-backdrop" onClick={onClose}>
    <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
      <div className="veltriz-game-panel-header">
        <h2>
          <Anchor size={20} /> Port Haven Authority
        </h2>
        <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </div>
      <p>Every ship that comes through Port Haven clears through here first.</p>
      <LocationCareers locationType="port_authority" />
    </div>
  </div>
);

export default PortAuthorityPanel;
