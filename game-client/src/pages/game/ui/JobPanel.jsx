import React, { useEffect, useState, useCallback } from 'react';
import { X, Briefcase, Clock, Check } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';

const JobPanel = ({ onClose }) => {
  const [jobs, setJobs] = useState([]);
  const [employment, setEmployment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);
  const [cooldown, setCooldown] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    const [{ data: jobsRes }, { data: employmentRes }] = await Promise.all([
      http.get('/api/jobs'),
      http.get('/api/jobs/me'),
    ]);
    setJobs(jobsRes.jobs);
    setEmployment(employmentRes.employment);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

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

  const workShift = async () => {
    setBusyKey('work');
    try {
      const { data: res } = await http.post('/api/jobs/work');
      Swal.fire({
        icon: 'success',
        title: `+${res.salary} VC`,
        text: res.message,
        timer: 1800,
        showConfirmButton: false,
      });
      setCooldown(res.nextShiftAvailableInSeconds);
      await load();
    } catch (err) {
      if (err.response?.status === 429) {
        setCooldown(err.response.data.remainingSeconds);
      } else {
        Swal.fire({ icon: 'error', title: 'Could not work shift', text: err.response?.data?.message });
      }
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
              You work as <strong>{employment.job.title}</strong> — {employment.totalShiftsWorked} shifts worked,{' '}
              {employment.totalEarned.toLocaleString()} VC earned total.
            </p>
            <div className="veltriz-game-job-actions">
              <button className="veltriz-game-btn primary" onClick={workShift} disabled={busyKey || cooldown > 0}>
                {cooldown > 0 ? (
                  <>
                    <Clock size={15} /> {Math.ceil(cooldown / 60)}m {cooldown % 60}s
                  </>
                ) : (
                  <>
                    <Check size={15} /> Work a shift (+{employment.job.baseSalary} VC)
                  </>
                )}
              </button>
              <button className="veltriz-game-btn danger" onClick={quit} disabled={busyKey}>
                Quit job
              </button>
            </div>
          </div>
        ) : (
          <div className="veltriz-game-job-list">
            {jobs.map((job) => (
              <div key={job.key} className="veltriz-game-job-card">
                <div>
                  <div className="veltriz-game-job-title">{job.title}</div>
                  <div className="veltriz-game-job-desc">{job.description}</div>
                </div>
                <div className="veltriz-game-job-meta">
                  <span>{job.baseSalary} VC/shift</span>
                  <button className="veltriz-game-btn primary" onClick={() => apply(job.key)} disabled={busyKey === job.key}>
                    Apply
                  </button>
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
