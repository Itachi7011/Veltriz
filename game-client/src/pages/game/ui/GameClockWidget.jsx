import React, { useEffect, useState, useCallback } from 'react';
import { Sun, Moon } from 'lucide-react';
import http from '../../../lib/httpClient';

/**
 * Reads game-world-service's stateless /api/world/clock once, then ticks
 * locally between re-syncs (every 60s) rather than polling every second —
 * see services/gameClock.js for why the server-side value is pure math off
 * a fixed epoch, which is exactly what makes "tick locally, resync
 * occasionally" safe: the client's local math and the server's will never
 * drift apart, they're computing the same formula.
 */
const GameClockWidget = () => {
  const [clock, setClock] = useState(null);

  const sync = useCallback(async () => {
    try {
      const { data } = await http.get('/api/world/clock');
      setClock(data.clock);
    } catch {
      // Non-critical — the HUD just won't show a clock this tick, no need to alarm the player.
    }
  }, []);

  useEffect(() => {
    sync();
    const resync = setInterval(sync, 60000);
    return () => clearInterval(resync);
  }, [sync]);

  useEffect(() => {
    if (!clock) return;
    // TIME_SCALE is 60 (see gameClock.js): 1 real SECOND = 1 in-game
    // MINUTE. This must tick every 1000ms, not 60000ms — a 60s interval
    // would advance the displayed clock 60x slower than the server's,
    // making it visibly crawl for a minute and then jump forward on every
    // resync instead of moving smoothly in sync with the server's math.
    const tick = setInterval(() => {
      setClock((c) => {
        if (!c) return c;
        let minute = c.minute + 1;
        let hour = c.hour;
        let day = c.day;
        if (minute >= 60) {
          minute = 0;
          hour += 1;
        }
        if (hour >= 24) {
          hour = 0;
          day += 1;
        }
        return { ...c, minute, hour, day, isNight: hour < 6 || hour >= 20 };
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [clock === null]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!clock) return null;

  return (
    <div className="veltriz-game-clock" title={`Day ${clock.day}`}>
      {clock.isNight ? <Moon size={13} /> : <Sun size={13} />}
      <span>
        Day {clock.day} · {String(clock.hour).padStart(2, '0')}:{String(clock.minute).padStart(2, '0')}
      </span>
    </div>
  );
};

export default GameClockWidget;
