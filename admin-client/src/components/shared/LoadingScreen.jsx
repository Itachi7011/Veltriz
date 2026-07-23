import React from 'react';
import { Sparkles } from 'lucide-react';

const LoadingScreen = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      background: 'var(--vza-bg-base)',
      color: 'var(--vza-text-primary)',
    }}
  >
    <Sparkles className="vza-spin" size={36} color="var(--vza-color-primary)" />
    <span>Loading Veltriz Admin…</span>
  </div>
);

export default LoadingScreen;
