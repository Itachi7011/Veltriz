import React, { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';
import LocationCareers from './LocationCareers';

/**
 * Reused by ElectronicsPanel, BoutiquePanel, and JewelerPanel — all three
 * are themed fronts over economy-service's existing /api/market buy+sell
 * flow, filtered to one category. Unlike CategoryShopPanel (Hospital/
 * Restaurant), these categories are NOT consumable (see MarketItem.js) —
 * buying holds the item in inventory as an investment/collectible, there's
 * no "use" action, only buy and sell-back at sellRateMultiplier.
 */
const CategoryTradePanel = ({ onClose, category, locationType, title, Icon, emptyMessage }) => {
  const [items, setItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);
  const [quantities, setQuantities] = useState({});

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
  const qtyFor = (key) => quantities[key] ?? 1;

  const act = async (endpoint, item) => {
    const quantity = qtyFor(item.key);
    setBusyKey(item.key);
    try {
      const { data: res } = await http.post(`/api/market/${endpoint}`, { itemKey: item.key, quantity });
      Swal.fire({ icon: 'success', title: res.message, timer: 1600, showConfirmButton: false });
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
              const qty = qtyFor(item.key);
              return (
                <div key={item.key} className="veltriz-game-market-card">
                  <div className="veltriz-game-market-info">
                    <div className="veltriz-game-market-name">{item.name}</div>
                    <div className="veltriz-game-market-price">{Math.round(item.currentPrice)} VC each</div>
                    <div className="veltriz-game-market-owned">You own: {owned}</div>
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
                          [item.key]: Math.max(1, parseInt(e.target.value, 10) || 1),
                        }))
                      }
                    />
                    <button
                      className="veltriz-game-btn primary"
                      disabled={busyKey === item.key}
                      onClick={() => act('buy', item)}
                    >
                      Buy
                    </button>
                    <button
                      className="veltriz-game-btn"
                      disabled={busyKey === item.key || owned < qty}
                      onClick={() => act('sell', item)}
                    >
                      Sell
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

export default CategoryTradePanel;
