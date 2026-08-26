import React, { useEffect, useState } from 'react';
import { Briefcase, Plus, Save } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../lib/httpClient';
import '../adminPages.css';

const swalTheme = { background: 'var(--vza-bg-surface)', color: 'var(--vza-text-primary)', confirmButtonColor: '#0ea5e9' };

const emptyJob = {
  key: '',
  title: '',
  description: '',
  sector: 'services',
  baseSalary: 100,
  cooldownMinutes: 60,
  icon: 'briefcase',
  isActive: true,
  careerTrack: '',
  tier: 1,
  nextTierKey: '',
  promotionShiftsRequired: '',
  bonusChance: 0.12,
  bonusMultiplier: 1.75,
  locationType: '',
};

const Jobs = () => {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState(null); // job object being edited, or null
  const [saving, setSaving] = useState(false);

  const load = () => {
    setIsLoading(true);
    http.get('/api/economy/jobs').then(({ data: res }) => setJobs(res.jobs)).finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        ...editing,
        nextTierKey: editing.nextTierKey || undefined,
        promotionShiftsRequired: editing.promotionShiftsRequired || undefined,
        careerTrack: editing.careerTrack || undefined,
        locationType: editing.locationType || undefined,
      };
      await http.post('/api/economy/jobs', payload);
      setEditing(null);
      load();
      Swal.fire({ icon: 'success', title: 'Job saved', timer: 1400, showConfirmButton: false, ...swalTheme });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.message, ...swalTheme });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="veltriz-adminpage-header">
        <div>
          <h1 className="veltriz-adminpage-title">
            <Briefcase size={22} /> Jobs
          </h1>
          <p className="veltriz-adminpage-subtitle">
            Salaries, cooldowns, and career-track promotion chains players see in the Job Center.
          </p>
        </div>
        <button className="veltriz-adminpage-btn primary" onClick={() => setEditing({ ...emptyJob })}>
          <Plus size={15} /> New job
        </button>
      </div>

      {editing && (
        <div className="veltriz-adminpage-card">
          <h3 style={{ marginTop: 0 }}>{jobs.find((j) => j.key === editing.key) ? 'Edit job' : 'New job'}</h3>
          <div className="veltriz-adminpage-form-row">
            <input
              className="veltriz-adminpage-input"
              placeholder="key (unique, e.g. 'nurse')"
              value={editing.key}
              onChange={(e) => setEditing((j) => ({ ...j, key: e.target.value }))}
            />
            <input
              className="veltriz-adminpage-input"
              placeholder="Title"
              value={editing.title}
              onChange={(e) => setEditing((j) => ({ ...j, title: e.target.value }))}
            />
            <select
              className="veltriz-adminpage-select"
              value={editing.sector}
              onChange={(e) => setEditing((j) => ({ ...j, sector: e.target.value }))}
            >
              <option value="industry">Industry</option>
              <option value="commerce">Commerce</option>
              <option value="technology">Technology</option>
              <option value="services">Services</option>
              <option value="healthcare">Healthcare</option>
              <option value="government">Government</option>
            </select>
          </div>
          <div className="veltriz-adminpage-form-row">
            <input
              className="veltriz-adminpage-input"
              type="number"
              placeholder="Base salary"
              value={editing.baseSalary}
              onChange={(e) => setEditing((j) => ({ ...j, baseSalary: Number(e.target.value) }))}
            />
            <input
              className="veltriz-adminpage-input"
              type="number"
              placeholder="Cooldown (minutes)"
              value={editing.cooldownMinutes}
              onChange={(e) => setEditing((j) => ({ ...j, cooldownMinutes: Number(e.target.value) }))}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={editing.isActive}
                onChange={(e) => setEditing((j) => ({ ...j, isActive: e.target.checked }))}
              />
              Active
            </label>
          </div>
          <textarea
            className="veltriz-adminpage-input"
            style={{ width: '100%', marginBottom: 14 }}
            placeholder="Description"
            value={editing.description}
            onChange={(e) => setEditing((j) => ({ ...j, description: e.target.value }))}
          />
          <div className="veltriz-adminpage-form-row">
            <input
              className="veltriz-adminpage-input"
              placeholder="Location type (optional, e.g. 'gym', 'casino' — hireable from that panel too)"
              value={editing.locationType}
              onChange={(e) => setEditing((j) => ({ ...j, locationType: e.target.value }))}
            />
          </div>

          <h4 style={{ marginBottom: 8, fontSize: '0.85rem', color: 'var(--vza-text-secondary)' }}>
            Career track (leave blank for a standalone job with no promotion chain)
          </h4>
          <div className="veltriz-adminpage-form-row">
            <input
              className="veltriz-adminpage-input"
              placeholder="Career track key (e.g. 'retail')"
              value={editing.careerTrack}
              onChange={(e) => setEditing((j) => ({ ...j, careerTrack: e.target.value }))}
            />
            <input
              className="veltriz-adminpage-input"
              type="number"
              min="1"
              placeholder="Tier (1 = entry level)"
              value={editing.tier}
              onChange={(e) => setEditing((j) => ({ ...j, tier: Number(e.target.value) }))}
            />
            <input
              className="veltriz-adminpage-input"
              placeholder="Next tier job key (blank = top of track)"
              value={editing.nextTierKey}
              onChange={(e) => setEditing((j) => ({ ...j, nextTierKey: e.target.value }))}
            />
            <input
              className="veltriz-adminpage-input"
              type="number"
              placeholder="Shifts required to promote"
              value={editing.promotionShiftsRequired}
              onChange={(e) => setEditing((j) => ({ ...j, promotionShiftsRequired: Number(e.target.value) }))}
            />
          </div>

          <h4 style={{ marginBottom: 8, fontSize: '0.85rem', color: 'var(--vza-text-secondary)' }}>
            Performance bonus ("employee of the month")
          </h4>
          <div className="veltriz-adminpage-form-row">
            <input
              className="veltriz-adminpage-input"
              type="number"
              step="0.01"
              min="0"
              max="1"
              placeholder="Bonus chance (0-1)"
              value={editing.bonusChance}
              onChange={(e) => setEditing((j) => ({ ...j, bonusChance: Number(e.target.value) }))}
            />
            <input
              className="veltriz-adminpage-input"
              type="number"
              step="0.05"
              min="1"
              placeholder="Bonus multiplier"
              value={editing.bonusMultiplier}
              onChange={(e) => setEditing((j) => ({ ...j, bonusMultiplier: Number(e.target.value) }))}
            />
          </div>

          <div className="veltriz-adminpage-form-row">
            <button className="veltriz-adminpage-btn primary" disabled={saving} onClick={save}>
              <Save size={14} /> Save job
            </button>
            <button className="veltriz-adminpage-btn" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="veltriz-adminpage-card">
        <div className="veltriz-adminpage-table-wrap">
          <table className="veltriz-adminpage-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Career track</th>
                <th>Sector</th>
                <th>Salary</th>
                <th>Cooldown</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7}>Loading…</td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.key}>
                    <td>{job.title}</td>
                    <td>{job.careerTrack ? `${job.careerTrack} (T${job.tier})` : '—'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{job.sector}</td>
                    <td>{job.baseSalary} VC</td>
                    <td>{job.cooldownMinutes} min</td>
                    <td>
                      <span className={`veltriz-adminpage-badge ${job.isActive ? 'active' : 'suspended'}`}>
                        {job.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="veltriz-adminpage-btn"
                        onClick={() =>
                          setEditing({
                            ...emptyJob,
                            ...job,
                            careerTrack: job.careerTrack || '',
                            nextTierKey: job.nextTierKey || '',
                            promotionShiftsRequired: job.promotionShiftsRequired || '',
                          })
                        }
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Jobs;
