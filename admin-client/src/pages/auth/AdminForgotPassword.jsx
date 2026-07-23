import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Send, KeyRound } from 'lucide-react';
import Swal from 'sweetalert2';
import AdminAuthLayout from './AdminAuthLayout';
import http from '../../lib/httpClient';

const swalTheme = {
  background: 'var(--vza-bg-surface)',
  color: 'var(--vza-text-primary)',
  confirmButtonColor: '#0ea5e9',
};

const AdminForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleRequest = async (e) => {
    e.preventDefault();
    setIsSubmittingRequest(true);
    try {
      await http.post('/api/admin-auth/forgot-password', { email });
    } finally {
      setRequestSent(true);
      setIsSubmittingRequest(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setIsSubmittingReset(true);
    try {
      await http.post('/api/admin-auth/reset-password', { token, password });
      await Swal.fire({ icon: 'success', title: 'Password reset!', text: 'Please sign in again.', ...swalTheme });
      navigate('/login');
    } catch (err) {
      setResetError(err.response?.data?.message || 'That reset link is invalid or expired.');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  if (token) {
    return (
      <AdminAuthLayout title="Set a new password">
        <form onSubmit={handleReset} noValidate>
          <div className="veltriz-adminauth-field">
            <label className="veltriz-adminauth-label" htmlFor="password">
              New password
            </label>
            <div className="veltriz-adminauth-input-wrap">
              <Lock size={17} />
              <input
                id="password"
                className="veltriz-adminauth-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                className="veltriz-adminauth-input-toggle"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {resetError && <div className="veltriz-adminauth-error">{resetError}</div>}
          </div>

          <button className="veltriz-adminauth-submit" type="submit" disabled={isSubmittingReset}>
            <KeyRound size={17} />
            {isSubmittingReset ? 'Saving…' : 'Save new password'}
          </button>

          <div className="veltriz-adminauth-footer-link">
            <Link to="/login" className="veltriz-adminauth-inline-link">
              Back to login
            </Link>
          </div>
        </form>
      </AdminAuthLayout>
    );
  }

  return (
    <AdminAuthLayout title="Forgot your password?" subtitle="We'll email you a reset link.">
      {requestSent ? (
        <div>
          <p style={{ color: 'var(--vza-text-primary)' }}>
            If an admin account exists for <strong>{email}</strong>, a reset link is on its way.
          </p>
          <div className="veltriz-adminauth-footer-link">
            <Link to="/login" className="veltriz-adminauth-inline-link">
              Back to login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleRequest} noValidate>
          <div className="veltriz-adminauth-field">
            <label className="veltriz-adminauth-label" htmlFor="email">
              Email
            </label>
            <div className="veltriz-adminauth-input-wrap">
              <Mail size={17} />
              <input
                id="email"
                type="email"
                className="veltriz-adminauth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <button className="veltriz-adminauth-submit" type="submit" disabled={isSubmittingRequest}>
            <Send size={17} />
            {isSubmittingRequest ? 'Sending…' : 'Send reset link'}
          </button>

          <div className="veltriz-adminauth-footer-link">
            <Link to="/login" className="veltriz-adminauth-inline-link">
              Back to login
            </Link>
          </div>
        </form>
      )}
    </AdminAuthLayout>
  );
};

export default AdminForgotPassword;
