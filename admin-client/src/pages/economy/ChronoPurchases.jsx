import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import http from '../../lib/httpClient';
import '../adminPages.css';

/**
 * The admin equivalent of a payment gateway's transactions dashboard — one
 * row per checkout attempt against the Chrono Store, success OR failure
 * (see economy-service's PaymentTransaction model: a decline is still
 * recorded, never silently dropped). Read-only by design — refunds/voids
 * aren't a real concept yet since nothing here is real money; if that
 * changes when a real provider replaces the sandbox one, this page is
 * where a "Refund" action would go.
 */
const ChronoPurchases = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [data, setData] = useState({ transactions: [], pagination: {} });
  const [isLoading, setIsLoading] = useState(true);

  const load = () => {
    setIsLoading(true);
    http
      .get('/api/economy/payment-transactions', { params: { page, limit: 25, status: status || undefined } })
      .then(({ data: res }) => setData(res))
      .finally(() => setIsLoading(false));
  };

  useEffect(load, [page, status]);

  return (
    <div>
      <div className="veltriz-adminpage-header">
        <div>
          <h1 className="veltriz-adminpage-title">
            <Receipt size={22} /> Chrono Store Purchases
          </h1>
          <p className="veltriz-adminpage-subtitle">
            Every checkout attempt against the sandbox payment provider, across every player. No real money ever
            moves here — see <strong>Chrono Store</strong> to edit what's for sale.
          </p>
        </div>
      </div>

      <div className="veltriz-adminpage-form-row">
        <select
          className="veltriz-adminpage-select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="succeeded">Succeeded</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="veltriz-adminpage-card">
        <div className="veltriz-adminpage-table-wrap">
          <table className="veltriz-adminpage-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Product</th>
                <th>Amount</th>
                <th>Shards granted</th>
                <th>Status</th>
                <th>Provider ref</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7}>Loading…</td>
                </tr>
              ) : data.transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="veltriz-adminpage-empty">
                    No purchases yet.
                  </td>
                </tr>
              ) : (
                data.transactions.map((tx) => (
                  <tr key={tx._id}>
                    <td>
                      <Link to={`/users/${tx.user}`}>{tx.user}</Link>
                    </td>
                    <td>{tx.productKey}</td>
                    <td>${tx.amountUSD.toFixed(2)}</td>
                    <td>{tx.shardsGranted > 0 ? tx.shardsGranted.toLocaleString() : '—'}</td>
                    <td>
                      <span className={`veltriz-adminpage-badge ${tx.status === 'succeeded' ? 'active' : 'banned'}`}>
                        {tx.status}
                      </span>
                      {tx.failureReason && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--vza-text-secondary)', marginTop: 2 }}>
                          {tx.failureReason}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '0.72rem', color: 'var(--vza-text-secondary)' }}>
                      {tx.providerRef || '—'}
                    </td>
                    <td>{new Date(tx.createdAt).toLocaleString()}</td>
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

export default ChronoPurchases;
