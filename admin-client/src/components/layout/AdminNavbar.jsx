import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  User,
  KeyRound,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useSidebar } from '../../context/SidebarContext';
import { ThemeContext } from '../../context/ThemeContext';
import { useAdminAuth } from '../../context/AdminAuthContext';
import './AdminNavbar.css';

const NOTIFICATIONS_PLACEHOLDER = [
  { id: 1, text: 'Market volatility spike on Gold — review price?', time: '5m ago' },
  { id: 2, text: '3 new player signups in the last hour', time: '22m ago' },
  { id: 3, text: 'Wallet flagged for unusual activity', time: '1h ago' },
];

const AdminNavbar = () => {
  const { isExpanded, toggleSidebar } = useSidebar();
  const { isDarkMode, toggleDarkMode } = useContext(ThemeContext);
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') {
        setProfileOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header
      className="veltriz-adminnavbar"
      style={{
        left: isExpanded ? 'var(--vza-sidebar-width-expanded)' : 'var(--vza-sidebar-width-collapsed)',
      }}
    >
      <button
        type="button"
        className="veltriz-adminnavbar-menu-btn"
        onClick={toggleSidebar}
        aria-label={isExpanded ? 'Collapse navigation' : 'Expand navigation'}
      >
        <Menu size={20} />
      </button>

      <div className="veltriz-adminnavbar-search">
        <Search size={16} className="veltriz-adminnavbar-search-icon" />
        <input
          type="text"
          className="veltriz-adminnavbar-search-input"
          placeholder="Search players, wallets, jobs…"
          aria-label="Search"
        />
      </div>

      <div className="veltriz-adminnavbar-actions">
        <button
          type="button"
          className="veltriz-adminnavbar-icon-btn"
          onClick={toggleDarkMode}
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="veltriz-adminnavbar-dropdown-wrap" ref={notifRef}>
          <button
            type="button"
            className="veltriz-adminnavbar-icon-btn"
            onClick={() => setNotifOpen((o) => !o)}
            aria-haspopup="true"
            aria-expanded={notifOpen}
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="veltriz-adminnavbar-badge">{NOTIFICATIONS_PLACEHOLDER.length}</span>
          </button>

          {notifOpen && (
            <div className="veltriz-adminnavbar-dropdown veltriz-adminnavbar-notif-dropdown" role="menu">
              <div className="veltriz-adminnavbar-dropdown-header">Notifications</div>
              {NOTIFICATIONS_PLACEHOLDER.map((n) => (
                <div key={n.id} className="veltriz-adminnavbar-notif-item" role="menuitem">
                  <span>{n.text}</span>
                  <small>{n.time}</small>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="veltriz-adminnavbar-dropdown-wrap" ref={profileRef}>
          <button
            type="button"
            className="veltriz-adminnavbar-profile-btn"
            onClick={() => setProfileOpen((o) => !o)}
            aria-haspopup="true"
            aria-expanded={profileOpen}
            aria-label="Admin menu"
          >
            <div className="veltriz-adminnavbar-avatar">
              {admin?.avatarUrl ? (
                <img src={admin.avatarUrl} alt="" />
              ) : (
                <span>{admin?.username?.[0]?.toUpperCase() || 'A'}</span>
              )}
            </div>
            <span className="veltriz-adminnavbar-profile-name">{admin?.username}</span>
            <ChevronDown size={14} className={`veltriz-adminnavbar-chevron ${profileOpen ? 'open' : ''}`} />
          </button>

          {profileOpen && (
            <div className="veltriz-adminnavbar-dropdown" role="menu">
              <div className="veltriz-adminnavbar-dropdown-header">
                {admin?.username}
                <small style={{ display: 'block', fontWeight: 400 }}>{admin?.email}</small>
              </div>
              <button className="veltriz-adminnavbar-dropdown-item" onClick={() => navigate('/settings/profile')}>
                <User size={16} /> Profile
              </button>
              <button className="veltriz-adminnavbar-dropdown-item" onClick={() => navigate('/settings/security')}>
                <KeyRound size={16} /> Security
              </button>
              {admin?.role === 'superadmin' && (
                <button className="veltriz-adminnavbar-dropdown-item" onClick={() => navigate('/settings/admins')}>
                  <ShieldCheck size={16} /> Manage admins
                </button>
              )}
              <div className="veltriz-adminnavbar-dropdown-divider" />
              <button className="veltriz-adminnavbar-dropdown-item danger" onClick={handleLogout}>
                <LogOut size={16} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminNavbar;
