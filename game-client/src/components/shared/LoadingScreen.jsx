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
      background: 'var(--vz-bg-base)',
      color: 'var(--vz-text-primary)',
    }}
  >
    <Sparkles className="veltriz-spin" size={36} color="var(--vz-color-primary)" />
    <span>Loading Veltriz…</span>
  </div>
);

export default LoadingScreen;
