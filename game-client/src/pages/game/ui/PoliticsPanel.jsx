import React, { useState } from 'react';
import { X, Megaphone, Swords, UtensilsCrossed, Users, ShieldAlert } from 'lucide-react';
import gameEvents from '../gameEvents';

const EVENT_INFO = {
  rally: {
    icon: Megaphone,
    title: 'Rally',
    desc: 'Gather nearby citizens for a peaceful rally. They\u2019ll form a crowd right here and chant for a while.',
  },
  political_clash: {
    icon: ShieldAlert,
    title: 'Political Clash',
    desc: 'Two rival Veltriz parties show up and face off — expect shouting, shoving, and eventually the police.',
  },
  gang_war: {
    icon: Swords,
    title: 'Gang Turf War',
    desc: 'Two rival crews clash over this block. Stylized, non-graphic scuffling — and it will draw police attention.',
  },
  food_distribution: {
    icon: UtensilsCrossed,
    title: 'Food Distribution',
    desc: 'Nearby citizens will form a line and receive food, one at a time.',
  },
  gathering: {
    icon: Users,
    title: 'Mass Gathering',
    desc: 'A generic public gathering — citizens cluster around you.',
  },
};

/**
 * Picking an option here isn't the end of it — it emits 'politics:start',
 * which GameEngine uses to actually pull nearby NPCs into a real crowd at
 * your location (see WorldEventSystem.js). This panel just picks which
 * kind. The world also starts these entirely on its own sometimes — see
 * WorldEventSystem.maybeAutoStart() — so this isn't the only way they
 * happen, just the way you can make one happen right here, right now.
 */
const PoliticsPanel = ({ onClose }) => {
  const [startedType, setStartedType] = useState(null);

  const start = (key) => {
    gameEvents.emit('politics:start', { type: key });
    setStartedType(key);
    setTimeout(onClose, 900);
  };

  return (
    <div className="veltriz-game-panel-backdrop" onClick={onClose}>
      <div className="veltriz-game-panel" onClick={(e) => e.stopPropagation()}>
        <div className="veltriz-game-panel-header">
          <h2>
            <Megaphone size={20} /> Start Something Here
          </h2>
          <button className="veltriz-game-panel-x" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <p className="veltriz-politics-hint">
          Nearby citizens will actually walk over and gather — this needs people around, so it won't do anything out in an empty field.
        </p>

        <div className="veltriz-politics-list">
          {Object.entries(EVENT_INFO).map(([key, info]) => {
            const Icon = info.icon;
            return (
              <button key={key} className="veltriz-politics-option" onClick={() => start(key)} disabled={!!startedType}>
                <Icon size={22} />
                <div>
                  <div className="veltriz-politics-option-title">{info.title}</div>
                  <div className="veltriz-politics-option-desc">{info.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {startedType && <div className="veltriz-politics-started">Starting it up…</div>}
      </div>
    </div>
  );
};

export default PoliticsPanel;
