import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { SidebarProvider } from './context/SidebarContext';
import { AdminAuthProvider } from './context/AdminAuthContext';

import ProtectedRoute from './components/shared/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';

import AdminLogin from './pages/auth/AdminLogin';
import AdminSignup from './pages/auth/AdminSignup';
import AdminForgotPassword from './pages/auth/AdminForgotPassword';

import Dashboard from './pages/dashboard/Dashboard';
import UsersList from './pages/users/UsersList';
import UserDetail from './pages/users/UserDetail';
import EconomyOverview from './pages/economy/EconomyOverview';
import Wallets from './pages/economy/Wallets';
import Jobs from './pages/economy/Jobs';
import MarketItems from './pages/economy/MarketItems';
import ChronoStore from './pages/economy/ChronoStore';
import ChronoPurchases from './pages/economy/ChronoPurchases';
import AuditLogs from './pages/logs/AuditLogs';
import WorldEvents from './pages/world/WorldEvents';
import Population from './pages/world/Population';
import NewsFeed from './pages/world/NewsFeed';
import CrimeActions from './pages/crime/CrimeActions';
import PlayerHeat from './pages/crime/PlayerHeat';
import Profile from './pages/settings/Profile';
import Security from './pages/settings/Security';

import './styles/global.css';

// Small helper so every protected page gets both the auth guard AND the
// navbar/sidebar layout without repeating both wrappers on every route.
const Page = ({ children }) => (
  <ProtectedRoute>
    <AdminLayout>{children}</AdminLayout>
  </ProtectedRoute>
);

function App() {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <AdminAuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<AdminLogin />} />
              <Route path="/signup" element={<AdminSignup />} />
              <Route path="/forgot-password" element={<AdminForgotPassword />} />

              <Route path="/" element={<Page><Dashboard /></Page>} />
              <Route path="/users" element={<Page><UsersList /></Page>} />
              <Route path="/users/:id" element={<Page><UserDetail /></Page>} />
              <Route path="/economy" element={<Page><EconomyOverview /></Page>} />
              <Route path="/economy/wallets" element={<Page><Wallets /></Page>} />
              <Route path="/economy/jobs" element={<Page><Jobs /></Page>} />
              <Route path="/economy/market-items" element={<Page><MarketItems /></Page>} />
              <Route path="/economy/chrono-store" element={<Page><ChronoStore /></Page>} />
              <Route path="/economy/chrono-purchases" element={<Page><ChronoPurchases /></Page>} />
              <Route path="/logs" element={<Page><AuditLogs /></Page>} />
              <Route path="/world/events" element={<Page><WorldEvents /></Page>} />
              <Route path="/world/population" element={<Page><Population /></Page>} />
              <Route path="/world/news" element={<Page><NewsFeed /></Page>} />
              <Route path="/crime/actions" element={<Page><CrimeActions /></Page>} />
              <Route path="/crime/heat" element={<Page><PlayerHeat /></Page>} />
              <Route path="/settings/profile" element={<Page><Profile /></Page>} />
              <Route path="/settings/security" element={<Page><Security /></Page>} />
            </Routes>
          </BrowserRouter>
        </AdminAuthProvider>
      </SidebarProvider>
    </ThemeProvider>
  );
}

export default App;
