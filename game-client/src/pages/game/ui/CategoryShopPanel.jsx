import React, { useEffect, useState, useCallback } from 'react';
import { X, Zap, Smile } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';
import LocationCareers from './LocationCareers';

/**
 * Reused by HospitalPanel (category="medicine") and RestaurantPanel
 * (category="food"). Both are themed fronts over economy-service's existing
 * /api/market buy+use flow — no new backend for either; Hospital "healing"
 * and Restaurant "food" are just the medicine/food catalog that already
 * exists, filtered and re-skinned. See MarketPanel.jsx for the same flow
 * unfiltered, across every category.
 */
const CategoryShopPanel = ({ onClose, category, locationType, title, Icon, emptyMessage }) => {
  const [items, setItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const [{ data: marketRes }, { data: invRes }] = await Promise.all([
      http.get('/api/market'),
      http.get('/api/market/inventory'),
    ]);
    setItems(marketRes.items.filter((i) => i.category === category));
    setInventory(invRes.items);
    setIsLoading(false);
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  const ownedQty = (key) => inventory.find((i) => i.itemKey === key)?.quantity || 0;

  const buyAndUse = async (item) => {
    setBusyKey(item.key);
    try {
      await http.post('/api/market/buy', { itemKey: item.key, quantity: 1 });
      const { data: res } = await http.post('/api/market/use', { itemKey: item.key });
      Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false });
      if (res.stats) {
        window.dispatchEvent(new CustomEvent('veltriz:stats-updated', { detail: { stats: res.stats } }));
      }
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not do that', text: err.response?.data?.message });
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel veltriz-game-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>
            <Icon size={20} /> {title}
          </h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <p>Loading…</p>
        ) : items.length === 0 ? (
          <p>{emptyMessage}</p>
        ) : (
          <div className="veltriz-game-market-list">
            {items.map((item) => {
              const owned = ownedQty(item.key);
              return (
                <div key={item.key} className="veltriz-game-market-card">
                  <div className="veltriz-game-market-info">
                    <div className="veltriz-game-market-name">{item.name}</div>
                    <div className="veltriz-game-market-price">{Math.round(item.currentPrice)} VC</div>
                    <div className="veltriz-game-market-owned">You own: {owned}</div>
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
                  </div>
                  <div className="veltriz-game-market-actions">
                    <button
                      className="veltriz-game-btn primary"
                      disabled={busyKey === item.key}
                      onClick={() => buyAndUse(item)}
                    >
                      {Math.round(item.currentPrice)} VC — Use
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {locationType && <LocationCareers locationType={locationType} />}
      </div>
    </div>
  );
};

export default CategoryShopPanel;
