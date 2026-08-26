import React, { useState } from 'react';
import { X, Trees, Zap, Smile } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';

const ParkPanel = ({ onClose }) => {
  const [isBusy, setIsBusy] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(null);

  const relax = async () => {
    setIsBusy(true);
    try {
      const { data: res } = await http.post('/api/character/relax');
      Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false });
      if (res.stats) {
        window.dispatchEvent(new CustomEvent('veltriz:stats-updated', { detail: { stats: res.stats } }));
      }
      setCooldownSeconds(res.nextRelaxAvailableInSeconds);
    } catch (err) {
      if (err.response?.status === 429) {
        setCooldownSeconds(err.response.data.remainingSeconds);
        Swal.fire({ icon: 'info', title: err.response.data.message });
      } else {
        Swal.fire({ icon: 'error', title: 'Could not relax right now', text: err.response?.data?.message });
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
            <Trees size={20} /> Veltriz Central Park
          </h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <p>Take a break on a bench. It's free, but you'll want to catch your breath before doing it again.</p>
        <p className="veltriz-game-market-effects" style={{ marginBottom: 16 }}>
          <span>
            <Zap size={13} /> +15 energy
          </span>
          <span>
            <Smile size={13} /> +10 happiness
          </span>
        </p>
        <button className="veltriz-game-btn primary" disabled={isBusy} onClick={relax}>
          {isBusy ? 'Relaxing…' : 'Relax'}
        </button>
        {cooldownSeconds != null && (
          <p style={{ opacity: 0.7, fontSize: '0.85em', marginTop: 10 }}>
            Available again in ~{Math.ceil(cooldownSeconds / 60)} min.
          </p>
        )}
      </div>
    </div>
  );
};

export default ParkPanel;
