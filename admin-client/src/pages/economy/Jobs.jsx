import React, { useEffect, useState } from 'react';
import { Briefcase, Plus, Save } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../lib/httpClient';
import '../adminPages.css';

const swalTheme = { background: 'var(--vza-bg-surface)', color: 'var(--vza-text-primary)', confirmButtonColor: '#0ea5e9' };

const emptyJob = { key: '', title: '', description: '', sector: 'services', baseSalary: 100, cooldownMinutes: 60, icon: 'briefcase', isActive: true };

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
      await http.post('/api/economy/jobs', editing);
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
          <p className="veltriz-adminpage-subtitle">Salaries and shift cooldowns players see in the Job Center.</p>
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
                  <td colSpan={6}>Loading…</td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.key}>
                    <td>{job.title}</td>
                    <td style={{ textTransform: 'capitalize' }}>{job.sector}</td>
                    <td>{job.baseSalary} VC</td>
                    <td>{job.cooldownMinutes} min</td>
                    <td>
                      <span className={`veltriz-adminpage-badge ${job.isActive ? 'active' : 'suspended'}`}>
                        {job.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button className="veltriz-adminpage-btn" onClick={() => setEditing({ ...job })}>
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
