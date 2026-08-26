import React, { useEffect, useState, useCallback } from 'react';
import { X, Gavel } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';
import LocationCareers from './LocationCareers';

const LEGAL_FEE_PER_HEAT_POINT = 3; // must match crime-service's LEGAL_FEE_PER_HEAT_POINT

const CourthousePanel = ({ onClose }) => {
  const [status, setStatus] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await http.get('/api/crime/me');
    setStatus(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const contest = async () => {
    setIsBusy(true);
    try {
      const { data: res } = await http.post('/api/crime/contest-fine');
      Swal.fire({ icon: res.won ? 'success' : 'error', title: res.message, timer: 2400, showConfirmButton: false });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not contest', text: err.response?.data?.message });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>
            <Gavel size={20} /> Veltriz Courthouse
          </h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {!status ? (
          <p>Loading…</p>
        ) : status.heat <= 0 ? (
          <p>Your record is clean. Nothing to contest.</p>
        ) : (
          <>
            <p>
              Current heat: <strong>{status.heat}/100</strong>
            </p>
            <p style={{ opacity: 0.7, fontSize: '0.85em', margin: '10px 0' }}>
              Hire a lawyer for {status.heat * LEGAL_FEE_PER_HEAT_POINT} VC — 50/50 odds. Win and your record's clean.
              Lose and you're out the fee with no change to your heat. Cheaper than the Police Station's guaranteed
              fine, but riskier.
            </p>
            <button className="veltriz-game-btn primary" disabled={isBusy} onClick={contest}>
              {isBusy ? 'In court…' : `Contest (${status.heat * LEGAL_FEE_PER_HEAT_POINT} VC)`}
            </button>
          </>
        )}
        <LocationCareers locationType="courthouse" />
      </div>
    </div>
  );
};

export default CourthousePanel;
