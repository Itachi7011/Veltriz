import React, { useEffect, useState } from 'react';
import { X, Wallet, Landmark, Flame, Newspaper } from 'lucide-react';
import http from '../../../lib/httpClient';

/**
 * A simple phone UI — not a full messaging system (that's a much larger
 * feature on its own), but a real one: it shows your actual wallet
 * balance, the actual government/election status, and your actual crime
 * heat, pulled from the same APIs the rest of the game already uses.
 */
const PhoneUI = ({ onClose }) => {
  const [tab, setTab] = useState('wallet');
  const [wallet, setWallet] = useState(null);
  const [gov, setGov] = useState(null);
  const [crime, setCrime] = useState(null);
  const [market, setMarket] = useState([]);

  useEffect(() => {
    http.get('/api/wallet/me').then(({ data }) => setWallet(data.wallet)).catch(() => {});
    http.get('/api/government/me').then(({ data }) => setGov(data)).catch(() => {});
    http.get('/api/crime/me').then(({ data }) => setCrime(data)).catch(() => {});
    http.get('/api/market').then(({ data }) => setMarket((data.items || []).filter((i) => i.category === 'stock').slice(0, 4))).catch(() => {});
  }, []);

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-phone" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-phone-header">
          <span>Veltriz Phone</span>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close phone (P)">
            <X size={18} />
          </button>
        </div>

        <div className="veltriz-phone-screen">
          {tab === 'wallet' && (
            <div>
              <h3>Wallet</h3>
              {wallet ? (
                <>
                  <div className="veltriz-phone-stat">${wallet.balance?.toLocaleString()}</div>
                  <div className="veltriz-phone-substat">{wallet.chronoShards ?? 0} Chrono Shards</div>
                </>
              ) : (
                <div className="veltriz-phone-substat">Loading…</div>
              )}
            </div>
          )}

          {tab === 'gov' && (
            <div>
              <h3>City Hall</h3>
              {gov?.government?.mayorName ? (
                <div className="veltriz-phone-substat">Mayor {gov.government.mayorName} · Term {gov.government.termNumber}</div>
              ) : (
                <div className="veltriz-phone-substat">Office vacant</div>
              )}
              {gov?.election?.candidates?.length > 0 && (
                <ul className="veltriz-phone-list">
                  {gov.election.candidates.map((c) => (
                    <li key={c.userId || c.displayName}>{c.displayName}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === 'crime' && (
            <div>
              <h3>Heat</h3>
              {crime ? (
                <>
                  <div className="veltriz-phone-stat" style={{ color: crime.isDangerous ? '#ef4444' : '#f59e0b' }}>
                    {crime.heat}/100
                  </div>
                  <div className="veltriz-phone-substat">{crime.totalSuccesses}/{crime.totalAttempts} successful jobs</div>
                </>
              ) : (
                <div className="veltriz-phone-substat">Loading…</div>
              )}
            </div>
          )}

          {tab === 'news' && (
            <div>
              <h3>Market Watch</h3>
              <ul className="veltriz-phone-list">
                {market.map((m) => (
                  <li key={m.key}>
                    {m.name}: ${m.currentPrice.toLocaleString()}{' '}
                    <span style={{ color: m.currentPrice >= m.previousPrice ? '#4ade80' : '#f87171' }}>
                      {m.currentPrice >= m.previousPrice ? '▲' : '▼'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="veltriz-phone-tabs">
          <button className={tab === 'wallet' ? 'active' : ''} onClick={() => setTab('wallet')}>
            <Wallet size={16} />
          </button>
          <button className={tab === 'gov' ? 'active' : ''} onClick={() => setTab('gov')}>
            <Landmark size={16} />
          </button>
          <button className={tab === 'crime' ? 'active' : ''} onClick={() => setTab('crime')}>
            <Flame size={16} />
          </button>
          <button className={tab === 'news' ? 'active' : ''} onClick={() => setTab('news')}>
            <Newspaper size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhoneUI;
