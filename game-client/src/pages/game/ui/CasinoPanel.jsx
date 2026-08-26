import React, { useEffect, useState, useCallback } from 'react';
import { X, Dice5 } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';
import LocationCareers from './LocationCareers';

const CasinoPanel = ({ onClose }) => {
  const [status, setStatus] = useState(null);
  const [amount, setAmount] = useState(50);
  const [isBusy, setIsBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const load = useCallback(async () => {
    const { data } = await http.get('/api/casino/me');
    setStatus(data);
    setAmount((prev) => Math.min(Math.max(prev, data.minBet), data.maxBet));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const bet = async () => {
    setIsBusy(true);
    setLastResult(null);
    try {
      const { data: res } = await http.post('/api/casino/bet', { amount });
      setLastResult(res);
      Swal.fire({
        icon: res.outcome === 'win' ? 'success' : 'error',
        title: res.message,
        timer: 1800,
        showConfirmButton: false,
      });
      await load();
    } catch (err) {
      if (err.response?.status === 429) {
        Swal.fire({ icon: 'info', title: err.response.data.message });
      } else {
        Swal.fire({ icon: 'error', title: 'Bet failed', text: err.response?.data?.message });
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
            <Dice5 size={20} /> Veltriz Casino — Coin Flip
          </h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {!status ? (
          <p>Loading…</p>
        ) : (
          <>
            <p>Call it right and double your bet. Purely for fun — virtual VC only, nothing real ever changes hands.</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
              <input
                type="number"
                min={status.minBet}
                max={status.maxBet}
                className="veltriz-game-market-qty"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value, 10) || status.minBet)}
              />
              <span style={{ opacity: 0.7, fontSize: '0.85em' }}>
                Bet {status.minBet}–{status.maxBet} VC
              </span>
            </div>

            <button className="veltriz-game-btn primary" disabled={isBusy} onClick={bet}>
              {isBusy ? 'Flipping…' : `Flip for ${amount} VC`}
            </button>

            {lastResult && (
              <p style={{ marginTop: 12 }}>
                {lastResult.outcome === 'win' ? `Won ${lastResult.payout} VC!` : `Lost ${lastResult.amount} VC.`}
              </p>
            )}

            <p style={{ opacity: 0.6, fontSize: '0.8em', marginTop: 16 }}>
              Lifetime: wagered {status.totalWagered} · won {status.totalWon} · lost {status.totalLost}
            </p>
          </>
        )}
        <LocationCareers locationType="casino" />
      </div>
    </div>
  );
};

export default CasinoPanel;
