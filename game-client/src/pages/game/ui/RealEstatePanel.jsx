import React, { useEffect, useState, useCallback } from 'react';
import { X, Key, Home } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';
import LocationCareers from './LocationCareers';

const ZONE_LABELS = {
  old_meridian: 'Old Meridian',
  neo_meridian: 'Neo Meridian',
  dustridge_county: 'Dustridge County',
  port_haven: 'Port Haven',
  veltriz_sea: 'The Veltriz Sea',
};

const RealEstatePanel = ({ onClose }) => {
  const [listings, setListings] = useState([]);
  const [myHouses, setMyHouses] = useState([]);
  const [resaleRate, setResaleRate] = useState(0.8);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    const [{ data: listingsRes }, { data: myRes }] = await Promise.all([
      http.get('/api/realestate/listings'),
      http.get('/api/realestate/my'),
    ]);
    setListings(listingsRes.houses);
    setMyHouses(myRes.houses);
    setResaleRate(myRes.resaleRate ?? 0.8);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const buy = async (house) => {
    setBusyId(house.houseId);
    try {
      const { data: res } = await http.post('/api/realestate/buy', { houseId: house.houseId });
      Swal.fire({ icon: 'success', title: res.message, timer: 2200, showConfirmButton: false });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not buy', text: err.response?.data?.message });
    } finally {
      setBusyId(null);
    }
  };

  const sell = async (house) => {
    const confirm = await Swal.fire({
      icon: 'warning',
      title: `Sell ${house.name}?`,
      text: `You'll get ${Math.round(house.price * resaleRate)} VC back (${Math.round(resaleRate * 100)}% of its value).`,
      showCancelButton: true,
      confirmButtonText: 'Sell',
    });
    if (!confirm.isConfirmed) return;

    setBusyId(house.houseId);
    try {
      const { data: res } = await http.post('/api/realestate/sell', { houseId: house.houseId });
      Swal.fire({ icon: 'success', title: res.message, timer: 2200, showConfirmButton: false });
      await load();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Could not sell', text: err.response?.data?.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel veltriz-game-panel-wide" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>
            <Key size={20} /> Veltriz Real Estate
          </h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <p>Loading listings…</p>
        ) : myHouses.length > 0 ? (
          <div className="veltriz-game-market-list">
            <p>
              <Home size={14} style={{ verticalAlign: -2, marginRight: 6 }} />
              You own <strong>{myHouses[0].name}</strong> in {ZONE_LABELS[myHouses[0].zone] || 'Veltriz City'}.
            </p>
            <div className="veltriz-game-market-card">
              <div className="veltriz-game-market-info">
                <div className="veltriz-game-market-name">{myHouses[0].name}</div>
                <div className="veltriz-game-market-price">
                  Sell for {Math.round(myHouses[0].price * resaleRate)} VC
                </div>
              </div>
              <div className="veltriz-game-market-actions">
                <button
                  className="veltriz-game-btn"
                  disabled={busyId === myHouses[0].houseId}
                  onClick={() => sell(myHouses[0])}
                >
                  Sell
                </button>
              </div>
            </div>
            <p style={{ opacity: 0.6, fontSize: '0.8em', marginTop: 8 }}>
              Sell here, then buy a different listing below to move.
            </p>
          </div>
        ) : listings.length === 0 ? (
          <p>No listings available right now — check back later.</p>
        ) : (
          <div className="veltriz-game-market-list">
            {listings.map((house) => (
              <div key={house.houseId} className="veltriz-game-market-card">
                <div className="veltriz-game-market-info">
                  <div className="veltriz-game-market-name">{house.name}</div>
                  <div className="veltriz-game-market-owned">{ZONE_LABELS[house.zone] || 'Veltriz City'}</div>
                  <div className="veltriz-game-market-price">{house.price} VC</div>
                </div>
                <div className="veltriz-game-market-actions">
                  <button
                    className="veltriz-game-btn primary"
                    disabled={busyId === house.houseId}
                    onClick={() => buy(house)}
                  >
                    Buy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <LocationCareers locationType="real_estate" />
      </div>
    </div>
  );
};

export default RealEstatePanel;
