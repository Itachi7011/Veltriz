import React, { useContext } from 'react';
import { Moon, Sun, ShieldCheck } from 'lucide-react';
import { ThemeContext } from '../../context/ThemeContext';
import './AdminAuthLayout.css';

const AdminAuthLayout = ({ title, subtitle, children }) => {
  const { isDarkMode, toggleDarkMode } = useContext(ThemeContext);

  return (
    <div className={`veltriz-adminauth-shell ${isDarkMode ? 'dark' : 'light'}`}>
      <button
        type="button"
        className="veltriz-adminauth-theme-toggle"
        onClick={toggleDarkMode}
        aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="veltriz-adminauth-brand-panel">
        <div className="veltriz-adminauth-brand-glow" aria-hidden="true" />
        <div className="veltriz-adminauth-brand-content">
          <div className="veltriz-adminauth-brand-logo">
            <ShieldCheck size={26} />
            <span>VELTRIZ ADMIN</span>
          </div>
          <h1 className="veltriz-adminauth-brand-tagline">Control the world.</h1>
          <p className="veltriz-adminauth-brand-desc">
            Manage players, tune the economy, and keep the whole civilization simulation
            balanced — in real time.
          </p>
        </div>
      </div>

      <div className="veltriz-adminauth-form-panel">
        <div className="veltriz-adminauth-form-card">
          <h2 className="veltriz-adminauth-form-title">{title}</h2>
          {subtitle && <p className="veltriz-adminauth-form-subtitle">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
};

export default AdminAuthLayout;
