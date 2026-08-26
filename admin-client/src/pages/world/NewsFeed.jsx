import React, { useEffect, useState } from 'react';
import { Newspaper } from 'lucide-react';
import http from '../../lib/httpClient';
import '../adminPages.css';

const NewsFeed = () => {
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    http
      .get('/api/simulation/news', { params: { page: 1, limit: 30 } })
      .then(({ data }) => setArticles(data.articles))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <div className="veltriz-adminpage-header">
        <div>
          <h1 className="veltriz-adminpage-title">
            <Newspaper size={22} /> News Feed
          </h1>
          <p className="veltriz-adminpage-subtitle">Auto-generated headlines from world events and price moves.</p>
        </div>
      </div>

      {isLoading ? (
        <p>Loading…</p>
      ) : articles.length === 0 ? (
        <div className="veltriz-adminpage-card veltriz-adminpage-empty">No news yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {articles.map((a) => (
            <div key={a._id} className="veltriz-adminpage-card" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <h3 style={{ margin: 0 }}>{a.headline}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--vza-text-secondary)', whiteSpace: 'nowrap' }}>
                  {new Date(a.createdAt).toLocaleString()}
                </span>
              </div>
              <p style={{ marginTop: 8, marginBottom: 0 }}>{a.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NewsFeed;
