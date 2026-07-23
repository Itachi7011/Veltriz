import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, Sparkles, Moon, Sun, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { ThemeContext } from '../../context/ThemeContext';
import { useCharacter } from '../../context/CharacterContext';
import http from '../../lib/httpClient';
import './CharacterCreate.css';

const BACKGROUNDS = [
  {
    key: 'poor',
    label: 'Poor Family',
    price: 'Free',
    desc: 'Start with modest savings. The classic underdog story — everything you build is earned.',
  },
  {
    key: 'middle',
    label: 'Middle-Class Family',
    price: 'Standard start',
    desc: 'A comfortable starting cushion, no big head start on the wealthy.',
  },
  {
    key: 'rich',
    label: 'Rich Family',
    price: 'Premium start',
    desc: 'Start with significant capital. Note: real-money purchases for this aren\u2019t wired up yet — everyone gets the coin bonus for now.',
  },
];

const SKIN_TONES = ['#f1c39a', '#e0ac69', '#c68863', '#8d5524', '#5a3825'];
const OUTFIT_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4'];
const HAIR_COLORS = ['#2b2b2b', '#5a3825', '#7a4a1e', '#c9c9c9', '#8b1e1e'];

const CharacterCreate = () => {
  const { isDarkMode, toggleDarkMode } = useContext(ThemeContext);
  const { createCharacter, hasCharacter, checked } = useCharacter();
  const navigate = useNavigate();

  useEffect(() => {
    if (checked && hasCharacter) {
      navigate('/game', { replace: true });
    }
  }, [checked, hasCharacter, navigate]);

  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);

  const [displayName, setDisplayName] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [background, setBackground] = useState('poor');
  const [appearance, setAppearance] = useState({
    skinTone: SKIN_TONES[0],
    outfitColor: OUTFIT_COLORS[0],
    hairColor: HAIR_COLORS[0],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    http
      .get('/api/world/countries')
      .then(({ data: { countries: list } }) => {
        setCountries(list);
        if (list[0]) {
          setCountry(list[0].code);
          setCity(list[0].cities[0]?.code || '');
        }
      })
      .finally(() => setLoadingCountries(false));
  }, []);

  const selectedCountry = countries.find((c) => c.code === country);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim() || !country || !city) return;

    setIsSubmitting(true);
    try {
      await createCharacter({ displayName: displayName.trim(), country, city, background, appearance });
      navigate('/game');
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Could not create character',
        text: err.response?.data?.message || 'Please try again.',
        background: 'var(--vz-bg-surface)',
        color: 'var(--vz-text-primary)',
        confirmButtonColor: '#7c3aed',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`veltriz-charcreate-shell ${isDarkMode ? 'dark' : 'light'}`}>
      <button
        type="button"
        className="veltriz-charcreate-theme-toggle"
        onClick={toggleDarkMode}
        aria-label="Toggle theme"
      >
        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="veltriz-charcreate-card">
        <div className="veltriz-charcreate-header">
          <Sparkles size={22} />
          <h1>Create your citizen</h1>
        </div>
        <p className="veltriz-charcreate-subtitle">
          This is who you'll live as in Veltriz. Choose carefully — this is your one starting point.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="veltriz-charcreate-field">
            <label className="veltriz-charcreate-label">
              <User size={15} /> Display name
            </label>
            <input
              className="veltriz-charcreate-input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              minLength={2}
              placeholder="How others will see you"
              required
            />
          </div>

          {loadingCountries ? (
            <div className="veltriz-charcreate-loading">
              <Loader2 className="veltriz-spin" size={22} /> Loading world data…
            </div>
          ) : (
            <div className="veltriz-charcreate-row">
              <div className="veltriz-charcreate-field">
                <label className="veltriz-charcreate-label">
                  <MapPin size={15} /> Country
                </label>
                <select
                  className="veltriz-charcreate-select"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    const c = countries.find((cn) => cn.code === e.target.value);
                    setCity(c?.cities[0]?.code || '');
                  }}
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="veltriz-charcreate-field">
                <label className="veltriz-charcreate-label">
                  <MapPin size={15} /> City
                </label>
                <select className="veltriz-charcreate-select" value={city} onChange={(e) => setCity(e.target.value)}>
                  {selectedCountry?.cities.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="veltriz-charcreate-field">
            <label className="veltriz-charcreate-label">Family background</label>
            <div className="veltriz-charcreate-bg-grid">
              {BACKGROUNDS.map((bg) => (
                <button
                  type="button"
                  key={bg.key}
                  className={`veltriz-charcreate-bg-card ${background === bg.key ? 'selected' : ''}`}
                  onClick={() => setBackground(bg.key)}
                >
                  <div className="veltriz-charcreate-bg-label">{bg.label}</div>
                  <div className="veltriz-charcreate-bg-price">{bg.price}</div>
                  <div className="veltriz-charcreate-bg-desc">{bg.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="veltriz-charcreate-field">
            <label className="veltriz-charcreate-label">Appearance</label>
            <div className="veltriz-charcreate-appearance-grid">
              <div>
                <span className="veltriz-charcreate-swatch-label">Skin tone</span>
                <div className="veltriz-charcreate-swatch-row">
                  {SKIN_TONES.map((color) => (
                    <button
                      type="button"
                      key={color}
                      className={`veltriz-charcreate-swatch ${appearance.skinTone === color ? 'selected' : ''}`}
                      style={{ background: color }}
                      onClick={() => setAppearance((a) => ({ ...a, skinTone: color }))}
                      aria-label={`Skin tone ${color}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <span className="veltriz-charcreate-swatch-label">Outfit color</span>
                <div className="veltriz-charcreate-swatch-row">
                  {OUTFIT_COLORS.map((color) => (
                    <button
                      type="button"
                      key={color}
                      className={`veltriz-charcreate-swatch ${appearance.outfitColor === color ? 'selected' : ''}`}
                      style={{ background: color }}
                      onClick={() => setAppearance((a) => ({ ...a, outfitColor: color }))}
                      aria-label={`Outfit color ${color}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <span className="veltriz-charcreate-swatch-label">Hair color</span>
                <div className="veltriz-charcreate-swatch-row">
                  {HAIR_COLORS.map((color) => (
                    <button
                      type="button"
                      key={color}
                      className={`veltriz-charcreate-swatch ${appearance.hairColor === color ? 'selected' : ''}`}
                      style={{ background: color }}
                      onClick={() => setAppearance((a) => ({ ...a, hairColor: color }))}
                      aria-label={`Hair color ${color}`}
                    />
                  ))}
                </div>
              </div>

              {/* Live preview of the simple/blurry avatar */}
              <div className="veltriz-charcreate-preview">
                <div
                  className="veltriz-charcreate-preview-avatar"
                  style={{
                    background: appearance.skinTone,
                    boxShadow: `0 0 0 6px ${appearance.outfitColor}`,
                  }}
                >
                  <div className="veltriz-charcreate-preview-hair" style={{ background: appearance.hairColor }} />
                </div>
                <span className="veltriz-charcreate-swatch-label">Preview</span>
              </div>
            </div>
          </div>

          <button className="veltriz-charcreate-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Entering Veltriz…' : 'Start your life in Veltriz'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CharacterCreate;
