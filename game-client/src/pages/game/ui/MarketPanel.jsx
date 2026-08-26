import React, { useEffect, useState, useCallback } from 'react';
import { X, Store, TrendingUp, TrendingDown, Zap, Smile } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';
import { useEconomySocket } from '../../../context/SocketContext';

const CATEGORY_LABELS = {
  all: 'All',
  commodity: 'Commodities',
  tool: 'Tools',
  luxury: 'Luxury',
  food: 'Food',
  electronics: 'Electronics',
  clothing: 'Clothing',
  medicine: 'Medicine',
};

const MarketPanel = ({ onClose }) => {
  const { latestPrices } = useEconomySocket();
  const [items, setItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [busyKey, setBusyKey] = useState(null);
  const [category, setCategory] = useState('all');

  const load = useCallback(async () => {
    setIsLoading(true);
    const [{ data: marketRes }, { data: invRes }] = await Promise.all([
      http.get('/api/market'),
      http.get('/api/market/inventory'),
    ]);
    setItems(marketRes.items);
    setInventory(invRes.items);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const ownedQty = (key) => inventory.find((i) => i.itemKey === key)?.quantity || 0;
  const qtyFor = (key) => quantities[key] ?? 1;

  const buy = async (item) => {
    setBusyKey(item.key);
    try {
      const { data: res } = await http.post('/api/market/buy', { itemKey: item.key, quantity: qtyFor(item.key) });
      Swal.fire({ icon: 'success', title: res.message, timer: 1500, showConfirmButton: false });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Purchase failed', text: err.response?.data?.message });
    } finally {
      setBusyKey(null);
    }
  };

  const sell = async (item) => {
    setBusyKey(item.key);
    try {
      const { data: res } = await http.post('/api/market/sell', { itemKey: item.key, quantity: qtyFor(item.key) });
      Swal.fire({ icon: 'success', title: res.message, timer: 1500, showConfirmButton: false });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Sale failed', text: err.response?.data?.message });
    } finally {
      setBusyKey(null);
    }
  };

  const use = async (item) => {
    setBusyKey(item.key);
    try {
      const { data: res } = await http.post('/api/market/use', { itemKey: item.key });
      Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false });
      if (res.stats) {
        window.dispatchEvent(new CustomEvent('veltriz:stats-updated', { detail: { stats: res.stats } }));
      }
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not use item', text: err.response?.data?.message });
    } finally {
      setBusyKey(null);
    }
  };

  const categories = ['all', ...new Set(items.map((i) => i.category))];
  const visibleItems = category === 'all' ? items : items.filter((i) => i.category === category);

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel veltriz-game-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>
            <Store size={20} /> Central Market
          </h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <p>Loading market…</p>
        ) : (
          <>
            <div className="veltriz-game-market-tabs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`veltriz-game-market-tab ${category === cat ? 'active' : ''}`}
                  onClick={() => setCategory(cat)}
                >
                  {CATEGORY_LABELS[cat] || cat}
                </button>
              ))}
            </div>

            <div className="veltriz-game-market-list">
              {visibleItems.map((item) => {
                const livePrice = latestPrices[item.key] ?? item.currentPrice;
                const trendUp = livePrice >= item.previousPrice;
                const owned = ownedQty(item.key);
                return (
                  <div key={item.key} className="veltriz-game-market-card">
                    <div className="veltriz-game-market-info">
                      <div className="veltriz-game-market-name">{item.name}</div>
                      <div className="veltriz-game-market-price">
                        {Math.round(livePrice)} VC{' '}
                        {trendUp ? (
                          <TrendingUp size={13} color="#22c55e" />
                        ) : (
                          <TrendingDown size={13} color="#ef4444" />
                        )}
                      </div>
                      <div className="veltriz-game-market-owned">You own: {owned}</div>
                      {item.consumable && (
                        <div className="veltriz-game-market-effects">
                          {item.effectEnergy !== 0 && (
                            <span>
                              <Zap size={11} /> {item.effectEnergy > 0 ? '+' : ''}
                              {item.effectEnergy} energy
                            </span>
                          )}
                          {item.effectHappiness !== 0 && (
                            <span>
                              <Smile size={11} /> {item.effectHappiness > 0 ? '+' : ''}
                              {item.effectHappiness} happiness
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="veltriz-game-market-actions">
                      <input
                        type="number"
                        min={1}
                        className="veltriz-game-market-qty"
                        value={qtyFor(item.key)}
                        onChange={(e) =>
                          setQuantities((q) => ({ ...q, [item.key]: Math.max(1, parseInt(e.target.value, 10) || 1) }))
                        }
                      />
                      <button className="veltriz-game-btn primary" disabled={busyKey === item.key} onClick={() => buy(item)}>
                        Buy
                      </button>
                      <button
                        className="veltriz-game-btn"
                        disabled={busyKey === item.key || owned < 1}
                        onClick={() => sell(item)}
                      >
                        Sell
                      </button>
                      {item.consumable && (
                        <button
                          className="veltriz-game-btn"
                          style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', border: 'none', color: '#fff' }}
                          disabled={busyKey === item.key || owned < 1}
                          onClick={() => use(item)}
                        >
                          Use
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MarketPanel;
