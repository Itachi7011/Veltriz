import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import Swal from 'sweetalert2';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);
    try {
      await login({ identifier, password });
      navigate('/');
    } catch (err) {
      const res = err.response?.data;
      if (res?.errors) {
        const fieldErrors = {};
        res.errors.forEach((er) => (fieldErrors[er.field] = er.message));
        setErrors(fieldErrors);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Login failed',
          text: res?.message || 'Something went wrong. Please try again.',
          background: 'var(--vz-bg-surface)',
          color: 'var(--vz-text-primary)',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Welcome back, citizen" subtitle="Log in to continue your life in Veltriz.">
      <form onSubmit={handleSubmit} noValidate>
        <div className="veltriz-auth-field">
          <label className="veltriz-auth-label" htmlFor="identifier">
            Email or username
          </label>
          <div className="veltriz-auth-input-wrap">
            <Mail size={17} />
            <input
              id="identifier"
              className="veltriz-auth-input"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          {errors.identifier && <div className="veltriz-auth-error">{errors.identifier}</div>}
        </div>

        <div className="veltriz-auth-field">
          <label className="veltriz-auth-label" htmlFor="password">
            Password
          </label>
          <div className="veltriz-auth-input-wrap">
            <Lock size={17} />
            <input
              id="password"
              className="veltriz-auth-input"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
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
          {errors.password && <div className="veltriz-auth-error">{errors.password}</div>}
        </div>

        <div className="veltriz-auth-remember-row">
          <span />
          <Link to="/forgot-password">Forgot password?</Link>
        </div>

        <button className="veltriz-auth-submit" type="submit" disabled={isSubmitting}>
          <LogIn size={17} />
          {isSubmitting ? 'Logging in…' : 'Log In'}
        </button>

        <div className="veltriz-auth-divider">OR</div>

        <button
          type="button"
          className="veltriz-auth-google-btn"
          onClick={() => (window.location.href = '/api/auth/google')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.48a5.54 5.54 0 0 1-2.4 3.64v3h3.87c2.27-2.09 3.57-5.17 3.57-8.82z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.87-3c-1.08.72-2.45 1.15-4.08 1.15-3.13 0-5.79-2.11-6.74-4.96H1.27v3.1A12 12 0 0 0 12 24z" />
            <path fill="#FBBC05" d="M5.26 14.28A7.2 7.2 0 0 1 4.88 12c0-.79.14-1.56.38-2.28v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l3.99-3.1z" />
            <path fill="#EA4335" d="M12 4.75c1.76 0 3.35.6 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.62l3.99 3.1C6.21 6.86 8.87 4.75 12 4.75z" />
          </svg>
          Continue with Google
        </button>

        <div className="veltriz-auth-footer-link">
          New to Veltriz?{' '}
          <Link to="/signup" className="veltriz-auth-inline-link">
            Create an account
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default Login;
