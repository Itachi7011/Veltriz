import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import AuthLayout from './AuthLayout';
import http from '../../lib/httpClient';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link.');
      return;
    }
    http
      .post('/api/auth/verify-email', { token })
      .then(() => {
        setStatus('success');
        setMessage('Your email has been verified.');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'That verification link is invalid or expired.');
      });
  }, [token]);

  return (
    <AuthLayout title="Email verification">
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        {status === 'loading' && <Loader2 className="veltriz-spin" size={40} color="var(--vz-color-accent)" />}
        {status === 'success' && <CheckCircle2 size={48} color="var(--vz-color-success)" />}
        {status === 'error' && <XCircle size={48} color="var(--vz-color-danger)" />}
        <p style={{ marginTop: 16, color: 'var(--vz-text-primary)' }}>{message}</p>
        <div className="veltriz-auth-footer-link">
          <Link to="/login" className="veltriz-auth-inline-link">
            Continue to login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default VerifyEmail;
