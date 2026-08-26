import React, { useEffect, useState } from 'react';
import { Bot, Coins, Briefcase, ShoppingBag, Users } from 'lucide-react';
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

const Population = () => {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    http
      .get('/api/simulation/npcs/summary')
      .then(({ data }) => setSummary(data.summary))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <div className="veltriz-adminpage-header">
        <div>
          <h1 className="veltriz-adminpage-title">
            <Bot size={22} /> Population (NPCs)
          </h1>
          <p className="veltriz-adminpage-subtitle">
            Simulated AI citizens who work jobs and make purchases to keep the economy feeling
            alive even with few players online.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <>
          <div className="veltriz-adminpage-stat-grid">
            <StatCard icon={Users} label="Total NPCs" value={summary?.totalNpcs ?? '—'} />
            <StatCard icon={Briefcase} label="Employed NPCs" value={summary?.employedNpcs ?? '—'} />
            <StatCard
              icon={Coins}
              label="Total simulated wealth"
              value={summary ? Math.round(summary.totalSimulatedWealth).toLocaleString() : '—'}
            />
            <StatCard icon={Briefcase} label="Total shifts worked" value={summary?.totalShiftsWorked ?? '—'} />
            <StatCard icon={ShoppingBag} label="Total purchases made" value={summary?.totalPurchases ?? '—'} />
          </div>

          <div className="veltriz-adminpage-card">
            <h3 style={{ marginTop: 0 }}>Why you can't see individual NPCs here</h3>
            <p style={{ marginBottom: 0 }}>
              NPCs hold their own simulated wealth in simulation-service — they're intentionally{' '}
              <strong>not</strong> rows in the real player Wallet/Employment collections (see
              simulation-service's README for the full reasoning). This page shows aggregate
              population health rather than a per-NPC management table, since there's no
              individual moderation action to take on a simulated citizen the way there is for a
              real player account.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default Population;
