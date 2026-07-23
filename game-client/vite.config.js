import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['phaser'],
  },
  server: {
    proxy: {
      // auth-service
      '/api/auth': 'http://localhost:5000',
      // economy-service
      '/api/wallet': 'http://localhost:5001',
      '/api/jobs': 'http://localhost:5001',
      '/api/market': 'http://localhost:5001',
      // game-world-service
      '/api/character': 'http://localhost:5002',
      '/api/world': 'http://localhost:5002',
    },
  },
});
