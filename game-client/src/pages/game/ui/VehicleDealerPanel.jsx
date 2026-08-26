import React, { useEffect, useState, useCallback } from 'react';
import { X, Gauge } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';

/**
 * Veltriz's first vehicle system. Unlike Real Estate (one house at a time,
 * fixed pre-placed instances), vehicles are a static catalog with infinite
 * stock and a player can own several at once — a garage/fleet, backed by
 * game-world-service's new /api/marina endpoints (controllers/
 * marina.controller.js). Shared by AutoDock Motors (terrain="land") and
 * Tideline Marina / Open Water Marina (terrain="water") — same component,
 * just a different filter and title, same trick CategoryTradePanel uses
 * for Electronics/Boutique/Jeweler.
 */
const VehicleDealerPanel = ({ onClose, terrain, title, Icon }) => {
  const [catalog, setCatalog] = useState([]);
  const [owned, setOwned] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyKey, setBusyKey] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const [{ data: catalogRes }, { data: ownedRes }] = await Promise.all([
      http.get(`/api/marina/catalog?terrain=${terrain}`),
      http.get('/api/marina/my'),
    ]);
    setCatalog(catalogRes.vehicles);
    setOwned(ownedRes.vehicles);
    setIsLoading(false);
  }, [terrain]);

  useEffect(() => {
    load();
  }, [load]);

  const buy = async (vehicleKey) => {
    setBusyKey(vehicleKey);
    try {
      const { data: res } = await http.post('/api/marina/buy', { vehicleKey });
      Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not buy that', text: err.response?.data?.message });
    } finally {
      setBusyKey(null);
    }
  };

  const sell = async (vehicleId) => {
    setBusyKey(vehicleId);
    try {
      const { data: res } = await http.post('/api/marina/sell', { vehicleId });
      Swal.fire({ icon: 'success', title: res.message, timer: 1800, showConfirmButton: false });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not sell that', text: err.response?.data?.message });
    } finally {
      setBusyKey(null);
    }
  };

  const ownedOfType = (vehicleKey) => owned.filter((v) => v.vehicleKey === vehicleKey);

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
        ) : (
          <div className="veltriz-game-market-list">
            {catalog.map((v) => {
              const mine = ownedOfType(v.key);
              return (
                <div key={v.key} className="veltriz-game-market-card">
                  <div className="veltriz-game-market-info">
                    <div className="veltriz-game-market-name">{v.name}</div>
                    <div className="veltriz-game-market-price">{v.price.toLocaleString()} VC</div>
                    <div className="veltriz-game-market-effects">
                      <span>
                        <Gauge size={11} /> {v.speedMultiplier}x speed
                      </span>
                    </div>
                    <div className="veltriz-game-market-owned">You own: {mine.length}</div>
                  </div>
                  <div className="veltriz-game-market-actions">
                    <button className="veltriz-game-btn primary" disabled={busyKey === v.key} onClick={() => buy(v.key)}>
                      Buy
                    </button>
                    {mine.length > 0 && (
                      <button
                        className="veltriz-game-btn"
                        disabled={busyKey === mine[0]._id}
                        onClick={() => sell(mine[0]._id)}
                      >
                        Sell one
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleDealerPanel;
