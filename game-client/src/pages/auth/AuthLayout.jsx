import React, { useContext } from 'react';
import { Moon, Sun, Sparkles } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import './AuthLayout.css';

const AuthLayout = ({ title, subtitle, children }) => {
  const { isDarkMode, toggleDarkMode } = useContext(ThemeContext);

  return (
    <div className={`veltriz-auth-shell ${isDarkMode ? 'dark' : 'light'}`}>
      <button
        type="button"
        className="veltriz-auth-theme-toggle"
        onClick={toggleDarkMode}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="veltriz-auth-brand-panel">
        <div className="veltriz-auth-brand-glow" aria-hidden="true" />
        <div className="veltriz-auth-brand-content">
          <div className="veltriz-auth-brand-logo">
            <Sparkles size={28} />
            <span>VELTRIZ</span>
          </div>
          <h1 className="veltriz-auth-brand-tagline">Live a digital life.</h1>
          <p className="veltriz-auth-brand-desc">
            Choose your country, build your career, trade in a living economy, and shape a
            world that reacts to everyone in it — in real time.
          </p>
          <ul className="veltriz-auth-brand-points">
            <li>A real, persistent economy — prices move, jobs pay, markets react</li>
            <li>Multiplayer city you can see and move through with others</li>
            <li>Your progress is saved — pick up exactly where you left off</li>
          </ul>
        </div>
      </div>

      <div className="veltriz-auth-form-panel">
        <div className="veltriz-auth-form-card">
          <h2 className="veltriz-auth-form-title">{title}</h2>
          {subtitle && <p className="veltriz-auth-form-subtitle">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
