import React, { useEffect, useState } from 'react';
import { Coins, Keyboard } from 'lucide-react';
import { useEconomySocket } from '../../../context/SocketContext';
import { useCharacter } from '../../../context/CharacterContext';
import http from '../../../lib/httpClient';

const GameHUD = () => {
  const { character } = useCharacter();
  const { latestBalance } = useEconomySocket();
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    http
      .get('/api/wallet/me')
      .then(({ data }) => setBalance(data.wallet.balance))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (latestBalance !== null) setBalance(latestBalance);
  }, [latestBalance]);

  return (
    <div className="veltriz-game-hud">
      <div className="veltriz-game-hud-identity">
        <span className="veltriz-game-hud-name">{character?.displayName}</span>
      </div>

      <div className="veltriz-game-hud-balance">
        <Coins size={16} />
        <span>{balance !== null ? balance.toLocaleString() : '…'} VC</span>
      </div>

      <div className="veltriz-game-hud-controls">
        <Keyboard size={14} />
        <span>WASD / Arrows to move · E to interact · Esc for menu</span>
      </div>
    </div>
  );
};

export default GameHUD;
