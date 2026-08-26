import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Lock, Unlock } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../lib/httpClient';
import '../adminPages.css';

const swalTheme = { background: 'var(--vza-bg-surface)', color: 'var(--vza-text-primary)', confirmButtonColor: '#0ea5e9' };

const Wallets = () => {
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ wallets: [], pagination: {} });
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setIsLoading(true);
    http
      .get('/api/economy/wallets', { params: { page, limit: 25 } })
      .then(({ data: res }) => setData(res))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, [page]);

  const toggleLock = async (wallet) => {
    setBusyId(wallet._id);
    try {
      if (wallet.isLocked) await http.post(`/api/economy/wallets/${wallet.user}/unlock`);
      else await http.post(`/api/economy/wallets/${wallet.user}/lock`);
      load();
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
            <Wallet size={22} /> Wallets
          </h1>
          <p className="veltriz-adminpage-subtitle">
            Full credit/debit controls live on each player's detail page — click a wallet's owner to open it.
          </p>
        </div>
      </div>

      <div className="veltriz-adminpage-card">
        <div className="veltriz-adminpage-table-wrap">
          <table className="veltriz-adminpage-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Balance</th>
                <th>Chrono Shards</th>
                <th>Background</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6}>Loading…</td>
                </tr>
              ) : data.wallets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="veltriz-adminpage-empty">
                    No wallets yet.
                  </td>
                </tr>
              ) : (
                data.wallets.map((w) => (
                  <tr key={w._id}>
                    <td>
                      <Link to={`/users/${w.user}`}>{w.user}</Link>
                    </td>
                    <td>{w.balance.toLocaleString()} VC</td>
                    <td style={{ color: '#a78bfa' }}>{(w.chronoShards || 0).toLocaleString()}</td>
                    <td style={{ textTransform: 'capitalize' }}>{w.background}</td>
                    <td>
                      <span className={`veltriz-adminpage-badge ${w.isLocked ? 'banned' : 'active'}`}>
                        {w.isLocked ? 'Locked' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <button className="veltriz-adminpage-btn" disabled={busyId === w._id} onClick={() => toggleLock(w)}>
                        {w.isLocked ? <Unlock size={14} /> : <Lock size={14} />}
                        {w.isLocked ? 'Unlock' : 'Lock'}
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

export default Wallets;
