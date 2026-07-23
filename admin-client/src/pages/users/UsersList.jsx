import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Users, Search, Eye } from 'lucide-react';
import http from '../../lib/httpClient';
import '../adminPages.css';

const UsersList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || '';
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ users: [], pagination: {} });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    http
      .get('/api/users', { params: { page, limit: 20, search: search || undefined, status: status || undefined } })
      .then(({ data: res }) => setData(res))
      .finally(() => setIsLoading(false));
  }, [page, search, status]);

  return (
    <div>
      <div className="veltriz-adminpage-header">
        <div>
          <h1 className="veltriz-adminpage-title">
            <Users size={22} /> Players
          </h1>
          <p className="veltriz-adminpage-subtitle">{data.pagination.total ?? 0} total accounts</p>
        </div>
      </div>

      <div className="veltriz-adminpage-form-row">
        <div className="veltriz-adminpage-input" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Search size={15} />
          <input
            placeholder="Search username/email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ border: 'none', background: 'none', outline: 'none', color: 'inherit' }}
          />
        </div>
        <select
          className="veltriz-adminpage-select"
          value={status}
          onChange={(e) => {
            setSearchParams(e.target.value ? { status: e.target.value } : {});
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      <div className="veltriz-adminpage-card">
        <div className="veltriz-adminpage-table-wrap">
          <table className="veltriz-adminpage-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Status</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5}>Loading…</td>
                </tr>
              ) : data.users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="veltriz-adminpage-empty">
                    No players found.
                  </td>
                </tr>
              ) : (
                data.users.map((u) => (
                  <tr key={u._id}>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`veltriz-adminpage-badge ${u.status}`}>{u.status}</span>
                    </td>
                    <td>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                    <td>
                      <Link to={`/users/${u._id}`} className="veltriz-adminpage-btn">
                        <Eye size={14} /> View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {data.pagination.totalPages > 1 && (
          <div className="veltriz-adminpage-pagination">
            <button
              className="veltriz-adminpage-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
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

export default UsersList;
