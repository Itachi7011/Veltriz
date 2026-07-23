import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Users, Coins, TrendingUp, Briefcase, Store } from 'lucide-react';
import http from '../../lib/httpClient';
import '../adminPages.css';

const StatCard = ({ icon: Icon, label, value }) => (
  <div className="veltriz-adminpage-stat-card">
    <div className="veltriz-adminpage-stat-icon">
      <Icon size={20} />
    </div>
    <div className="veltriz-adminpage-stat-value">{value}</div>
    <div className="veltriz-adminpage-stat-label">{label}</div>
  </div>
);

const Dashboard = () => {
  const [overview, setOverview] = useState(null);
  const [userCount, setUserCount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([http.get('/api/economy/overview'), http.get('/api/users', { params: { limit: 1 } })])
      .then(([{ data: econ }, { data: users }]) => {
        setOverview(econ.overview);
        setUserCount(users.pagination.total);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <div className="veltriz-adminpage-header">
        <div>
          <h1 className="veltriz-adminpage-title">
            <LayoutDashboard size={22} /> Dashboard
          </h1>
          <p className="veltriz-adminpage-subtitle">Live overview of the Veltriz economy and player base.</p>
        </div>
      </div>

      {isLoading ? (
        <p>Loading overview…</p>
      ) : (
        <>
          <div className="veltriz-adminpage-stat-grid">
            <StatCard icon={Users} label="Total players" value={userCount?.toLocaleString() ?? '—'} />
            <StatCard
              icon={Coins}
              label="Total coins in circulation"
              value={overview ? Math.round(overview.totalCoinsInCirculation).toLocaleString() : '—'}
            />
            <StatCard
              icon={TrendingUp}
              label="Inflation index"
              value={overview ? overview.inflationIndex.toFixed(2) : '—'}
            />
            <StatCard icon={Briefcase} label="Active jobs" value={overview?.activeJobs ?? '—'} />
            <StatCard icon={Store} label="Active market items" value={overview?.activeMarketItems ?? '—'} />
          </div>

          {overview?.externalReferenceRates?.USD_INR && (
            <div className="veltriz-adminpage-card">
              <h3 style={{ marginTop: 0 }}>External reference (informational only)</h3>
              <p style={{ marginBottom: 0 }}>
                USD → INR: <strong>{overview.externalReferenceRates.USD_INR}</strong> (fetched{' '}
                {new Date(overview.externalReferenceRates.fetchedAt).toLocaleString()}). This does not
                auto-change any in-game price — use Market Items to move prices deliberately.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
