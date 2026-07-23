import React, { useState } from 'react';
import { KeyRound, Save } from 'lucide-react';
import Swal from 'sweetalert2';
import http from '../../lib/httpClient';
import '../adminPages.css';

const swalTheme = { background: 'var(--vza-bg-surface)', color: 'var(--vza-text-primary)', confirmButtonColor: '#0ea5e9' };

const Security = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await http.post('/api/admin-auth/change-password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      Swal.fire({ icon: 'success', title: 'Password changed', ...swalTheme });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Failed', text: err.response?.data?.message, ...swalTheme });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="veltriz-adminpage-header">
        <div>
          <h1 className="veltriz-adminpage-title">
            <KeyRound size={22} /> Security
          </h1>
          <p className="veltriz-adminpage-subtitle">Change your admin password.</p>
        </div>
      </div>

      <form className="veltriz-adminpage-card" style={{ maxWidth: 420 }} onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label className="veltriz-adminpage-subtitle" htmlFor="current">
            Current password
          </label>
          <input
            id="current"
            type="password"
            className="veltriz-adminpage-input"
            style={{ width: '100%', marginTop: 6 }}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label className="veltriz-adminpage-subtitle" htmlFor="newpass">
            New password
          </label>
          <input
            id="newpass"
            type="password"
            className="veltriz-adminpage-input"
            style={{ width: '100%', marginTop: 6 }}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <button className="veltriz-adminpage-btn primary" type="submit" disabled={isSubmitting}>
          <Save size={14} /> {isSubmitting ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </div>
  );
};

export default Security;
