import React, { useEffect, useState, useCallback } from 'react';
import { Zap, Plus, RotateCcw } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../lib/httpClient';
import '../adminPages.css';

const swalTheme = { background: 'var(--vza-bg-surface)', color: 'var(--vza-text-primary)', confirmButtonColor: '#0ea5e9' };
const EVENT_TYPES = ['shortage', 'boom', 'crisis', 'bonus'];

const emptyForm = { type: 'shortage', targetItemKey: '', multiplier: '', durationMinutes: 60, title: '', description: '' };

const statusClass = (status) => {
  if (status === 'active') return 'active';
  if (status === 'scheduled') return 'suspended';
  if (status === 'failed') return 'banned';
  return ''; // reverted - no special color
};

const WorldEvents = () => {
  const [events, setEvents] = useState([]);
  const [marketItems, setMarketItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    const [{ data: eventsRes }, { data: itemsRes }] = await Promise.all([
      http.get('/api/simulation/events', { params: statusFilter ? { status: statusFilter } : {} }),
      http.get('/api/economy/market-items'),
    ]);
    setEvents(eventsRes.events);
    setMarketItems(itemsRes.items);
    setIsLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const triggerEvent = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = {
        type: form.type,
        targetItemKey: form.targetItemKey,
        durationMinutes: Number(form.durationMinutes),
        ...(form.multiplier ? { multiplier: Number(form.multiplier) } : {}),
        ...(form.title ? { title: form.title } : {}),
        ...(form.description ? { description: form.description } : {}),
      };
      await http.post('/api/simulation/events', payload);
      setForm(emptyForm);
      setShowForm(false);
      await load();
      Swal.fire({ icon: 'success', title: 'Event triggered', text: 'Applied immediately and broadcast to all players.', timer: 2200, showConfirmButton: false, ...swalTheme });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not trigger event', text: err.response?.data?.message, ...swalTheme });
    } finally {
      setBusy(false);
    }
  };

  const revertNow = async (event) => {
    setBusy(true);
    try {
      await http.post(`/api/simulation/events/${event._id}/revert`);
      await load();
      Swal.fire({ icon: 'success', title: 'Event reverted', timer: 1500, showConfirmButton: false, ...swalTheme });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not revert', text: err.response?.data?.message, ...swalTheme });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="veltriz-adminpage-header">
        <div>
          <h1 className="veltriz-adminpage-title">
            <Zap size={22} /> World Events
          </h1>
          <p className="veltriz-adminpage-subtitle">
            Shortages/booms/crises/bonuses that move a market item's price immediately and
            auto-revert after a set duration. Random events also fire on their own — see the
            simulation-service README for the probability.
          </p>
        </div>
        <button className="veltriz-adminpage-btn primary" onClick={() => setShowForm((s) => !s)}>
          <Plus size={15} /> Trigger event
        </button>
      </div>

      {showForm && (
        <form className="veltriz-adminpage-card" onSubmit={triggerEvent}>
          <div className="veltriz-adminpage-form-row">
            <select
              className="veltriz-adminpage-select"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t[0].toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>

            <select
              className="veltriz-adminpage-select"
              value={form.targetItemKey}
              onChange={(e) => setForm((f) => ({ ...f, targetItemKey: e.target.value }))}
              required
            >
              <option value="" disabled>
                Select item…
              </option>
              {marketItems.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.name} ({Math.round(item.currentPrice)} VC)
                </option>
              ))}
            </select>

            <input
              className="veltriz-adminpage-input"
              type="number"
              step="0.05"
              placeholder="Multiplier (optional, e.g. 1.3)"
              value={form.multiplier}
              onChange={(e) => setForm((f) => ({ ...f, multiplier: e.target.value }))}
            />

            <input
              className="veltriz-adminpage-input"
              type="number"
              placeholder="Duration (minutes)"
              value={form.durationMinutes}
              onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
              required
            />
          </div>

          <div className="veltriz-adminpage-form-row">
            <input
              className="veltriz-adminpage-input"
              style={{ flex: 1 }}
              placeholder="Title (optional — auto-generated if left blank)"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="veltriz-adminpage-form-row">
            <button className="veltriz-adminpage-btn primary" type="submit" disabled={busy || !form.targetItemKey}>
              <Zap size={14} /> {busy ? 'Applying…' : 'Apply immediately'}
            </button>
            <button type="button" className="veltriz-adminpage-btn" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="veltriz-adminpage-form-row">
        <select className="veltriz-adminpage-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="scheduled">Scheduled</option>
          <option value="reverted">Reverted</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="veltriz-adminpage-card">
        <div className="veltriz-adminpage-table-wrap">
          <table className="veltriz-adminpage-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Item</th>
                <th>Multiplier</th>
                <th>Status</th>
                <th>Source</th>
                <th>Ends</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8}>Loading…</td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={8} className="veltriz-adminpage-empty">
                    No events yet.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev._id}>
                    <td>{ev.title}</td>
                    <td style={{ textTransform: 'capitalize' }}>{ev.type}</td>
                    <td>{ev.targetItemKey}</td>
                    <td>{ev.multiplier}x</td>
                    <td>
                      <span className={`veltriz-adminpage-badge ${statusClass(ev.status)}`}>{ev.status}</span>
                    </td>
                    <td style={{ textTransform: 'capitalize' }}>{ev.source}</td>
                    <td>{ev.endAt ? new Date(ev.endAt).toLocaleString() : '—'}</td>
                    <td>
                      {ev.status === 'active' && (
                        <button className="veltriz-adminpage-btn danger" disabled={busy} onClick={() => revertNow(ev)}>
                          <RotateCcw size={14} /> Revert now
                        </button>
                      )}
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

export default WorldEvents;
