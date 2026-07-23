import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, XCircle } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { useAuth } from '../../context/AuthContext';

const OAuthSuccess = () => {
  const navigate = useNavigate();
  const { setSessionFromToken } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const hash = window.location.hash; // "#accessToken=..."
    const match = /accessToken=([^&]+)/.exec(hash);

    if (!match) {
      setError('No access token received from Google sign-in.');
      return;
    }

    setSessionFromToken(decodeURIComponent(match[1]))
      .then(() => {
        // Clear the token out of the URL immediately — it should never
        // linger in browser history/address bar.
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/', { replace: true });
      })
      .catch(() => setError('Could not complete Google sign-in. Please try again.'));
  }, [navigate, setSessionFromToken]);

  return (
    <AuthLayout title="Signing you in…">
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        {error ? (
          <>
            <XCircle size={48} color="var(--vz-color-danger)" />
            <p style={{ marginTop: 16, color: 'var(--vz-text-primary)' }}>{error}</p>
          </>
        ) : (
          <Loader2 className="veltriz-spin" size={40} color="var(--vz-color-accent)" />
        )}
      </div>
    </AuthLayout>
  );
};

export default OAuthSuccess;
