import React, { useEffect, useState } from 'react';
import { X, Globe } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../../lib/httpClient';
import LocationCareers from './LocationCareers';

const RELOCATE_COST = 250; // must match RELOCATE_COST in game-world-service/src/controllers/character.controller.js

const EmbassyPanel = ({ onClose }) => {
  const [countries, setCountries] = useState([]);
  const [character, setCharacter] = useState(null);
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    Promise.all([http.get('/api/world/countries'), http.get('/api/character/me')]).then(
      ([{ data: countryRes }, { data: charRes }]) => {
        setCountries(countryRes.countries);
        setCharacter(charRes.character);
        setCountry(charRes.character.country);
        setCity(charRes.character.city);
      }
    );
  }, []);

  const selectedCountry = countries.find((c) => c.code === country);

  const relocate = async () => {
    setIsBusy(true);
    try {
      const { data: res } = await http.post('/api/character/relocate', { country, city });
      Swal.fire({ icon: 'success', title: res.message, timer: 2200, showConfirmButton: false });
      setCharacter((prev) => ({ ...prev, country, city }));
    } catch (err) {
      if (err.response?.status === 429) {
        Swal.fire({ icon: 'info', title: err.response.data.message });
      } else {
        Swal.fire({ icon: 'error', title: 'Could not relocate', text: err.response?.data?.message });
      }
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>
            <Globe size={20} /> Veltriz Embassy
          </h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {!character ? (
          <p>Loading…</p>
        ) : (
          <>
            <p>
              Update your citizenship record — cosmetic flavor only, doesn't affect gameplay. Costs {RELOCATE_COST}{' '}
              VC in paperwork.
            </p>
            <div style={{ display: 'flex', gap: 10, margin: '14px 0' }}>
              <select
                className="veltriz-game-market-qty"
                style={{ flex: 1 }}
                value={country}
                onChange={(e) => {
                  const c = countries.find((cn) => cn.code === e.target.value);
                  setCountry(e.target.value);
                  setCity(c?.cities[0]?.code || '');
                }}
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select className="veltriz-game-market-qty" style={{ flex: 1 }} value={city} onChange={(e) => setCity(e.target.value)}>
                {selectedCountry?.cities.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              className="veltriz-game-btn primary"
              disabled={isBusy || (country === character.country && city === character.city)}
              onClick={relocate}
            >
              Register ({RELOCATE_COST} VC)
            </button>
          </>
        )}
        <LocationCareers locationType="embassy" />
      </div>
    </div>
  );
};

export default EmbassyPanel;
