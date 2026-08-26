import React from 'react';
import { X, Skull } from 'lucide-react';
import gameEvents from '../gameEvents';

/**
 * A flavor location, not a new backend system — the actual mechanic (a new
 * 'smuggling' crime action, high risk/high reward) lives in crime-service's
 * existing city-wide Crime menu (see seedCrimeActions.js), reachable from
 * anywhere in the city same as pickpocket/heist/etc. This panel just sets
 * the scene and offers a shortcut into that same menu.
 */
const SmugglersDenPanel = ({ onClose }) => (
  <div className="veltriz-game-panel-backdrop" onClick={onClose}>
    <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
      <div className="veltriz-game-panel-header">
        <h2>
          <Skull size={20} /> Smugglers' Cove
        </h2>
        <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>
      </div>
      <p>A hidden inlet where nobody asks questions about the cargo. Word is there's good money in it — for those willing to risk it.</p>
      <button
        className="veltriz-game-btn primary"
        onClick={() => {
          onClose();
          gameEvents.emit('open-crime-menu');
        }}
      >
        Open the Crime menu
      </button>
    </div>
  </div>
);

export default SmugglersDenPanel;
