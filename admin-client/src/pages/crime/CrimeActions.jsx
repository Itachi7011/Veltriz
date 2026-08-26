import React, { useEffect, useState } from 'react';
import { VenetianMask, Plus, Save } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../lib/httpClient';
import '../adminPages.css';

const swalTheme = { background: 'var(--vza-bg-surface)', color: 'var(--vza-text-primary)', confirmButtonColor: '#0ea5e9' };

const emptyAction = {
  key: '',
  title: '',
  description: '',
  icon: 'venetian-mask',
  baseSuccessChance: 0.6,
  minPayout: 20,
  maxPayout: 100,
  cooldownMinutes: 10,
  isActive: true,
};

const CrimeActions = () => {
  const [actions, setActions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setIsLoading(true);
    http
      .get('/api/crime-control/actions')
      .then(({ data: res }) => setActions(res.actions))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const save = async () => {
    setSaving(true);
    try {
      if (editing.maxPayout < editing.minPayout) {
        Swal.fire({ icon: 'error', title: 'Invalid range', text: 'Max payout cannot be less than min payout.', ...swalTheme });
        setSaving(false);
        return;
      }
      await http.post('/api/crime-control/actions', editing);
      setEditing(null);
      load();
      Swal.fire({ icon: 'success', title: 'Crime action saved', timer: 1400, showConfirmButton: false, ...swalTheme });
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
            <VenetianMask size={22} /> Crime Actions
          </h1>
          <p className="veltriz-adminpage-subtitle">Success chance, payout range, heat cost, and cooldown per action.</p>
        </div>
        <button className="veltriz-adminpage-btn primary" onClick={() => setEditing({ ...emptyAction })}>
          <Plus size={15} /> New action
        </button>
      </div>

      {editing && (
        <div className="veltriz-adminpage-card">
          <h3 style={{ marginTop: 0 }}>{actions.find((a) => a.key === editing.key) ? 'Edit action' : 'New action'}</h3>
          <div className="veltriz-adminpage-form-row">
            <input
              className="veltriz-adminpage-input"
              placeholder="key (unique, e.g. 'carjack')"
              value={editing.key}
              onChange={(e) => setEditing((a) => ({ ...a, key: e.target.value }))}
            />
            <input
              className="veltriz-adminpage-input"
              placeholder="Title"
              value={editing.title}
              onChange={(e) => setEditing((a) => ({ ...a, title: e.target.value }))}
            />
          </div>
          <div className="veltriz-adminpage-form-row">
            <input
              className="veltriz-adminpage-input"
              type="number"
              step="0.05"
              min="0"
              max="1"
              placeholder="Success chance (0-1)"
              value={editing.baseSuccessChance}
              onChange={(e) => setEditing((a) => ({ ...a, baseSuccessChance: Number(e.target.value) }))}
            />
            <input
              className="veltriz-adminpage-input"
              type="number"
              placeholder="Min payout"
              value={editing.minPayout}
              onChange={(e) => setEditing((a) => ({ ...a, minPayout: Number(e.target.value) }))}
            />
            <input
              className="veltriz-adminpage-input"
              type="number"
              placeholder="Max payout"
              value={editing.maxPayout}
              onChange={(e) => setEditing((a) => ({ ...a, maxPayout: Number(e.target.value) }))}
            />
            <input
              className="veltriz-adminpage-input"
              type="number"
              placeholder="Cooldown (minutes)"
              value={editing.cooldownMinutes}
              onChange={(e) => setEditing((a) => ({ ...a, cooldownMinutes: Number(e.target.value) }))}
            />
          </div>
          <textarea
            className="veltriz-adminpage-input"
            style={{ width: '100%', marginBottom: 14 }}
            placeholder="Description"
            value={editing.description}
            onChange={(e) => setEditing((a) => ({ ...a, description: e.target.value }))}
          />
          <div className="veltriz-adminpage-form-row">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={editing.isActive}
                onChange={(e) => setEditing((a) => ({ ...a, isActive: e.target.checked }))}
              />
              Active
            </label>
          </div>
          <div className="veltriz-adminpage-form-row">
            <button className="veltriz-adminpage-btn primary" disabled={saving} onClick={save}>
              <Save size={14} /> Save action
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
                <th>Success chance</th>
                <th>Payout range</th>
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
                actions.map((action) => (
                  <tr key={action.key}>
                    <td>{action.title}</td>
                    <td>{Math.round(action.baseSuccessChance * 100)}%</td>
                    <td>
                      {action.minPayout}-{action.maxPayout} VC
                    </td>
                    <td>{action.cooldownMinutes} min</td>
                    <td>
                      <span className={`veltriz-adminpage-badge ${action.isActive ? 'active' : 'suspended'}`}>
                        {action.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button className="veltriz-adminpage-btn" onClick={() => setEditing({ ...action })}>
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

export default CrimeActions;
