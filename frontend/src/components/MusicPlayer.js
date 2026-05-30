import React, { useState, useCallback, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Default playlist to show on open
const DEFAULT_PLAYLIST = [
  { video_id: 'EJxqjFOrV54', title: 'Alan Walker - Faded', channel: 'Alan Walker', thumbnail: 'https://i.ytimg.com/vi/EJxqjFOrV54/default.jpg' },
  { video_id: 'dy90tA3WW0k', title: 'The Weeknd - Blinding Lights', channel: 'TheWeeknd', thumbnail: 'https://i.ytimg.com/vi/dy90tA3WW0k/default.jpg' },
  { video_id: 'JGwWNGJdvx8', title: 'Ed Sheeran - Shape of You', channel: 'Ed Sheeran', thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/default.jpg' },
  { video_id: 'kJQP7kiw5Fk', title: 'Luis Fonsi - Despacito', channel: 'Luis Fonsi', thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/default.jpg' },
  { video_id: 'tgbNymZ7vqY', title: 'Journey - Separate Ways', channel: 'Journey', thumbnail: 'https://i.ytimg.com/vi/tgbNymZ7vqY/default.jpg' },
];

const MusicPlayer = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(DEFAULT_PLAYLIST);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [searching, setSearching] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch current playing track on mount
    fetchNowPlaying();
  }, []);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/music/now-playing`);
      const data = await res.json();
      if (data.track) {
        setNowPlaying(data.track);
      }
    } catch { /* ignore */ }
  }, []);

  const search = async () => {
    if (!query.trim()) {
      setResults(DEFAULT_PLAYLIST);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`${API_URL}/music/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setResults(data.results);
        setCurrentIndex(-1);
      } else {
        // Fallback to default if no results
        setResults(DEFAULT_PLAYLIST);
      }
    } catch (e) {
      console.error('Search error:', e);
      // Fallback to default on error
      setResults(DEFAULT_PLAYLIST);
    }
    setSearching(false);
  };

  const playSong = async (item, index) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/music/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: item.video_id, title: item.title }),
      });
      const data = await res.json();
      
      if (data.success && data.track) {
        setNowPlaying({ ...item, ...data.track });
        setCurrentIndex(index);
      }
    } catch (e) {
      console.error('Play error:', e);
    }
    setLoading(false);
  };

  const playNext = () => {
    if (currentIndex < results.length - 1) {
      playSong(results[currentIndex + 1], currentIndex + 1);
    }
  };

  const playPrev = () => {
    if (currentIndex > 0) {
      playSong(results[currentIndex - 1], currentIndex - 1);
    }
  };

  const stop = async () => {
    try {
      await fetch(`${API_URL}/music/stop`, { method: 'POST' });
    } catch {}
    setNowPlaying(null);
    setCurrentIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      search();
    }
  };

  return (
    <div className="panel-card music-panel">
      {/* Header */}
      <div className="panel-header">
        <span className="panel-icon">🎵</span>
        <span className="panel-title">MUSIC PLAYER</span>
        <button className="terminal-close" onClick={onClose}>×</button>
      </div>
      
      {/* Now Playing */}
      {nowPlaying && (
        <div className="now-playing">
          <div className="now-playing-header">NOW PLAYING</div>
          <div className="now-playing-content">
            {nowPlaying.thumbnail && (
              <img src={nowPlaying.thumbnail} alt="" className="now-playing-thumb" />
            )}
            <div className="now-playing-info">
              <div className="now-playing-title">{nowPlaying.title}</div>
              {nowPlaying.channel && (
                <div className="now-playing-artist">{nowPlaying.channel}</div>
              )}
            </div>
          </div>
          <div className="now-playing-controls">
            <button 
              className="ctrl-btn" 
              onClick={playPrev} 
              disabled={currentIndex <= 0}
              title="Previous"
            >
              ⏮
            </button>
            <button 
              className="ctrl-btn danger" 
              onClick={stop}
              title="Stop"
            >
              ⏹
            </button>
            <button 
              className="ctrl-btn" 
              onClick={playNext} 
              disabled={currentIndex >= results.length - 1}
              title="Next"
            >
              ⏭
            </button>
          </div>
        </div>
      )}
      
      {/* Search */}
      <div className="music-search">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search songs..."
          className="music-input"
        />
        <button 
          className="music-search-btn" 
          onClick={search} 
          disabled={searching}
        >
          {searching ? '...' : '🔍'}
        </button>
      </div>
      
      {/* Playlist - Scrollable */}
      <div className="panel-body music-playlist-container">
        {loading && <div className="music-loading">Loading...</div>}
        
        {results.map((item, index) => (
          <div 
            key={item.video_id} 
            className={`music-item ${currentIndex === index ? 'active' : ''}`}
            onClick={() => playSong(item, index)}
          >
            <div className="music-item-num">{index + 1}</div>
            <img src={item.thumbnail} alt="" className="music-thumb" />
            <div className="music-info">
              <div className="music-item-title">{item.title}</div>
              <div className="music-channel">{item.channel}</div>
            </div>
            <button className="play-btn">▶</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MusicPlayer;
