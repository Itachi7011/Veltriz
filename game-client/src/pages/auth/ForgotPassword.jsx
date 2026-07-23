import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Send, KeyRound } from 'lucide-react';
import Swal from 'sweetalert2';
import AuthLayout from './AuthLayout';
import http from '../../lib/httpClient';

const swalTheme = {
  background: 'var(--vz-bg-surface)',
  color: 'var(--vz-text-primary)',
  confirmButtonColor: '#7c3aed',
};

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  // ---- Step 1: request a reset link ----
  const [email, setEmail] = useState('');
  const [requestSent, setRequestSent] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // ---- Step 2: set new password (token present) ----
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleRequest = async (e) => {
    e.preventDefault();
    setIsSubmittingRequest(true);
    try {
      await http.post('/api/auth/forgot-password', { email });
      setRequestSent(true);
    } catch {
      // The backend intentionally always returns success here to avoid
      // leaking which emails exist — show the same confirmation regardless.
      setRequestSent(true);
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setIsSubmittingReset(true);
    try {
      await http.post('/api/auth/reset-password', { token, password });
      await Swal.fire({
        icon: 'success',
        title: 'Password reset!',
        text: 'Please log in with your new password.',
        ...swalTheme,
      });
      navigate('/login');
    } catch (err) {
      setResetError(err.response?.data?.message || 'That reset link is invalid or expired.');
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // ---- Reset step (token present in URL) ----
  if (token) {
    return (
      <AuthLayout title="Set a new password" subtitle="Choose a strong new password for your account.">
        <form onSubmit={handleReset} noValidate>
          <div className="veltriz-auth-field">
            <label className="veltriz-auth-label" htmlFor="password">
              New password
            </label>
            <div className="veltriz-auth-input-wrap">
              <Lock size={17} />
              <input
                id="password"
                className="veltriz-auth-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                className="veltriz-auth-input-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {resetError && <div className="veltriz-auth-error">{resetError}</div>}
          </div>

          <button className="veltriz-auth-submit" type="submit" disabled={isSubmittingReset}>
            <KeyRound size={17} />
            {isSubmittingReset ? 'Saving…' : 'Save new password'}
          </button>

          <div className="veltriz-auth-footer-link">
            <Link to="/login" className="veltriz-auth-inline-link">
              Back to login
            </Link>
          </div>
        </form>
      </AuthLayout>
    );
  }

  // ---- Request step (no token yet) ----
  return (
    <AuthLayout title="Forgot your password?" subtitle="We'll email you a link to reset it.">
      {requestSent ? (
        <div>
          <p style={{ color: 'var(--vz-text-primary)' }}>
            If an account exists for <strong>{email}</strong>, a reset link is on its way. Check your
            inbox (and spam folder).
          </p>
          <div className="veltriz-auth-footer-link">
            <Link to="/login" className="veltriz-auth-inline-link">
              Back to login
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleRequest} noValidate>
          <div className="veltriz-auth-field">
            <label className="veltriz-auth-label" htmlFor="email">
              Email
            </label>
            <div className="veltriz-auth-input-wrap">
              <Mail size={17} />
              <input
                id="email"
                className="veltriz-auth-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <button className="veltriz-auth-submit" type="submit" disabled={isSubmittingRequest}>
            <Send size={17} />
            {isSubmittingRequest ? 'Sending…' : 'Send reset link'}
          </button>

          <div className="veltriz-auth-footer-link">
            <Link to="/login" className="veltriz-auth-inline-link">
              Back to login
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
