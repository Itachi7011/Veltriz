import React, { useEffect, useState } from 'react';
import { X, Landmark, ArrowUpRight, ArrowDownRight, Gem } from 'lucide-react';
import http from '../../../lib/httpClient';

const WalletPanel = ({ onClose }) => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [shardTransactions, setShardTransactions] = useState([]);
  const [tab, setTab] = useState('vc'); // 'vc' | 'shards'
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      http.get('/api/wallet/me'),
      http.get('/api/wallet/transactions', { params: { page: 1, limit: 15 } }),
      http.get('/api/wallet/shard-transactions', { params: { page: 1, limit: 15 } }),
    ]).then(([{ data: walletRes }, { data: txRes }, { data: shardTxRes }]) => {
      setWallet(walletRes.wallet);
      setTransactions(txRes.transactions);
      setShardTransactions(shardTxRes.transactions);
      setIsLoading(false);
    });
  }, []);

  const activeTransactions = tab === 'vc' ? transactions : shardTransactions;
  const unit = tab === 'vc' ? 'VC' : 'CS';

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel veltriz-game-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>
            <Landmark size={20} /> Veltriz National Bank
          </h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <p>Loading account…</p>
        ) : (
          <>
            <div className="veltriz-game-wallet-balance">
              <span>Current balance</span>
              <strong>{wallet.balance.toLocaleString()} VC</strong>
            </div>

            <div className="veltriz-game-wallet-balance" style={{ marginTop: 4 }}>
              <span>
                <Gem size={12} style={{ verticalAlign: '-1px' }} /> Chrono Shards
              </span>
              <strong style={{ color: '#c4b5fd' }}>{(wallet.chronoShards || 0).toLocaleString()}</strong>
            </div>
            <p style={{ fontSize: '0.72rem', color: '#6b7094', margin: '2px 0 10px' }}>
              A separate, smaller balance used to skip a job shift's wait or clear a crime cooldown early — earned
              a little at a time through play, or topped up at the Chrono Store.
            </p>

            <h3 className="veltriz-game-wallet-subheading" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              Recent transactions
              <span style={{ display: 'inline-flex', gap: 4, marginLeft: 'auto' }}>
                <button
                  className="veltriz-game-btn"
                  style={{ padding: '3px 10px', fontSize: '0.72rem', opacity: tab === 'vc' ? 1 : 0.55 }}
                  onClick={() => setTab('vc')}
                >
                  VC
                </button>
                <button
                  className="veltriz-game-btn"
                  style={{ padding: '3px 10px', fontSize: '0.72rem', opacity: tab === 'shards' ? 1 : 0.55 }}
                  onClick={() => setTab('shards')}
                >
                  Shards
                </button>
              </span>
            </h3>
            <div className="veltriz-game-tx-list">
              {activeTransactions.length === 0 && <p>No transactions yet.</p>}
              {activeTransactions.map((tx) => (
                <div key={tx._id} className="veltriz-game-tx-row">
                  <div className="veltriz-game-tx-icon">
                    {tx.amount >= 0 ? (
                      <ArrowUpRight size={16} color="#22c55e" />
                    ) : (
                      <ArrowDownRight size={16} color="#ef4444" />
                    )}
                  </div>
                  <div className="veltriz-game-tx-desc">
                    <div>{tx.description || tx.type}</div>
                    <div className="veltriz-game-tx-date">{new Date(tx.createdAt).toLocaleString()}</div>
                  </div>
                  <div className={`veltriz-game-tx-amount ${tx.amount >= 0 ? 'positive' : 'negative'}`}>
                    {tx.amount >= 0 ? '+' : ''}
                    {tx.amount.toLocaleString()} {unit}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WalletPanel;
