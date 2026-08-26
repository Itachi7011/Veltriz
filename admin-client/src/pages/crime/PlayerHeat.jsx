import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, RotateCcw } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../lib/httpClient';
import '../adminPages.css';

const swalTheme = { background: 'var(--vza-bg-surface)', color: 'var(--vza-text-primary)', confirmButtonColor: '#0ea5e9' };

const PlayerHeat = () => {
  const [page, setPage] = useState(1);
  const [minHeat, setMinHeat] = useState('');
  const [data, setData] = useState({ records: [], pagination: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setIsLoading(true);
    http
      .get('/api/crime-control/heat', { params: { page, limit: 25, minHeat: minHeat || undefined } })
      .then(({ data: res }) => setData(res))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, [page, minHeat]);

  const reset = async (record) => {
    setBusyId(record._id);
    try {
      await http.post(`/api/crime-control/heat/${record.user}/reset`);
      load();
      Swal.fire({ icon: 'success', title: 'Heat reset', timer: 1400, showConfirmButton: false, ...swalTheme });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.message, ...swalTheme });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="veltriz-adminpage-header">
        <div>
          <h1 className="veltriz-adminpage-title">
            <Flame size={22} /> Player Heat
          </h1>
          <p className="veltriz-adminpage-subtitle">Sorted highest heat first — the players most likely to get caught right now.</p>
        </div>
      </div>

      <div className="veltriz-adminpage-form-row">
        <select
          className="veltriz-adminpage-select"
          value={minHeat}
          onChange={(e) => {
            setMinHeat(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All heat levels</option>
          <option value="70">70+ (dangerous)</option>
          <option value="40">40+</option>
          <option value="1">Any heat &gt; 0</option>
        </select>
      </div>

      <div className="veltriz-adminpage-card">
        <div className="veltriz-adminpage-table-wrap">
          <table className="veltriz-adminpage-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Heat</th>
                <th>Attempts</th>
                <th>Successes</th>
                <th>Total earned</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6}>Loading…</td>
                </tr>
              ) : data.records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="veltriz-adminpage-empty">
                    No crime activity yet.
                  </td>
                </tr>
              ) : (
                data.records.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <Link to={`/users/${r.user}`}>{r.user}</Link>
                    </td>
                    <td>
                      <span className={`veltriz-adminpage-badge ${r.heat >= 70 ? 'banned' : r.heat >= 40 ? 'suspended' : 'active'}`}>
                        {Math.round(r.heat)}
                      </span>
                    </td>
                    <td>{r.totalAttempts}</td>
                    <td>{r.totalSuccesses}</td>
                    <td>{r.totalEarned.toLocaleString()} VC</td>
                    <td>
                      <button className="veltriz-adminpage-btn" disabled={busyId === r._id || r.heat === 0} onClick={() => reset(r)}>
                        <RotateCcw size={14} /> Reset heat
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data.pagination.totalPages > 1 && (
          <div className="veltriz-adminpage-pagination">
            <button className="veltriz-adminpage-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Prev
            </button>
            <span>
              Page {data.pagination.page} of {data.pagination.totalPages}
            </span>
            <button
              className="veltriz-adminpage-btn"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerHeat;
