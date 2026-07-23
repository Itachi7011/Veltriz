import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import http, { refreshAccessToken } from '../lib/httpClient';
import { setAccessToken, clearAccessToken } from '../utils/tokenStore';

const AdminAuthContext = createContext();

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  return ctx;
};

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await refreshAccessToken();
        const { data } = await http.get('/api/admin-auth/me');
        setAdmin(data.admin);
      } catch {
        setAdmin(null);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setAdmin(null);
      clearAccessToken();
    };
    window.addEventListener('veltriz-admin:session-expired', onExpired);
    return () => window.removeEventListener('veltriz-admin:session-expired', onExpired);
  }, []);

  const signup = useCallback(async (payload) => {
    const { data } = await http.post('/api/admin-auth/signup', payload);
    setAccessToken(data.accessToken);
    setAdmin(data.admin);
    return data;
  }, []);

  const login = useCallback(async (payload) => {
    const { data } = await http.post('/api/admin-auth/login', payload);
    setAccessToken(data.accessToken);
    setAdmin(data.admin);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await http.post('/api/admin-auth/logout');
    } finally {
      clearAccessToken();
      setAdmin(null);
    }
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{ admin, isLoading, isAuthenticated: !!admin, signup, login, logout }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};
