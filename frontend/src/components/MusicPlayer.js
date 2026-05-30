import React, { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const MusicPlayer = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [searching, setSearching] = useState(false);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/music/now-playing`);
      const data = await res.json();
      setNowPlaying(data.track);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 5000);
    return () => clearInterval(interval);
  }, [fetchNowPlaying]);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`${API_URL}/music/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch { /* ignore */ }
    setSearching(false);
  };

  const play = async (item) => {
    try {
      await fetch(`${API_URL}/music/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: item.video_id, title: item.title }),
      });
      setNowPlaying({ title: item.title, status: 'playing', video_id: item.video_id });
    } catch { /* ignore */ }
  };

  const control = async (action) => {
    try {
      await fetch(`${API_URL}/music/${action}`, { method: 'POST' });
      if (action === 'stop') setNowPlaying(null);
      else if (action === 'pause' && nowPlaying) setNowPlaying({ ...nowPlaying, status: 'paused' });
      else if (action === 'resume' && nowPlaying) setNowPlaying({ ...nowPlaying, status: 'playing' });
    } catch { /* ignore */ }
  };

  return (
    <div className="panel-card music-panel">
      <div className="panel-header">
        <span className="panel-icon">&#9835;</span>
        <span className="panel-title">MUSIC PLAYER</span>
        <button className="terminal-close" onClick={onClose}>x</button>
      </div>
      <div className="panel-body">
        {nowPlaying && (
          <div className="now-playing">
            <div className="np-label">NOW PLAYING</div>
            <div className="np-title">{nowPlaying.title}</div>
            <div className="np-controls">
              {nowPlaying.status === 'playing' ? (
                <button className="ctrl-btn" onClick={() => control('pause')}>&#10074;&#10074;</button>
              ) : (
                <button className="ctrl-btn" onClick={() => control('resume')}>&#9654;</button>
              )}
              <button className="ctrl-btn danger" onClick={() => control('stop')}>&#9632;</button>
            </div>
          </div>
        )}
        <form className="music-search" onSubmit={(e) => { e.preventDefault(); search(); }}>
          <input
            className="music-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search music..."
          />
          <button className="music-search-btn" type="submit" disabled={searching}>
            {searching ? '...' : 'SEARCH'}
          </button>
        </form>
        <div className="music-results">
          {results.map((item) => (
            <div key={item.video_id} className="music-item" onClick={() => play(item)}>
              <img src={item.thumbnail} alt="" className="music-thumb" />
              <div className="music-info">
                <div className="music-item-title">{item.title}</div>
                <div className="music-channel">{item.channel}</div>
              </div>
              <button className="play-btn">&#9654;</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
