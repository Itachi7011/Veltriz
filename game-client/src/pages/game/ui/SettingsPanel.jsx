import React, { useState } from 'react';
import { X, Settings as SettingsIcon, Volume2, Mouse, Monitor, Gauge } from 'lucide-react';
import gameEvents from '../gameEvents';
import { loadStoredSettings } from '../engine/GameEngine';

const QUALITY_OPTIONS = [
  { key: 'low', label: 'Low', hint: 'Best performance — shorter view distance, no shadows' },
  { key: 'medium', label: 'Medium', hint: 'Balanced — the default' },
  { key: 'hd', label: 'HD', hint: 'Best visuals — longer view distance, sharper shadows' },
];

const DEFAULTS = {
  graphicsQuality: 'medium',
  masterVolume: 0.8,
  musicVolume: 0.14,
  sfxVolume: 0.5,
  mouseSensitivity: 0.0024,
  invertY: false,
  showFps: false,
};

/**
 * Reads current settings once on open (from whatever's already been
 * saved/applied — see GameEngine's loadStoredSettings/applySettings),
 * and pushes every change live via the 'settings:update' event, the same
 * decoupled pattern the pause menu's mute button already used, rather
 * than needing a direct reference to the running GameEngine instance.
 */
const SettingsPanel = ({ onClose }) => {
  const [settings, setSettings] = useState(() => ({ ...DEFAULTS, ...loadStoredSettings() }));

  const update = (patch) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    gameEvents.emit('settings:update', patch);
  };

  // Mouse sensitivity is stored as a small raw radians-per-pixel value
  // (0.0024 default) — not a friendly number to put on a slider, so the
  // UI works in a 1-10 "feel" scale and maps it internally.
  const sensitivityToSlider = (v) => Math.round((v / 0.0024) * 5);
  const sliderToSensitivity = (v) => (v / 5) * 0.0024;

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel veltriz-game-panel-wide veltriz-settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>
            <SettingsIcon size={20} /> Settings
          </h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <section className="veltriz-settings-section">
          <h3>
            <Monitor size={15} /> Graphics quality
          </h3>
          <div className="veltriz-settings-quality-row">
            {QUALITY_OPTIONS.map((q) => (
              <button
                key={q.key}
                type="button"
                className={`veltriz-settings-quality-btn ${settings.graphicsQuality === q.key ? 'selected' : ''}`}
                onClick={() => update({ graphicsQuality: q.key })}
                title={q.hint}
              >
                {q.label}
              </button>
            ))}
          </div>
          <p className="veltriz-settings-hint">{QUALITY_OPTIONS.find((q) => q.key === settings.graphicsQuality)?.hint}</p>
        </section>

        <section className="veltriz-settings-section">
          <h3>
            <Volume2 size={15} /> Audio
          </h3>
          <label className="veltriz-settings-slider-row">
            <span>Master volume</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(settings.masterVolume * 100)}
              onChange={(e) => update({ masterVolume: Number(e.target.value) / 100 })}
            />
            <span className="veltriz-settings-slider-value">{Math.round(settings.masterVolume * 100)}%</span>
          </label>
          <label className="veltriz-settings-slider-row">
            <span>Music volume</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round((settings.musicVolume / 0.35) * 100)}
              onChange={(e) => update({ musicVolume: (Number(e.target.value) / 100) * 0.35 })}
            />
            <span className="veltriz-settings-slider-value">{Math.round((settings.musicVolume / 0.35) * 100)}%</span>
          </label>
          <label className="veltriz-settings-slider-row">
            <span>SFX volume</span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(settings.sfxVolume * 100)}
              onChange={(e) => update({ sfxVolume: Number(e.target.value) / 100 })}
            />
            <span className="veltriz-settings-slider-value">{Math.round(settings.sfxVolume * 100)}%</span>
          </label>
        </section>

        <section className="veltriz-settings-section">
          <h3>
            <Mouse size={15} /> Controls
          </h3>
          <label className="veltriz-settings-slider-row">
            <span>Mouse sensitivity</span>
            <input
              type="range"
              min="1"
              max="20"
              value={sensitivityToSlider(settings.mouseSensitivity)}
              onChange={(e) => update({ mouseSensitivity: sliderToSensitivity(Number(e.target.value)) })}
            />
            <span className="veltriz-settings-slider-value">{sensitivityToSlider(settings.mouseSensitivity)}</span>
          </label>
          <label className="veltriz-settings-toggle-row">
            <span>Invert look Y-axis</span>
            <input type="checkbox" checked={settings.invertY} onChange={(e) => update({ invertY: e.target.checked })} />
          </label>
        </section>

        <section className="veltriz-settings-section">
          <h3>
            <Gauge size={15} /> Display
          </h3>
          <label className="veltriz-settings-toggle-row">
            <span>Show FPS counter</span>
            <input type="checkbox" checked={settings.showFps} onChange={(e) => update({ showFps: e.target.checked })} />
          </label>
        </section>

        <p className="veltriz-settings-footnote">Everything here applies immediately and is remembered next time you play. (Antialiasing only takes full effect after a page reload.)</p>
      </div>
    </div>
  );
};

export default SettingsPanel;
