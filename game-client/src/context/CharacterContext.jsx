import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import http from '../lib/httpClient';
import { useAuth } from './AuthContext';

const CharacterContext = createContext();

export const useCharacter = () => {
  const ctx = useContext(CharacterContext);
  if (!ctx) throw new Error('useCharacter must be used within a CharacterProvider');
  return ctx;
};

export const CharacterProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [character, setCharacter] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checked, setChecked] = useState(false);

  const fetchCharacter = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await http.get('/api/character/me');
      setCharacter(data.character);
      return data.character;
    } catch {
      setCharacter(null);
      return null;
    } finally {
      setIsLoading(false);
      setChecked(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCharacter();
    } else {
      setCharacter(null);
      setIsLoading(false);
      setChecked(true);
    }
  }, [isAuthenticated, fetchCharacter]);

  const createCharacter = useCallback(async (payload) => {
    const { data } = await http.post('/api/character', payload);
    setCharacter(data.character);
    return data.character;
  }, []);

  return (
    <CharacterContext.Provider
      value={{ character, isLoading, checked, fetchCharacter, createCharacter, hasCharacter: !!character }}
    >
      {children}
    </CharacterContext.Provider>
  );
};
