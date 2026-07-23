import React, { useEffect, useState } from 'react';
import { X, Landmark, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import http from '../../../lib/httpClient';

const WalletPanel = ({ onClose }) => {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([http.get('/api/wallet/me'), http.get('/api/wallet/transactions', { params: { page: 1, limit: 15 } })]).then(
      ([{ data: walletRes }, { data: txRes }]) => {
        setWallet(walletRes.wallet);
        setTransactions(txRes.transactions);
        setIsLoading(false);
      }
    );
  }, []);

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

            <h3 className="veltriz-game-wallet-subheading">Recent transactions</h3>
            <div className="veltriz-game-tx-list">
              {transactions.length === 0 && <p>No transactions yet.</p>}
              {transactions.map((tx) => (
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
                    {tx.amount.toLocaleString()} VC
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
