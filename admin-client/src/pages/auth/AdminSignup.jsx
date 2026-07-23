import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, UserPlus, KeySquare } from 'lucide-react';
import Swal from 'sweetalert2';
import AdminAuthLayout from './AdminAuthLayout';
import { useAdminAuth } from '../../context/AdminAuthContext';

const AdminSignup = () => {
  const navigate = useNavigate();
  const { signup } = useAdminAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '', signupCode: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const update = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);
    try {
      await signup(form);
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
          title: 'Signup failed',
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
    <AdminAuthLayout title="Create admin account" subtitle="You'll need an invite code from your team lead.">
      <form onSubmit={handleSubmit} noValidate>
        <div className="veltriz-adminauth-field">
          <label className="veltriz-adminauth-label" htmlFor="username">
            Username
          </label>
          <div className="veltriz-adminauth-input-wrap">
            <User size={17} />
            <input id="username" className="veltriz-adminauth-input" value={form.username} onChange={update('username')} required />
          </div>
          {errors.username && <div className="veltriz-adminauth-error">{errors.username}</div>}
        </div>

        <div className="veltriz-adminauth-field">
          <label className="veltriz-adminauth-label" htmlFor="email">
            Email
          </label>
          <div className="veltriz-adminauth-input-wrap">
            <Mail size={17} />
            <input id="email" type="email" className="veltriz-adminauth-input" value={form.email} onChange={update('email')} required />
          </div>
          {errors.email && <div className="veltriz-adminauth-error">{errors.email}</div>}
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
              value={form.password}
              onChange={update('password')}
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

        <div className="veltriz-adminauth-field">
          <label className="veltriz-adminauth-label" htmlFor="signupCode">
            Invite code
          </label>
          <div className="veltriz-adminauth-input-wrap">
            <KeySquare size={17} />
            <input
              id="signupCode"
              className="veltriz-adminauth-input"
              value={form.signupCode}
              onChange={update('signupCode')}
              required
            />
          </div>
          {errors.signupCode && <div className="veltriz-adminauth-error">{errors.signupCode}</div>}
        </div>

        <button className="veltriz-adminauth-submit" type="submit" disabled={isSubmitting}>
          <UserPlus size={17} />
          {isSubmitting ? 'Creating account…' : 'Create Admin Account'}
        </button>

        <div className="veltriz-adminauth-footer-link">
          Already have an account?{' '}
          <Link to="/login" className="veltriz-adminauth-inline-link">
            Sign in
          </Link>
        </div>
      </form>
    </AdminAuthLayout>
  );
};

export default AdminSignup;
