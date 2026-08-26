import React from 'react';
import { X, Fish } from 'lucide-react';
import LocationCareers from './LocationCareers';

/**
 * A genuinely new 3-tier career track (Deckhand -> Fishing Captain -> Fleet
 * Owner), not a reskin. Same pattern as Dustridge Farm.
 */
const FishingWharfPanel = ({ onClose }) => (
  <div className="veltriz-game-panel-backdrop" onClick={onClose}>
    <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
      <div className="veltriz-game-panel-header">
        <h2>
          <Fish size={20} /> Fishing Wharf
        </h2>
        <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </div>
      <p>Trawlers come in at dawn — the whole Veltriz Sea economy starts here.</p>
      <LocationCareers locationType="fishing_wharf" />
    </div>
  </div>
);

export default FishingWharfPanel;
