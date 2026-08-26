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
      '/api/casino': 'http://localhost:5001',
      '/api/school': 'http://localhost:5001',
      '/api/creditunion': 'http://localhost:5001',
      '/api/insurance': 'http://localhost:5001',
      '/api/lottery': 'http://localhost:5001',
      // game-world-service
      '/api/character': 'http://localhost:5002',
      '/api/world': 'http://localhost:5002',
      '/api/realestate': 'http://localhost:5002',
      '/api/government': 'http://localhost:5002',
      // simulation-service
      '/api/news': 'http://localhost:5004',
      '/api/events': 'http://localhost:5004',
      '/api/npcs': 'http://localhost:5004',
      // crime-service
      '/api/crime': 'http://localhost:5005',
    },
  },
});
