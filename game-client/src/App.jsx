import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { CharacterProvider } from './context/CharacterContext';
import { SocketProvider } from './context/SocketContext';

import RootGate from './components/shared/RootGate';
import ProtectedRoute from './components/shared/ProtectedRoute';
import LoadingScreen from './components/shared/LoadingScreen';

import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import VerifyEmail from './pages/auth/VerifyEmail';
import OAuthSuccess from './pages/auth/OAuthSuccess';
import CharacterCreate from './pages/character/CharacterCreate';

// Phaser is a large dependency — only load it when the player actually
// enters the game, not on the login/signup screens.
const GamePage = lazy(() => import('./pages/game/GamePage'));

import './styles/global.css';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CharacterProvider>
          <SocketProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<RootGate />} />

                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/oauth-success" element={<OAuthSuccess />} />

                <Route
                  path="/create-character"
                  element={
                    <ProtectedRoute>
                      <CharacterCreate />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/game"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<LoadingScreen />}>
                        <GamePage />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<RootGate />} />
              </Routes>
            </BrowserRouter>
          </SocketProvider>
        </CharacterProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
