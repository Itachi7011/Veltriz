import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import Swal from 'sweetalert2';
import AdminAuthLayout from './AdminAuthLayout';
import { useAdminAuth } from '../../context/AdminAuthContext';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { login } = useAdminAuth();
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
          text: res?.message || 'Something went wrong.',
          background: 'var(--vza-bg-surface)',
          color: 'var(--vza-text-primary)',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminAuthLayout title="Admin sign in" subtitle="Access the Veltriz control center.">
      <form onSubmit={handleSubmit} noValidate>
        <div className="veltriz-adminauth-field">
          <label className="veltriz-adminauth-label" htmlFor="identifier">
            Email or username
          </label>
          <div className="veltriz-adminauth-input-wrap">
            <Mail size={17} />
            <input
              id="identifier"
              className="veltriz-adminauth-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          {errors.identifier && <div className="veltriz-adminauth-error">{errors.identifier}</div>}
        </div>

        <div className="veltriz-adminauth-field">
          <label className="veltriz-adminauth-label" htmlFor="password">
            Password
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
          {errors.password && <div className="veltriz-adminauth-error">{errors.password}</div>}
        </div>

        <div style={{ textAlign: 'right', marginBottom: 16 }}>
          <Link to="/forgot-password" className="veltriz-adminauth-inline-link">
            Forgot password?
          </Link>
        </div>

        <button className="veltriz-adminauth-submit" type="submit" disabled={isSubmitting}>
          <LogIn size={17} />
          {isSubmitting ? 'Signing in…' : 'Sign In'}
        </button>

        <div className="veltriz-adminauth-footer-link">
          Need an admin account?{' '}
          <Link to="/signup" className="veltriz-adminauth-inline-link">
            Create one
          </Link>
        </div>
      </form>
    </AdminAuthLayout>
  );
};

export default AdminLogin;
