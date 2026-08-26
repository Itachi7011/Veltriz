import React, { useEffect, useState, useCallback } from 'react';
import { X, Ticket } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';
import LocationCareers from './LocationCareers';

const LotteryPanel = ({ onClose }) => {
  const [status, setStatus] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await http.get('/api/lottery/me');
    setStatus(data);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const buy = async () => {
    setIsBusy(true);
    try {
      const { data: res } = await http.post('/api/lottery/buy', { quantity });
      Swal.fire({ icon: 'success', title: res.message, timer: 2000, showConfirmButton: false });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not buy tickets', text: err.response?.data?.message });
    } finally {
      setIsBusy(false);
    }
  };

  const timeLeft = (iso) => {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return 'drawing…';
    const mins = Math.floor(ms / 60000);
    return `${mins}m left`;
  };

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>
            <Ticket size={20} /> Veltriz Lottery
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
              Draw #{status.drawNumber} — jackpot <strong>{status.jackpot} VC</strong> — {timeLeft(status.drawAt)}
            </p>
            <p style={{ opacity: 0.7, fontSize: '0.85em' }}>You have {status.myTickets} ticket(s) in this draw.</p>
            <div style={{ display: 'flex', gap: 10, margin: '14px 0' }}>
              <input
                type="number"
                min={1}
                max={50}
                className="veltriz-game-market-qty"
                value={quantity}
                onChange={(e) => setQuantity(Math.min(50, Math.max(1, Number(e.target.value))))}
              />
              <button className="veltriz-game-btn primary" disabled={isBusy} onClick={buy}>
                Buy ({quantity * status.ticketPrice} VC)
              </button>
            </div>
            {status.lastResult && (
              <p style={{ opacity: 0.6, fontSize: '0.8em' }}>
                Last draw #{status.lastResult.drawNumber}: {status.lastResult.winner ? `won ${status.lastResult.payout} VC` : 'no tickets sold'}
              </p>
            )}
          </>
        )}
        <LocationCareers locationType="lottery" />
      </div>
    </div>
  );
};

export default LotteryPanel;
