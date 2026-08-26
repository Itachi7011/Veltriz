import React, { useEffect, useState, useCallback } from 'react';
import { X, Briefcase, Clock, Check, TrendingUp, Sparkles, Zap, Gem } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';

const TRACK_LABELS = {
  retail: 'Retail',
  industrial: 'Industrial',
  logistics: 'Logistics',
  engineering: 'Engineering',
  public_service: 'Public Service',
  agriculture: 'Agriculture',
  innovation: 'Innovation',
  research: 'Research',
  maritime: 'Maritime',
  fishing: 'Fishing',
  offshore_energy: 'Offshore Energy',
  oceanography: 'Oceanography',
};

const JobPanel = ({ onClose }) => {
  const [jobs, setJobs] = useState([]);
  const [employment, setEmployment] = useState(null);
  const [chronoShards, setChronoShards] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);
  const [remainingMs, setRemainingMs] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    const [{ data: jobsRes }, { data: employmentRes }, { data: walletRes }] = await Promise.all([
      http.get('/api/jobs'),
      http.get('/api/jobs/me'),
      http.get('/api/wallet/me'),
    ]);
    setJobs(jobsRes.jobs);
    setEmployment(employmentRes.employment);
    setChronoShards(walletRes.wallet?.chronoShards || 0);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Ticks off the actual completesAt timestamp (not just a decrementing
  // counter) so the countdown stays correct even if the tab was
  // backgrounded/throttled — same reason economy-service computes
  // remainingMs off pendingShift.completesAt server-side rather than
  // trusting a client-reported "seconds left".
  useEffect(() => {
    const completesAt = employment?.pendingShift?.completesAt;
    if (!completesAt) {
      setRemainingMs(0);
      return;
    }
    const tick = () => setRemainingMs(Math.max(0, new Date(completesAt).getTime() - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [employment?.pendingShift?.completesAt]);

  const apply = async (jobKey) => {
    setBusyKey(jobKey);
    try {
      await http.post('/api/jobs/apply', { jobKey });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not apply', text: err.response?.data?.message });
    } finally {
      setBusyKey(null);
    }
  };

  const startShift = async () => {
    setBusyKey('start');
    try {
      const { data: res } = await http.post('/api/jobs/work/start');
      Swal.fire({ icon: 'info', title: 'Clocked in', text: res.message, timer: 1500, showConfirmButton: false });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not start shift', text: err.response?.data?.message });
    } finally {
      setBusyKey(null);
    }
  };

  const collectShift = async () => {
    setBusyKey('collect');
    try {
      const { data: res } = await http.post('/api/jobs/work/collect');
      Swal.fire({
        icon: 'success',
        title: res.isBonus ? `Bonus! +${res.salary} VC` : `+${res.salary} VC`,
        text: res.shardsEarned ? `${res.message} · Found a Chrono Shard!` : res.message,
        timer: 2200,
        showConfirmButton: false,
      });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Not ready yet', text: err.response?.data?.message });
      await load();
    } finally {
      setBusyKey(null);
    }
  };

  const rushShift = async () => {
    const cost = Math.max(1, Math.ceil(remainingMs / 60000));
    const confirm = await Swal.fire({
      icon: 'question',
      title: `Rush this shift for ${cost} Chrono Shard${cost === 1 ? '' : 's'}?`,
      text: 'Finishes the shift right now and pays out immediately.',
      showCancelButton: true,
      confirmButtonText: 'Rush it',
      confirmButtonColor: '#7c3aed',
    });
    if (!confirm.isConfirmed) return;

    setBusyKey('rush');
    try {
      const { data: res } = await http.post('/api/jobs/work/rush');
      Swal.fire({
        icon: 'success',
        title: res.isBonus ? `Bonus! +${res.salary} VC` : `+${res.salary} VC`,
        text: `Rushed for ${cost} Chrono Shard${cost === 1 ? '' : 's'}.`,
        timer: 2200,
        showConfirmButton: false,
      });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not rush shift', text: err.response?.data?.message });
    } finally {
      setBusyKey(null);
    }
  };

  const promote = async () => {
    setBusyKey('promote');
    try {
      const { data: res } = await http.post('/api/jobs/promote');
      Swal.fire({ icon: 'success', title: 'Promoted!', text: res.message, confirmButtonColor: '#7c3aed' });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Not promotable yet', text: err.response?.data?.message });
    } finally {
      setBusyKey(null);
    }
  };

  const quit = async () => {
    setBusyKey('quit');
    try {
      await http.post('/api/jobs/quit');
      await load();
    } finally {
      setBusyKey(null);
    }
  };

  const jobsByTrack = jobs.reduce((acc, job) => {
    const track = job.careerTrack || 'other';
    (acc[track] ||= []).push(job);
    return acc;
  }, {});
  Object.values(jobsByTrack).forEach((list) => list.sort((a, b) => a.tier - b.tier));

  const canPromote =
    employment &&
    !employment.pendingShift &&
    !!employment.job.nextTierKey &&
    employment.job.promotionShiftsRequired != null &&
    employment.shiftsAtCurrentTier >= employment.job.promotionShiftsRequired;

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel veltriz-game-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>
            <Briefcase size={20} /> Job Center
          </h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <p>Loading jobs…</p>
        ) : employment ? (
          <div className="veltriz-game-current-job">
            <p>
              You work as <strong>{employment.job.title}</strong> — Tier {employment.job.tier}
              {TRACK_LABELS[employment.job.careerTrack] ? ` (${TRACK_LABELS[employment.job.careerTrack]})` : ''}
            </p>
            <p style={{ fontSize: '0.8rem' }}>
              {employment.totalShiftsWorked} shifts worked total · {employment.totalEarned.toLocaleString()} VC earned ·{' '}
              {employment.totalPromotions} promotion(s)
            </p>

            {employment.job.nextTierKey && (
              <div className="veltriz-game-promotion-track">
                <div className="veltriz-game-promotion-label">
                  <TrendingUp size={13} />
                  Promotion progress: {Math.min(employment.shiftsAtCurrentTier, employment.job.promotionShiftsRequired)}/
                  {employment.job.promotionShiftsRequired} shifts at this tier
                </div>
                <div className="veltriz-game-heat-meter-track">
                  <div
                    className="veltriz-game-heat-meter-fill"
                    style={{
                      width: `${Math.min(100, (employment.shiftsAtCurrentTier / employment.job.promotionShiftsRequired) * 100)}%`,
                      background: 'linear-gradient(90deg, #7c3aed, #06b6d4)',
                    }}
                  />
                </div>
              </div>
            )}

            <div className="veltriz-game-job-actions">
              {employment.pendingShift ? (
                remainingMs > 0 ? (
                  <>
                    <button className="veltriz-game-btn" disabled style={{ opacity: 0.85 }}>
                      <Clock size={15} /> {Math.floor(remainingMs / 60000)}m {Math.ceil((remainingMs % 60000) / 1000)}s remaining
                    </button>
                    <button className="veltriz-game-btn" onClick={rushShift} disabled={busyKey === 'rush'} title={`${chronoShards} Chrono Shards available`}>
                      <Zap size={15} /> Rush ({Math.max(1, Math.ceil(remainingMs / 60000))} <Gem size={11} />)
                    </button>
                  </>
                ) : (
                  <button className="veltriz-game-btn primary" onClick={collectShift} disabled={busyKey === 'collect'}>
                    <Check size={15} /> Collect shift (+{employment.pendingShift.salary} VC)
                  </button>
                )
              ) : (
                <button className="veltriz-game-btn primary" onClick={startShift} disabled={busyKey === 'start'}>
                  <Briefcase size={15} /> Start a shift ({employment.job.cooldownMinutes} min)
                </button>
              )}
              {canPromote && (
                <button className="veltriz-game-btn" style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', border: 'none', color: '#fff' }} onClick={promote} disabled={busyKey}>
                  <Sparkles size={15} /> Promote to next tier
                </button>
              )}
              <button className="veltriz-game-btn danger" onClick={quit} disabled={busyKey}>
                Quit job
              </button>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#6b7094', marginTop: 6 }}>
              <Gem size={11} style={{ verticalAlign: '-1px' }} /> {chronoShards} Chrono Shards
            </p>
          </div>
        ) : (
          <div>
            {Object.entries(jobsByTrack).map(([track, trackJobs]) => (
              <div key={track} style={{ marginBottom: 18 }}>
                <h3 style={{ fontSize: '0.85rem', color: '#9ca0c2', marginBottom: 8 }}>
                  {TRACK_LABELS[track] || track}
                </h3>
                <div className="veltriz-game-job-list">
                  {trackJobs.map((job) => (
                    <div key={job.key} className="veltriz-game-job-card">
                      <div>
                        <div className="veltriz-game-job-title">
                          {job.title} <span style={{ color: '#6b7094', fontWeight: 400 }}>· Tier {job.tier}</span>
                        </div>
                        <div className="veltriz-game-job-desc">{job.description}</div>
                      </div>
                      <div className="veltriz-game-job-meta">
                        <span>{job.baseSalary} VC/shift</span>
                        {job.tier === 1 ? (
                          <button className="veltriz-game-btn primary" onClick={() => apply(job.key)} disabled={busyKey === job.key}>
                            Apply
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#6b7094' }}>Reached via promotion</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default JobPanel;
