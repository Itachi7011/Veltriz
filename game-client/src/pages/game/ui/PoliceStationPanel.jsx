import React, { useEffect, useState, useCallback } from 'react';
import { X, Shield } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';
import LocationCareers from './LocationCareers';

const PoliceStationPanel = ({ onClose }) => {
  const [status, setStatus] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await http.get('/api/crime/me');
    setStatus(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const payFine = async () => {
    setIsBusy(true);
    try {
      const { data: res } = await http.post('/api/crime/pay-fine');
      Swal.fire({ icon: 'success', title: res.message, timer: 2200, showConfirmButton: false });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not pay', text: err.response?.data?.message });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>
            <Shield size={20} /> Veltriz Police Station
          </h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {!status ? (
          <p>Loading…</p>
        ) : status.heat <= 0 ? (
          <p>Your record is clean. Nothing to pay off.</p>
        ) : (
          <>
            <p>
              Current heat: <strong>{status.heat}/100</strong>
              {status.isDangerous && ' — you\u2019re a known suspect right now.'}
            </p>
            <p style={{ opacity: 0.7, fontSize: '0.85em', margin: '10px 0' }}>
              Pay a fine (5 VC per heat point) to clear your record instantly, instead of waiting for it to decay on
              its own.
            </p>
            <button className="veltriz-game-btn primary" disabled={isBusy} onClick={payFine}>
              {isBusy ? 'Paying…' : `Pay Fine (${status.heat * 5} VC)`}
            </button>
          </>
        )}
        <LocationCareers locationType="police_station" />
      </div>
    </div>
  );
};

export default PoliceStationPanel;
