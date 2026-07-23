import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCharacter } from '../../context/CharacterContext';
import LoadingScreen from './LoadingScreen';

/**
 * The "/" route's job is purely to route the player to the right place:
 *   not logged in       -> /login
 *   logged in, no char  -> /create-character
 *   logged in, has char -> /game
 * It never renders any UI of its own.
 */
const RootGate = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { checked, isLoading: charLoading, hasCharacter } = useCharacter();

  if (authLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (charLoading || !checked) return <LoadingScreen />;
  if (!hasCharacter) return <Navigate to="/create-character" replace />;

  return <Navigate to="/game" replace />;
};

export default RootGate;
