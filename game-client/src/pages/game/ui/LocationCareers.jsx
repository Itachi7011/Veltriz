import React, { useEffect, useState, useCallback } from 'react';
import { Briefcase, Clock, Check, Zap, Gem } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';

/**
 * Embedded at the bottom of every paid location's panel. Reuses the exact
 * same /api/jobs, /api/jobs/apply, and /api/jobs/work/* economy-service
 * endpoints JobPanel (the Job Center) uses — jobs tagged with this
 * location's locationType (see economy-service's Job model) show up here
 * too, so "visit the place, get hired there, work a shift there" all
 * actually work, not just "browse a generic list at one building". A
 * player can only hold ONE job at a time (matches real life, and how
 * Employment already works) — applying here quits nothing for you
 * automatically if you're already employed elsewhere; the apply call will
 * just fail with a clear message, same as it would from the Job Center.
 *
 * If the player is employed HERE, this also surfaces the full
 * start/wait/collect/rush shift flow (see jobs.controller.js) — visiting
 * Port Haven Authority, the Fishing Wharf, etc. should let you actually
 * work, not send you back to the Job Center just to clock in.
 */
const LocationCareers = ({ locationType }) => {
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
    setJobs(jobsRes.jobs.filter((j) => j.locationType === locationType));
    setEmployment(employmentRes.employment);
    setChronoShards(walletRes.wallet?.chronoShards || 0);
    setIsLoading(false);
  }, [locationType]);

  useEffect(() => {
    load();
  }, [load]);

  // Same "tick off the real completesAt timestamp" approach as JobPanel.jsx
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
      Swal.fire({ icon: 'success', title: 'Hired!', timer: 1600, showConfirmButton: false });
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

  if (isLoading || jobs.length === 0) return null;

  return (
    <div className="veltriz-game-location-careers">
      <h3 style={{ fontSize: '0.85rem', color: '#9ca0c2', marginTop: 20, marginBottom: 8 }}>
        <Briefcase size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
        Careers here
      </h3>
      <div className="veltriz-game-job-list">
        {jobs.map((job) => {
          const isThisJob = employment?.job?.key === job.key;
          return (
            <div key={job.key} className="veltriz-game-job-card">
              <div>
                <div className="veltriz-game-job-title">{job.title}</div>
                <div className="veltriz-game-job-desc">{job.description}</div>
              </div>
              <div className="veltriz-game-job-meta">
                <span>{job.baseSalary} VC/shift</span>
                {isThisJob ? (
                  employment.pendingShift ? (
                    remainingMs > 0 ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="veltriz-game-btn" disabled style={{ opacity: 0.85, fontSize: '0.72rem' }}>
                          <Clock size={13} /> {Math.floor(remainingMs / 60000)}m {Math.ceil((remainingMs % 60000) / 1000)}s
                        </button>
                        <button
                          className="veltriz-game-btn"
                          style={{ fontSize: '0.72rem' }}
                          onClick={rushShift}
                          disabled={busyKey === 'rush'}
                          title={`${chronoShards} Chrono Shards available`}
                        >
                          <Zap size={13} /> {Math.max(1, Math.ceil(remainingMs / 60000))}
                          <Gem size={11} />
                        </button>
                      </div>
                    ) : (
                      <button className="veltriz-game-btn primary" onClick={collectShift} disabled={busyKey === 'collect'}>
                        <Check size={13} /> Collect (+{employment.pendingShift.salary} VC)
                      </button>
                    )
                  ) : (
                    <button className="veltriz-game-btn primary" onClick={startShift} disabled={busyKey === 'start'}>
                      <Briefcase size={13} /> Start shift ({job.cooldownMinutes} min)
                    </button>
                  )
                ) : job.tier === 1 ? (
                  <button className="veltriz-game-btn primary" onClick={() => apply(job.key)} disabled={busyKey === job.key}>
                    Apply
                  </button>
                ) : (
                  // Matches JobPanel.jsx: tier 2+ jobs are only reachable by
                  // promoting from tier 1 — enforced both here (hiding
                  // Apply) and server-side in jobs.controller.js#applyToJob
                  // (which rejects a direct apply to any tier > 1), so this
                  // is a UX nicety, not the only thing stopping it.
                  <span style={{ fontSize: '0.7rem', color: '#6b7094' }}>Reached via promotion</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LocationCareers;
