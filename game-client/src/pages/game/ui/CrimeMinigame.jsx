import React, { useEffect, useRef, useState } from 'react';

/**
 * The physical part of "committing" a crime: a marker sweeps back and
 * forth across a bar, and you have to hit Space/click at the moment it's
 * inside the highlighted zone. This is what stands between "click a menu
 * item" and actually having to do something — you can still fail this
 * even when you're standing in the right place, and the server-side
 * success roll still happens independently after you pass it.
 */
const CrimeMinigame = ({ title, difficulty = 0.5, onResult }) => {
  const [markerPos, setMarkerPos] = useState(0);
  const [resolved, setResolved] = useState(false);
  const dirRef = useRef(1);
  const posRef = useRef(0);
  const rafRef = useRef(null);

  // Harder crimes get a narrower target zone and a faster sweep.
  const zoneWidth = Math.max(10, 34 - difficulty * 20); // percent width
  const zoneStart = 50 - zoneWidth / 2;
  const speed = 55 + difficulty * 55; // percent per second

  useEffect(() => {
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      posRef.current += dirRef.current * speed * dt;
      if (posRef.current >= 100) {
        posRef.current = 100;
        dirRef.current = -1;
      } else if (posRef.current <= 0) {
        posRef.current = 0;
        dirRef.current = 1;
      }
      setMarkerPos(posRef.current);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = (success) => {
    if (resolved) return;
    setResolved(true);
    cancelAnimationFrame(rafRef.current);
    setTimeout(() => onResult(success), success ? 260 : 420);
  };

  const attempt = () => {
    const inZone = markerPos >= zoneStart && markerPos <= zoneStart + zoneWidth;
    finish(inZone);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        attempt();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerPos, resolved]);

  return (
    <div className="veltriz-crime-minigame">
      <div className="veltriz-crime-minigame-title">{title}</div>
      <div className="veltriz-crime-minigame-hint">Hit the zone — press Space or tap the bar</div>
      <div className="veltriz-crime-minigame-track" onClick={attempt}>
        <div className="veltriz-crime-minigame-zone" style={{ left: `${zoneStart}%`, width: `${zoneWidth}%` }} />
        <div className="veltriz-crime-minigame-marker" style={{ left: `${markerPos}%` }} />
      </div>
      {resolved && (
        <div className={`veltriz-crime-minigame-result ${markerPos >= zoneStart && markerPos <= zoneStart + zoneWidth ? 'good' : 'bad'}`}>
          {markerPos >= zoneStart && markerPos <= zoneStart + zoneWidth ? 'Nice — going for it…' : 'Fumbled it — no attempt made.'}
        </div>
      )}
    </div>
  );
};

export default CrimeMinigame;
