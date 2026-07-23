import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import http, { refreshAccessToken } from '../lib/httpClient';
import { setAccessToken, clearAccessToken } from '../utils/tokenStore';

const AuthContext = createContext();

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // true until initial silent-refresh attempt resolves

  // On first load, try to silently resume a session from the httpOnly
  // refresh cookie (the access token itself is memory-only and doesn't
  // survive a hard page refresh).
  useEffect(() => {
    const bootstrap = async () => {
      try {
        await refreshAccessToken();
        const { data } = await http.get('/api/auth/me');
        setUser(data.user);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      clearAccessToken();
    };
    window.addEventListener('veltriz:session-expired', onExpired);
    return () => window.removeEventListener('veltriz:session-expired', onExpired);
  }, []);

  const signup = useCallback(async (payload) => {
    const { data } = await http.post('/api/auth/signup', payload);
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data;
  }, []);

  const login = useCallback(async (payload) => {
    const { data } = await http.post('/api/auth/login', payload);
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data;
  }, []);

  // Called by OAuthSuccess.jsx after Google redirects back with a token
  const setSessionFromToken = useCallback(async (accessToken) => {
    setAccessToken(accessToken);
    const { data } = await http.get('/api/auth/me');
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await http.post('/api/auth/logout');
    } finally {
      clearAccessToken();
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await http.get('/api/auth/me');
    setUser(data.user);
    return data.user;
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signup,
    login,
    logout,
    setSessionFromToken,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
