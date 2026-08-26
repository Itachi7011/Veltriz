import React, { useEffect, useState } from 'react';
import { TrendingUp, Coins, Briefcase, Store } from 'lucide-react';
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

const EconomyOverview = () => {
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    http
      .get('/api/economy/overview')
      .then(({ data: res }) => setOverview(res.overview))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <div className="veltriz-adminpage-header">
        <div>
          <h1 className="veltriz-adminpage-title">
            <TrendingUp size={22} /> Economy Overview
          </h1>
          <p className="veltriz-adminpage-subtitle">
            High-level economic health. Use Wallets / Jobs / Market Items to make changes.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <div className="veltriz-adminpage-stat-grid">
          <StatCard
            icon={Coins}
            label="Total coins in circulation"
            value={overview ? Math.round(overview.totalCoinsInCirculation).toLocaleString() : '—'}
          />
          <StatCard
            icon={Coins}
            label="Total Chrono Shards in circulation"
            value={overview ? Math.round(overview.totalChronoShardsInCirculation).toLocaleString() : '—'}
          />
          <StatCard icon={TrendingUp} label="Inflation index" value={overview ? overview.inflationIndex.toFixed(2) : '—'} />
          <StatCard icon={Briefcase} label="Active jobs" value={overview?.activeJobs ?? '—'} />
          <StatCard icon={Store} label="Active market items" value={overview?.activeMarketItems ?? '—'} />
          <StatCard icon={Coins} label="Total wallets" value={overview?.totalWallets ?? '—'} />
        </div>
      )}
    </div>
  );
};

export default EconomyOverview;
