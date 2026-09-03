import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, Sparkles, Moon, Sun, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { ThemeContext } from '../../context/ThemeContext';
import { useCharacter } from '../../context/CharacterContext';
import http from '../../lib/httpClient';
import CharacterPreview3D from './CharacterPreview3D';
import { SKIN_TONES, OUTFIT_COLORS, HAIR_COLORS, HAIR_STYLES, FACE_ARCHETYPES, FACE_ARCHETYPE_LABELS } from '../game/engine/CharacterModel';
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

const HAIR_STYLE_LABELS = {
  short: 'Short',
  buzz: 'Buzz cut',
  long: 'Long',
  ponytail: 'Ponytail',
  bald: 'Bald',
};

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
    gender: 'male',
    skinTone: SKIN_TONES[0],
    outfitColor: OUTFIT_COLORS[0],
    hairColor: HAIR_COLORS[0],
    hairStyle: 'short',
    faceType: FACE_ARCHETYPES[0],
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
            <div className="veltriz-charcreate-appearance-layout">
              <div className="veltriz-charcreate-preview">
                <CharacterPreview3D appearance={appearance} />
                <span className="veltriz-charcreate-swatch-label">Drag not needed — auto-rotates</span>
              </div>

              <div className="veltriz-charcreate-appearance-grid">
                <div>
                  <span className="veltriz-charcreate-swatch-label">Gender</span>
                  <div className="veltriz-charcreate-option-row">
                    {['male', 'female'].map((g) => (
                      <button
                        type="button"
                        key={g}
                        className={`veltriz-charcreate-option ${appearance.gender === g ? 'selected' : ''}`}
                        onClick={() =>
                          setAppearance((a) => ({
                            ...a,
                            gender: g,
                            hairStyle: a.hairStyle === 'short' && g === 'female' ? 'long' : a.hairStyle,
                          }))
                        }
                      >
                        {g === 'male' ? 'Male' : 'Female'}
                      </button>
                    ))}
                  </div>
                </div>

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
                  <span className="veltriz-charcreate-swatch-label">Face shape</span>
                  <div className="veltriz-charcreate-option-row">
                    {FACE_ARCHETYPES.map((type) => (
                      <button
                        type="button"
                        key={type}
                        className={`veltriz-charcreate-option ${appearance.faceType === type ? 'selected' : ''}`}
                        onClick={() => setAppearance((a) => ({ ...a, faceType: type }))}
                      >
                        {FACE_ARCHETYPE_LABELS[type]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="veltriz-charcreate-swatch-label">Hairstyle</span>
                  <div className="veltriz-charcreate-option-row">
                    {HAIR_STYLES.map((style) => (
                      <button
                        type="button"
                        key={style}
                        className={`veltriz-charcreate-option ${appearance.hairStyle === style ? 'selected' : ''}`}
                        onClick={() => setAppearance((a) => ({ ...a, hairStyle: style }))}
                      >
                        {HAIR_STYLE_LABELS[style]}
                      </button>
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
