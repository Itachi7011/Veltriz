import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getAccessToken, subscribeToToken } from '../utils/tokenStore';

const SocketContext = createContext();

export const useEconomySocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useEconomySocket must be used within a SocketProvider');
  return ctx;
};

/**
 * WebSocket connections are the ONE place this app needs a real backend
 * URL instead of a relative path. This is a genuine platform limitation,
 * not a design choice: Netlify's redirect proxying (netlify.toml) is
 * HTTP-only and does not support proxying WebSocket upgrades. Vite's dev
 * proxy CAN handle WebSockets, but for simplicity in dev we just connect
 * straight to the backend's own port — economy-service already has CORS
 * configured to allow CLIENT_URL, so this works with zero extra config.
 *
 * In production, set VITE_ECONOMY_SERVICE_URL to the real deployed
 * economy-service URL at BUILD time. REST calls never use this variable —
 * only this socket connection does.
 */
const ECONOMY_SOCKET_URL = import.meta.env.VITE_ECONOMY_SERVICE_URL || 'http://localhost:5001';

export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [latestBalance, setLatestBalance] = useState(null);
  const [latestPrices, setLatestPrices] = useState({}); // { [itemKey]: currentPrice }

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    const token = getAccessToken();
    if (!token) return; // wait for token to be set

    const socket = io(ECONOMY_SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('wallet:update', ({ balance }) => setLatestBalance(balance));
    socket.on('market:price_update', ({ itemKey, currentPrice }) => {
      setLatestPrices((prev) => ({ ...prev, [itemKey]: currentPrice }));
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated]);

  // If the access token gets refreshed mid-session, reconnect with the new one
  useEffect(() => {
    const unsub = subscribeToToken((newToken) => {
      if (socketRef.current && newToken) {
        socketRef.current.auth = { token: newToken };
        socketRef.current.disconnect().connect();
      }
    });
    return unsub;
  }, []);

  return (
    <SocketContext.Provider value={{ connected, latestBalance, latestPrices, socket: socketRef }}>
      {children}
    </SocketContext.Provider>
  );
};
