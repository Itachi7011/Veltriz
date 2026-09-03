import React, { useEffect, useState, useRef } from 'react';
import gameEvents from '../gameEvents';

/**
 * A simple subtitle bar for NPC/character speech — ambient chatter,
 * political event chants, phone calls, etc. all flow through the same
 * 'subtitle:show' event so there's one place this renders.
 */
const SubtitleBar = () => {
  const [entry, setEntry] = useState(null);
  const hideTimer = useRef(null);

  useEffect(() => {
    const onShow = ({ name, text }) => {
      setEntry({ name, text, key: Date.now() });
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setEntry(null), 3600);
    };
    gameEvents.on('subtitle:show', onShow);
    return () => {
      gameEvents.off('subtitle:show', onShow);
      clearTimeout(hideTimer.current);
    };
  }, []);

  if (!entry) return null;

  return (
    <div className="veltriz-subtitle-bar" key={entry.key}>
      <span className="veltriz-subtitle-name">{entry.name}:</span> {entry.text}
    </div>
  );
};

export default SubtitleBar;
