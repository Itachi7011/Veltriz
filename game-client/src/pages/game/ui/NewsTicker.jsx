import React, { useEffect, useState } from 'react';
import { Newspaper } from 'lucide-react';
import http from '../../../lib/httpClient';

const REFRESH_INTERVAL_MS = 60000;
const ROTATE_INTERVAL_MS = 6000;

const NewsTicker = () => {
  const [articles, setArticles] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const load = () => {
      http
        .get('/api/news', { params: { page: 1, limit: 5 } })
        .then(({ data }) => setArticles(data.articles))
        .catch(() => {}); // news is a non-critical HUD enhancement — fail silently
    };
    load();
    const refreshTimer = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(refreshTimer);
  }, []);

  useEffect(() => {
    if (articles.length <= 1) return;
    const rotateTimer = setInterval(() => setIndex((i) => (i + 1) % articles.length), ROTATE_INTERVAL_MS);
    return () => clearInterval(rotateTimer);
  }, [articles.length]);

  if (articles.length === 0) return null;

  const current = articles[index % articles.length];

  return (
    <div className="veltriz-game-news-ticker">
      <Newspaper size={14} />
      <span className="veltriz-game-news-ticker-text" key={current._id}>
        {current.headline}
      </span>
    </div>
  );
};

export default NewsTicker;
