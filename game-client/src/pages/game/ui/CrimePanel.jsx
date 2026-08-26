import React, { useEffect, useState, useCallback } from 'react';
import { X, VenetianMask, Flame, Zap, Gem } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';

const CrimePanel = ({ onClose }) => {
  const [actions, setActions] = useState([]);
  const [status, setStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);
  const [cooldowns, setCooldowns] = useState({});
  const [chronoShards, setChronoShards] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    const [{ data: actionsRes }, { data: statusRes }, { data: walletRes }] = await Promise.all([
      http.get('/api/crime/actions'),
      http.get('/api/crime/me'),
      http.get('/api/wallet/me'),
    ]);
    setActions(actionsRes.actions);
    setStatus(statusRes);
    setCooldowns(statusRes.cooldowns || {});
    setChronoShards(walletRes.wallet?.chronoShards || 0);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Tick down displayed cooldowns locally so the UI doesn't need to keep polling
  useEffect(() => {
    const t = setInterval(() => {
      setCooldowns((prev) => {
        const next = {};
        Object.entries(prev).forEach(([key, secs]) => {
          if (secs > 1) next[key] = secs - 1;
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const attempt = async (actionKey) => {
    setBusyKey(actionKey);
    try {
      const { data: res } = await http.post('/api/crime/attempt', { actionKey });
      Swal.fire({
        icon: res.outcome === 'success' ? 'success' : 'error',
        title: res.outcome === 'success' ? `+${res.payout} VC` : 'Caught!',
        text: res.shardsEarned ? `${res.message} · Found a Chrono Shard!` : res.message,
        timer: 2200,
        showConfirmButton: false,
      });
      if (res.shardsEarned) setChronoShards((c) => c + res.shardsEarned);
      setCooldowns((prev) => ({ ...prev, [actionKey]: res.nextAttemptAvailableInSeconds }));
      setStatus((prev) => ({
        ...prev,
        heat: res.heatAfter,
        isDangerous: res.heatAfter >= 70,
      }));
    } catch (err) {
      if (err.response?.status === 429) {
        setCooldowns((prev) => ({ ...prev, [actionKey]: err.response.data.remainingSeconds }));
      } else {
        Swal.fire({ icon: 'error', title: 'Could not attempt', text: err.response?.data?.message });
      }
    } finally {
      setBusyKey(null);
    }
  };

  const formatCooldown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const rush = async (actionKey) => {
    const cooldown = cooldowns[actionKey];
    const cost = Math.max(1, Math.ceil(cooldown / 60));
    const confirm = await Swal.fire({
      icon: 'question',
      title: `Rush this cooldown for ${cost} Chrono Shard${cost === 1 ? '' : 's'}?`,
      showCancelButton: true,
      confirmButtonText: 'Rush it',
      confirmButtonColor: '#7c3aed',
    });
    if (!confirm.isConfirmed) return;

    setBusyKey(`rush-${actionKey}`);
    try {
      await http.post('/api/crime/rush-cooldown', { actionKey });
      setCooldowns((prev) => {
        const next = { ...prev };
        delete next[actionKey];
        return next;
      });
      setChronoShards((c) => Math.max(0, c - cost));
      Swal.fire({ icon: 'success', title: 'Ready again!', timer: 1500, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not rush', text: err.response?.data?.message });
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel veltriz-game-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>
            <VenetianMask size={20} /> Crime
          </h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <p>Loading…</p>
        ) : (
          <>
            <div className="veltriz-game-heat-meter">
              <div className="veltriz-game-heat-meter-label">
                <Flame size={14} color={status.isDangerous ? '#ef4444' : '#f59e0b'} />
                Heat: {status.heat}/100 {status.isDangerous && <span className="veltriz-game-heat-danger">— TOO HOT, odds halved</span>}
              </div>
              <div className="veltriz-game-heat-meter-track">
                <div
                  className="veltriz-game-heat-meter-fill"
                  style={{
                    width: `${status.heat}%`,
                    background: status.isDangerous ? '#ef4444' : 'linear-gradient(90deg, #f59e0b, #ef4444)',
                  }}
                />
              </div>
              <div className="veltriz-game-heat-stats">
                {status.totalSuccesses}/{status.totalAttempts} successful · {status.totalEarned.toLocaleString()} VC earned total
              </div>
              <div className="veltriz-game-heat-stats">
                <Gem size={11} style={{ verticalAlign: '-1px' }} /> {chronoShards} Chrono Shards
              </div>
            </div>

            <div className="veltriz-game-job-list">
              {actions.map((action) => {
                const cooldown = cooldowns[action.key];
                const onCooldown = cooldown > 0;
                return (
                  <div key={action.key} className="veltriz-game-job-card">
                    <div>
                      <div className="veltriz-game-job-title">{action.title}</div>
                      <div className="veltriz-game-job-desc">{action.description}</div>
                      <div className="veltriz-game-job-desc">
                        {Math.round(action.baseSuccessChance * 100)}% success · {action.minPayout}-{action.maxPayout} VC
                      </div>
                    </div>
                    <div className="veltriz-game-job-meta">
                      <button
                        className="veltriz-game-btn danger"
                        disabled={busyKey === action.key || onCooldown}
                        onClick={() => attempt(action.key)}
                      >
                        {onCooldown ? formatCooldown(cooldown) : 'Attempt'}
                      </button>
                      {onCooldown && (
                        <button
                          className="veltriz-game-btn"
                          disabled={busyKey === `rush-${action.key}`}
                          onClick={() => rush(action.key)}
                          title={`${chronoShards} Chrono Shards available`}
                        >
                          <Zap size={13} /> {Math.max(1, Math.ceil(cooldown / 60))}
                          <Gem size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CrimePanel;
