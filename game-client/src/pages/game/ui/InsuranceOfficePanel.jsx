import React, { useEffect, useState, useCallback } from 'react';
import { X, Umbrella } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';
import LocationCareers from './LocationCareers';

const InsuranceOfficePanel = ({ onClose }) => {
  const [status, setStatus] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await http.get('/api/insurance/me');
    setStatus(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const subscribe = async () => {
    setIsBusy(true);
    try {
      const { data: res } = await http.post('/api/insurance/subscribe');
      Swal.fire({ icon: 'success', title: res.message, timer: 2400, showConfirmButton: false });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not subscribe', text: err.response?.data?.message });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>
            <Umbrella size={20} /> Veltriz Insurance
          </h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {!status ? (
          <p>Loading…</p>
        ) : (
          <>
            <p>
              Health coverage: {status.discountPercent}% off every Hospital purchase for {status.coverageDays} days.
            </p>
            {status.active ? (
              <p style={{ color: '#22c55e' }}>Active until {new Date(status.expiresAt).toDateString()}.</p>
            ) : (
              <p style={{ opacity: 0.7 }}>No active coverage.</p>
            )}
            <button className="veltriz-game-btn primary" disabled={isBusy} onClick={subscribe} style={{ marginTop: 12 }}>
              {status.active ? `Renew (${status.premium} VC)` : `Subscribe (${status.premium} VC)`}
            </button>
          </>
        )}
        <LocationCareers locationType="insurance_office" />
      </div>
    </div>
  );
};

export default InsuranceOfficePanel;
