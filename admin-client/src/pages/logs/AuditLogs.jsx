import React, { useEffect, useState } from 'react';
import { ScrollText } from 'lucide-react';
import http from '../../lib/httpClient';
import '../adminPages.css';

const AuditLogs = () => {
  const [tab, setTab] = useState('players'); // 'players' | 'admin'
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const endpoint = tab === 'players' ? '/api/logs/players' : '/api/logs/admin';
    http
      .get(endpoint, { params: { page: 1, limit: 40 } })
      .then(({ data: res }) => setLogs(res.logs))
      .finally(() => setIsLoading(false));
  }, [tab]);

  return (
    <div>
      <div className="veltriz-adminpage-header">
        <div>
          <h1 className="veltriz-adminpage-title">
            <ScrollText size={22} /> Audit Logs
          </h1>
          <p className="veltriz-adminpage-subtitle">Security and activity trail.</p>
        </div>
      </div>

      <div className="veltriz-adminpage-form-row">
        <button
          className={`veltriz-adminpage-btn ${tab === 'players' ? 'primary' : ''}`}
          onClick={() => setTab('players')}
        >
          Player activity
        </button>
        <button
          className={`veltriz-adminpage-btn ${tab === 'admin' ? 'primary' : ''}`}
          onClick={() => setTab('admin')}
        >
          Admin actions
        </button>
      </div>

      <div className="veltriz-adminpage-card">
        <div className="veltriz-adminpage-table-wrap">
          <table className="veltriz-adminpage-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>{tab === 'players' ? 'IP' : 'Admin'}</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4}>Loading…</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="veltriz-adminpage-empty">
                    No logs yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.action}</td>
                    <td>{tab === 'players' ? log.ip : log.admin?.username || '—'}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--vza-text-secondary)' }}>
                      {log.meta ? JSON.stringify(log.meta) : '—'}
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

export default AuditLogs;
