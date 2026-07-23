import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, ShieldCheck, Unlock, Coins } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../lib/httpClient';
import '../adminPages.css';

const swalTheme = { background: 'var(--vza-bg-surface)', color: 'var(--vza-text-primary)', confirmButtonColor: '#0ea5e9' };

const UserDetail = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    const { data: res } = await http.get(`/api/users/${id}`);
    setData(res);
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (status) => {
    setBusy(true);
    try {
      await http.post(`/api/users/${id}/status`, { status });
      await load();
      Swal.fire({ icon: 'success', title: `Status set to ${status}`, timer: 1500, showConfirmButton: false, ...swalTheme });
    } finally {
      setBusy(false);
    }
  };

  const unlock = async () => {
    setBusy(true);
    try {
      await http.post(`/api/users/${id}/unlock`);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const adjustWallet = async (direction) => {
    const { value: form } = await Swal.fire({
      title: direction === 'credit' ? 'Credit wallet' : 'Debit wallet',
      html:
        '<input id="swal-amount" class="swal2-input" type="number" placeholder="Amount (VC)">' +
        '<input id="swal-reason" class="swal2-input" placeholder="Reason (shown in ledger)">',
      focusConfirm: false,
      showCancelButton: true,
      ...swalTheme,
      preConfirm: () => {
        const amount = document.getElementById('swal-amount').value;
        const reason = document.getElementById('swal-reason').value;
        if (!amount || !reason) {
          Swal.showValidationMessage('Amount and reason are both required');
          return false;
        }
        return { amount: Number(amount), reason };
      },
    });

    if (!form) return;
    setBusy(true);
    try {
      const endpoint = direction === 'credit' ? 'credit' : 'debit';
      await http.post(`/api/economy/wallets/${data.user._id}/${endpoint}`, form);
      await load();
      Swal.fire({ icon: 'success', title: 'Wallet updated', timer: 1500, showConfirmButton: false, ...swalTheme });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.message, ...swalTheme });
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) return <p>Loading…</p>;
  if (!data) return <p>User not found.</p>;

  const { user, wallet, recentTransactions = [], recentLogs = [] } = data;

  return (
    <div>
      <Link to="/users" className="veltriz-adminpage-btn" style={{ marginBottom: 16, display: 'inline-flex' }}>
        <ArrowLeft size={14} /> Back to players
      </Link>

      <div className="veltriz-adminpage-header">
        <div>
          <h1 className="veltriz-adminpage-title">{user.username}</h1>
          <p className="veltriz-adminpage-subtitle">{user.email}</p>
        </div>
        <span className={`veltriz-adminpage-badge ${user.status}`}>{user.status}</span>
      </div>

      <div className="veltriz-adminpage-stat-grid">
        <div className="veltriz-adminpage-stat-card">
          <div className="veltriz-adminpage-stat-icon">
            <Coins size={20} />
          </div>
          <div className="veltriz-adminpage-stat-value">{wallet ? wallet.balance.toLocaleString() : '—'}</div>
          <div className="veltriz-adminpage-stat-label">Wallet balance (VC){wallet?.isLocked ? ' — LOCKED' : ''}</div>
        </div>
      </div>

      <div className="veltriz-adminpage-card">
        <h3 style={{ marginTop: 0 }}>Moderation actions</h3>
        <div className="veltriz-adminpage-form-row">
          <button className="veltriz-adminpage-btn" disabled={busy} onClick={() => setStatus('active')}>
            <ShieldCheck size={14} /> Set active
          </button>
          <button className="veltriz-adminpage-btn danger" disabled={busy} onClick={() => setStatus('suspended')}>
            <ShieldAlert size={14} /> Suspend
          </button>
          <button className="veltriz-adminpage-btn danger" disabled={busy} onClick={() => setStatus('banned')}>
            <ShieldAlert size={14} /> Ban
          </button>
          <button className="veltriz-adminpage-btn" disabled={busy} onClick={unlock}>
            <Unlock size={14} /> Clear login lockout
          </button>
        </div>

        <h3>Wallet actions</h3>
        <div className="veltriz-adminpage-form-row">
          <button className="veltriz-adminpage-btn primary" disabled={busy || !wallet} onClick={() => adjustWallet('credit')}>
            <Coins size={14} /> Credit wallet
          </button>
          <button className="veltriz-adminpage-btn danger" disabled={busy || !wallet} onClick={() => adjustWallet('debit')}>
            <Coins size={14} /> Debit wallet
          </button>
        </div>
        {!wallet && <p style={{ fontSize: '0.8rem' }}>This player hasn't created a character/wallet yet.</p>}
      </div>

      <div className="veltriz-adminpage-card">
        <h3 style={{ marginTop: 0 }}>Recent transactions</h3>
        <div className="veltriz-adminpage-table-wrap">
          <table className="veltriz-adminpage-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="veltriz-adminpage-empty">
                    No transactions.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr key={tx._id}>
                    <td>{new Date(tx.createdAt).toLocaleString()}</td>
                    <td>{tx.type}</td>
                    <td>{tx.description}</td>
                    <td style={{ color: tx.amount >= 0 ? 'var(--vza-color-success)' : 'var(--vza-color-danger)' }}>
                      {tx.amount >= 0 ? '+' : ''}
                      {tx.amount.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="veltriz-adminpage-card">
        <h3 style={{ marginTop: 0 }}>Recent activity</h3>
        <div className="veltriz-adminpage-table-wrap">
          <table className="veltriz-adminpage-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="veltriz-adminpage-empty">
                    No activity recorded.
                  </td>
                </tr>
              ) : (
                recentLogs.map((l) => (
                  <tr key={l._id}>
                    <td>{new Date(l.createdAt).toLocaleString()}</td>
                    <td>{l.action}</td>
                    <td>{l.ip}</td>
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

export default UserDetail;
