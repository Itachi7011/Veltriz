import React, { useState } from 'react';
import { X, Clapperboard, Smile } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';
import LocationCareers from './LocationCareers';

const CINEMA_COST = 20; // must match CINEMA_COST in game-world-service/src/controllers/character.controller.js

const CinemaPanel = ({ onClose }) => {
  const [isBusy, setIsBusy] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(null);

  const watch = async () => {
    setIsBusy(true);
    try {
      const { data: res } = await http.post('/api/character/cinema');
      Swal.fire({ icon: 'success', title: res.message, timer: 2000, showConfirmButton: false });
      if (res.stats) {
        window.dispatchEvent(new CustomEvent('veltriz:stats-updated', { detail: { stats: res.stats } }));
      }
      setCooldownSeconds(res.nextCinemaAvailableInSeconds);
    } catch (err) {
      if (err.response?.status === 429) {
        setCooldownSeconds(err.response.data.remainingSeconds);
        Swal.fire({ icon: 'info', title: err.response.data.message });
      } else {
        Swal.fire({ icon: 'error', title: 'Could not watch a movie', text: err.response?.data?.message });
      }
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>
            <Clapperboard size={20} /> Veltriz Cinema
          </h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <p>Catch a showing — costs {CINEMA_COST} VC, pure fun, no energy cost.</p>
        <p className="veltriz-game-market-effects" style={{ marginBottom: 16 }}>
          <span>
            <Smile size={13} /> +20 happiness
          </span>
        </p>
        <button className="veltriz-game-btn primary" disabled={isBusy} onClick={watch}>
          {isBusy ? 'Watching…' : `Buy Ticket (${CINEMA_COST} VC)`}
        </button>
        {cooldownSeconds != null && (
          <p style={{ opacity: 0.7, fontSize: '0.85em', marginTop: 10 }}>
            Next showing in ~{Math.ceil(cooldownSeconds / 60)} min.
          </p>
        )}
        <LocationCareers locationType="cinema" />
      </div>
    </div>
  );
};

export default CinemaPanel;
