import React, { useEffect, useState, useCallback } from 'react';
import { X, TrendingUp, TrendingDown, LineChart } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';
import { useEconomySocket } from '../../../context/SocketContext';
import LocationCareers from './LocationCareers';

/**
 * "Stock" is just another MarketItem category — same buy/sell endpoints,
 * same live price-drift engine (see economy-service/src/cron/priceEngine.js)
 * that already ticks commodity prices, and the same real-time socket feed
 * MarketPanel uses. What makes it feel like a real market: shares are
 * seeded with much higher volatilityPercent than commodities, and a
 * sellRateMultiplier near 1 (trade at live price, no pawn-shop spread) —
 * see economy-service's seed file.
 */
const StockExchangePanel = ({ onClose }) => {
  const { latestPrices } = useEconomySocket();
  const [shares, setShares] = useState([]);
  const [holdings, setHoldings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);
  const [quantities, setQuantities] = useState({});

  const load = useCallback(async () => {
    setIsLoading(true);
    const [{ data: marketRes }, { data: invRes }] = await Promise.all([
      http.get('/api/market'),
      http.get('/api/market/inventory'),
    ]);
    setShares(marketRes.items.filter((i) => i.category === 'stock'));
    setHoldings(invRes.items);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const heldQty = (key) => holdings.find((i) => i.itemKey === key)?.quantity || 0;
  const qtyFor = (key) => quantities[key] ?? 1;

  const trade = async (endpoint, item) => {
    const quantity = qtyFor(item.key);
    setBusyKey(item.key);
    try {
      const { data: res } = await http.post(`/api/market/${endpoint}`, { itemKey: item.key, quantity });
      Swal.fire({ icon: 'success', title: res.message, timer: 1500, showConfirmButton: false });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Trade failed', text: err.response?.data?.message });
    } finally {
      setBusyKey(null);
    }
  };

  const portfolioValue = shares.reduce((sum, s) => {
    const price = latestPrices[s.key] ?? s.currentPrice;
    return sum + price * heldQty(s.key);
  }, 0);

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel veltriz-game-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>
            <LineChart size={20} /> Veltriz Stock Exchange
          </h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <p>Loading shares…</p>
        ) : (
          <>
            <p style={{ opacity: 0.7, fontSize: '0.85em', marginBottom: 12 }}>
              Prices move in real time. Your portfolio right now: <strong>{Math.round(portfolioValue)} VC</strong>.
            </p>

            <div className="veltriz-game-market-list">
              {shares.map((share) => {
                const livePrice = latestPrices[share.key] ?? share.currentPrice;
                const trendUp = livePrice >= share.previousPrice;
                const held = heldQty(share.key);
                const qty = qtyFor(share.key);
                return (
                  <div key={share.key} className="veltriz-game-market-card">
                    <div className="veltriz-game-market-info">
                      <div className="veltriz-game-market-name">{share.name}</div>
                      <div className="veltriz-game-market-price">
                        {Math.round(livePrice)} VC{' '}
                        {trendUp ? (
                          <TrendingUp size={13} color="#22c55e" />
                        ) : (
                          <TrendingDown size={13} color="#ef4444" />
                        )}
                      </div>
                      <div className="veltriz-game-market-owned">
                        You hold: {held} share{held === 1 ? '' : 's'}
                        {held > 0 && ` (~${Math.round(livePrice * held)} VC)`}
                      </div>
                    </div>
                    <div className="veltriz-game-market-actions">
                      <input
                        type="number"
                        min={1}
                        className="veltriz-game-market-qty"
                        value={qty}
                        onChange={(e) =>
                          setQuantities((q) => ({
                            ...q,
                            [share.key]: Math.max(1, parseInt(e.target.value, 10) || 1),
                          }))
                        }
                      />
                      <button
                        className="veltriz-game-btn primary"
                        disabled={busyKey === share.key}
                        onClick={() => trade('buy', share)}
                      >
                        Buy
                      </button>
                      <button
                        className="veltriz-game-btn"
                        disabled={busyKey === share.key || held < qty}
                        onClick={() => trade('sell', share)}
                      >
                        Sell
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        <LocationCareers locationType="stock_exchange" />
      </div>
    </div>
  );
};

export default StockExchangePanel;
