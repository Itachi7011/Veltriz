import React, { useEffect, useState } from 'react';
import { Coins, Keyboard, Zap, Smile, Gem } from 'lucide-react';
import { useEconomySocket } from '../../../context/SocketContext';
import { useCharacter } from '../../../context/CharacterContext';
import http from '../../../lib/httpClient';
import GameClockWidget from './GameClockWidget';

const GameHUD = ({ onOpenChronoStore }) => {
  const { character } = useCharacter();
  const { latestBalance, latestChronoShards } = useEconomySocket();
  const [balance, setBalance] = useState(null);
  const [chronoShards, setChronoShards] = useState(null);
  const [stats, setStats] = useState(character?.stats || null);

  useEffect(() => {
    http
      .get('/api/wallet/me')
      .then(({ data }) => {
        setBalance(data.wallet.balance);
        setChronoShards(data.wallet.chronoShards);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (latestBalance !== null) setBalance(latestBalance);
  }, [latestBalance]);

  useEffect(() => {
    if (latestChronoShards !== null) setChronoShards(latestChronoShards);
  }, [latestChronoShards]);

  // Market consumables (MarketPanel.jsx) dispatch this after a successful
  // "use" so the HUD reflects the new energy/happiness immediately, rather
  // than waiting for a full character refetch.
  useEffect(() => {
    const onStatsUpdated = (e) => setStats(e.detail.stats);
    window.addEventListener('veltriz:stats-updated', onStatsUpdated);
    return () => window.removeEventListener('veltriz:stats-updated', onStatsUpdated);
  }, []);

  return (
    <div className="veltriz-game-hud">
      <div className="veltriz-game-hud-identity">
        <span className="veltriz-game-hud-name">{character?.displayName}</span>
      </div>

      <div className="veltriz-game-hud-balance">
        <Coins size={16} />
        <span>{balance !== null ? balance.toLocaleString() : '…'} VC</span>
      </div>

      <button className="veltriz-game-hud-shards" onClick={onOpenChronoStore} title="Open the Chrono Store">
        <Gem size={14} color="#c4b5fd" style={{ verticalAlign: '-2px', marginRight: 5 }} />
        {chronoShards !== null ? chronoShards.toLocaleString() : '…'}
      </button>

      <GameClockWidget />

      {stats && (
        <div className="veltriz-game-hud-stats">
          <span title="Energy">
            <Zap size={13} color="#facc15" /> {Math.round(stats.energy)}
          </span>
          <span title="Happiness">
            <Smile size={13} color="#4ade80" /> {Math.round(stats.happiness)}
          </span>
        </div>
      )}

      <div className="veltriz-game-hud-controls">
        <Keyboard size={14} />
        <span>WASD/Arrows move · E interact · M map · C crime · Esc menu</span>
      </div>
    </div>
  );
};

export default GameHUD;
