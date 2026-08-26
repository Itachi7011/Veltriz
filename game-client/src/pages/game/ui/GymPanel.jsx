import React, { useState } from 'react';
import { X, Dumbbell, Zap, Smile } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';
import LocationCareers from './LocationCareers';

const GYM_COST = 30; // must match GYM_COST in game-world-service/src/controllers/character.controller.js

const GymPanel = ({ onClose }) => {
  const [isBusy, setIsBusy] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(null);

  const workout = async () => {
    setIsBusy(true);
    try {
      const { data: res } = await http.post('/api/character/gym');
      Swal.fire({ icon: 'success', title: res.message, timer: 2000, showConfirmButton: false });
      if (res.stats) {
        window.dispatchEvent(new CustomEvent('veltriz:stats-updated', { detail: { stats: res.stats } }));
      }
      setCooldownSeconds(res.nextGymAvailableInSeconds);
    } catch (err) {
      if (err.response?.status === 429) {
        setCooldownSeconds(err.response.data.remainingSeconds);
        Swal.fire({ icon: 'info', title: err.response.data.message });
      } else {
        Swal.fire({ icon: 'error', title: 'Could not work out', text: err.response?.data?.message });
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
            <Dumbbell size={20} /> Veltriz Gym
          </h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <p>A proper workout session — costs {GYM_COST} VC, tiring but worth it.</p>
        <p className="veltriz-game-market-effects" style={{ marginBottom: 16 }}>
          <span>
            <Zap size={13} /> -20 energy
          </span>
          <span>
            <Smile size={13} /> +25 happiness
          </span>
        </p>
        <button className="veltriz-game-btn primary" disabled={isBusy} onClick={workout}>
          {isBusy ? 'Working out…' : `Work Out (${GYM_COST} VC)`}
        </button>
        {cooldownSeconds != null && (
          <p style={{ opacity: 0.7, fontSize: '0.85em', marginTop: 10 }}>
            Available again in ~{Math.ceil(cooldownSeconds / 60)} min.
          </p>
        )}
        <LocationCareers locationType="gym" />
      </div>
    </div>
  );
};

export default GymPanel;
