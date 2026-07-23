import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Phaser from 'phaser';
import { io } from 'socket.io-client';
import { createGameConfig } from './phaser/config';
import gameEvents from './gameEvents';
import { useCharacter } from '../../context/CharacterContext';
import http from '../../lib/httpClient';
import { getAccessToken } from '../../utils/tokenStore';
import { enterFullscreen, exitFullscreen } from '../../utils/fullscreen';
import GameHUD from './ui/GameHUD';
import PauseMenu from './ui/PauseMenu';
import JobPanel from './ui/JobPanel';
import MarketPanel from './ui/MarketPanel';
import WalletPanel from './ui/WalletPanel';
import LoadingScreen from '../../components/shared/LoadingScreen';
import './Game.css';

// See SocketContext.jsx for why sockets (unlike every REST call in this
// app) need a real URL instead of a relative path: Netlify can't proxy
// WebSocket upgrades through redirects. Set VITE_GAME_WORLD_SERVICE_URL at
// build time for production; the localhost default just works in dev.
const GAME_WORLD_URL = import.meta.env.VITE_GAME_WORLD_SERVICE_URL || 'http://localhost:5002';

const GamePage = () => {
  const navigate = useNavigate();
  const { character, isLoading: characterLoading, checked } = useCharacter();
  const containerRef = useRef(null);
  const gameRef = useRef(null);
  const socketRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [nearbyBuilding, setNearbyBuilding] = useState(null); // 'job_center' | 'market' | 'bank' | 'home' | null
  const [openPanel, setOpenPanel] = useState(null);

  // A logged-in user with no character yet shouldn't land here directly
  useEffect(() => {
    if (checked && !characterLoading && !character) {
      navigate('/create-character', { replace: true });
    }
  }, [checked, characterLoading, character, navigate]);

  // ---- Boot Phaser once map config + character are ready ----
  useEffect(() => {
    if (!character) return;
    let destroyed = false;

    const boot = async () => {
      const {
        data: { map },
      } = await http.get(`/api/world/map/${character.mapId || 'delhi_cp_district'}`);
      if (destroyed) return;

      const socket = io(GAME_WORLD_URL, {
        auth: { token: getAccessToken() },
        transports: ['websocket', 'polling'],
      });
      socketRef.current = socket;

      const config = createGameConfig(containerRef.current.id);
      const game = new Phaser.Game(config);
      gameRef.current = game;
      game.scene.start('MainScene', { mapConfig: map, character, socket });

      setIsLoading(false);
      enterFullscreen();
    };

    boot();

    return () => {
      destroyed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character?.id]);

  // ---- Building proximity prompt ----
  useEffect(() => {
    const onEnter = ({ type }) => setNearbyBuilding(type);
    const onLeave = () => setNearbyBuilding(null);
    gameEvents.on('building:enter', onEnter);
    gameEvents.on('building:leave', onLeave);
    return () => {
      gameEvents.off('building:enter', onEnter);
      gameEvents.off('building:leave', onLeave);
    };
  }, []);

  const pauseGame = useCallback(() => {
    gameRef.current?.scene.pause('MainScene');
    setIsPaused(true);
  }, []);

  const resumeGame = useCallback(() => {
    gameRef.current?.scene.resume('MainScene');
    setIsPaused(false);
  }, []);

  const exitToMenu = useCallback(async () => {
    await exitFullscreen();
    gameRef.current?.destroy(true);
    socketRef.current?.disconnect();
    navigate('/');
  }, [navigate]);

  // ---- Escape key: open pause menu (or close a panel first if one's open) ----
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (openPanel) {
        setOpenPanel(null);
        return;
      }
      isPaused ? resumeGame() : pauseGame();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isPaused, openPanel, pauseGame, resumeGame]);

  // ---- 'E' to interact with a nearby building ----
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key.toLowerCase() !== 'e' || !nearbyBuilding || isPaused) return;
      setOpenPanel(nearbyBuilding);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [nearbyBuilding, isPaused]);

  const buildingLabel = {
    job_center: 'Job Center',
    market: 'Central Market',
    bank: 'Bank',
    home: 'Home',
  };

  if (!character) {
    return <LoadingScreen />;
  }

  return (
    <div className="veltriz-game-shell">
      <div id="veltriz-phaser-container" ref={containerRef} className="veltriz-game-canvas-host" />

      {isLoading && (
        <div className="veltriz-game-loading">
          <div className="veltriz-game-loading-spinner" />
          <p>Loading Veltriz…</p>
        </div>
      )}

      {!isLoading && (
        <>
          <GameHUD />

          {nearbyBuilding && !openPanel && !isPaused && (
            <div className="veltriz-game-interact-prompt">
              Press <kbd>E</kbd> to enter {buildingLabel[nearbyBuilding] || nearbyBuilding}
            </div>
          )}

          {openPanel === 'job_center' && <JobPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'market' && <MarketPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'bank' && <WalletPanel onClose={() => setOpenPanel(null)} />}
          {openPanel === 'home' && (
            <div className="veltriz-game-panel-backdrop" onClick={() => setOpenPanel(null)}>
              <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
                <h2>Home</h2>
                <p>This is where you rest. Life-sim features (energy, sleep) arrive in a later phase.</p>
                <button className="veltriz-game-panel-close" onClick={() => setOpenPanel(null)}>
                  Close
                </button>
              </div>
            </div>
          )}

          {isPaused && <PauseMenu onResume={resumeGame} onExit={exitToMenu} />}
        </>
      )}
    </div>
  );
};

export default GamePage;
