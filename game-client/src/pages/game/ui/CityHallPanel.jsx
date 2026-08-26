import React, { useEffect, useState, useCallback } from 'react';
import { X, Landmark, Vote, Crown } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';

/**
 * A real, working politics system: elections run on a rolling 24h window
 * (see game-world-service's Election model + cron/electionCycle.js).
 * File as a candidate (pay a fee), vote once per term, and whoever's
 * elected gets one real lever — a citywide tax rate that economy-service
 * actually applies to every job's salary (see jobs.controller.js#startShift,
 * called via a fail-open internal read so politics being down never blocks
 * a paycheck).
 */
const CityHallPanel = ({ onClose }) => {
  const [status, setStatus] = useState(null);
  const [slogan, setSlogan] = useState('');
  const [taxInput, setTaxInput] = useState(0);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await http.get('/api/government/me');
    setStatus(data);
    setTaxInput(data.government.taxRatePercent);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const file = async () => {
    setIsBusy(true);
    try {
      const { data: res } = await http.post('/api/government/file', { slogan });
      Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not file', text: err.response?.data?.message });
    } finally {
      setIsBusy(false);
    }
  };

  const castVote = async (candidateUserId) => {
    setIsBusy(true);
    try {
      const { data: res } = await http.post('/api/government/vote', { candidateUserId });
      Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not vote', text: err.response?.data?.message });
    } finally {
      setIsBusy(false);
    }
  };

  const savePolicy = async () => {
    setIsBusy(true);
    try {
      const { data: res } = await http.patch('/api/government/policy', { taxRatePercent: taxInput });
      Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not set policy', text: err.response?.data?.message });
    } finally {
      setIsBusy(false);
    }
  };

  const timeLeft = (iso) => {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return 'resolving…';
    const hrs = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hrs}h ${mins}m left`;
  };

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel veltriz-game-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>
            <Landmark size={20} /> City Hall
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
              <Crown size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
              {status.government.mayorName
                ? `Mayor ${status.government.mayorName} — current tax rate: ${status.government.taxRatePercent}% off every job's salary.`
                : "No Mayor elected yet — the first term's results are still coming in."}
            </p>

            {status.isMayor && (
              <div className="veltriz-game-market-card" style={{ marginTop: 14, flexDirection: 'column', alignItems: 'stretch' }}>
                <div className="veltriz-game-market-name">Set city tax rate (your policy lever)</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                  <input
                    type="number"
                    min={0}
                    max={status.maxTaxRate}
                    className="veltriz-game-market-qty"
                    value={taxInput}
                    onChange={(e) => setTaxInput(Number(e.target.value))}
                  />
                  <span style={{ fontSize: '0.8em', opacity: 0.7 }}>0-{status.maxTaxRate}%</span>
                  <button className="veltriz-game-btn primary" disabled={isBusy} onClick={savePolicy}>
                    Set Policy
                  </button>
                </div>
              </div>
            )}

            <h3 style={{ fontSize: '0.9rem', marginTop: 20, marginBottom: 6 }}>
              <Vote size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
              Term {status.election.termNumber} — {timeLeft(status.election.votingEndsAt)}
            </h3>

            {status.election.candidates.length === 0 ? (
              <p style={{ opacity: 0.7 }}>Nobody's running yet.</p>
            ) : (
              <div className="veltriz-game-market-list">
                {status.election.candidates.map((c) => (
                  <div key={c.user} className="veltriz-game-market-card">
                    <div className="veltriz-game-market-info">
                      <div className="veltriz-game-market-name">{c.displayName}</div>
                      {c.slogan && <div className="veltriz-game-market-owned">"{c.slogan}"</div>}
                      <div className="veltriz-game-market-owned">{c.votes} vote{c.votes === 1 ? '' : 's'}</div>
                    </div>
                    <div className="veltriz-game-market-actions">
                      <button
                        className="veltriz-game-btn primary"
                        disabled={isBusy || status.election.hasVoted}
                        onClick={() => castVote(c.user)}
                      >
                        {status.election.hasVoted ? 'Voted' : 'Vote'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!status.election.isCandidate && (
              <div style={{ marginTop: 16 }}>
                <input
                  type="text"
                  placeholder="Campaign slogan (optional)"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  style={{ width: '100%', marginBottom: 8 }}
                  className="veltriz-game-market-qty"
                  maxLength={120}
                />
                <button className="veltriz-game-btn" disabled={isBusy} onClick={file}>
                  Run for Mayor ({status.filingFee} VC)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CityHallPanel;
