import React, { useEffect, useState } from 'react';
import { X, Home, Zap, Smile, Lock } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';

/**
 * Lets a character relax at a house — either the free starter "Home"
 * (the `type: 'home'` building every character starts near, no
 * ownership involved) or one of the 100+ purchasable houses from the
 * Real Estate Agency, in which case relaxing is only offered if this
 * house is actually the one the player owns.
 *
 * Reuses `/api/character/relax` — the same free, cooldown-gated action
 * the Park already offers (see ParkPanel.jsx). No backend changes
 * needed: relaxing at your house and relaxing at the park are the same
 * underlying action, just offered from a different location, exactly
 * like every other location-gated panel in this game.
 *
 * @param {Object} props
 * @param {Function} props.onClose
 * @param {string} [props.houseId] a worldData.js house `id` — omit for
 *   the free starter home, which has no ownership concept.
 * @param {string} [props.houseName]
 */
const HousePanel = ({ onClose, houseId, houseName }) => {
  const isOwnableHouse = !!houseId;
  const [isBusy, setIsBusy] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(null);
  const [ownership, setOwnership] = useState(isOwnableHouse ? 'checking' : 'starter'); // 'checking' | 'owned' | 'not_owned' | 'starter'

  useEffect(() => {
    if (!isOwnableHouse) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: res } = await http.get('/api/realestate/my');
        if (cancelled) return;
        const owns = (res.houses || []).some((h) => h.houseId === houseId);
        setOwnership(owns ? 'owned' : 'not_owned');
      } catch {
        if (!cancelled) setOwnership('not_owned');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [houseId, isOwnableHouse]);

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

  const title = houseName || 'Home';
  const canRelax = ownership === 'starter' || ownership === 'owned';

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>
            <Home size={20} /> {title}
          </h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {ownership === 'checking' && <p>Checking who lives here…</p>}

        {ownership === 'not_owned' && (
          <>
            <p>
              <Lock size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
              You don't own {title} — you can't let yourself in. Visit a Real Estate Agency if you'd like to buy it.
            </p>
          </>
        )}

        {canRelax && (
          <>
            <p>
              {ownership === 'starter'
                ? 'Kick back for a while. Free, but you need to catch your breath before doing it again.'
                : `Your place. Put your feet up in ${title} — free, same as any other place to relax.`}
            </p>
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
          </>
        )}
      </div>
    </div>
  );
};

export default HousePanel;
