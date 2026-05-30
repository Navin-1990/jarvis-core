import React, { useState, useCallback, useRef } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const MusicPlayer = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const audioRef = useRef(null);

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
      if (data.results && data.results.length > 0) {
        setResults(data.results);
        setCurrentPlaylist(data.results);
        setCurrentIndex(-1);
      } else {
        setResults([]);
        setCurrentPlaylist([]);
      }
    } catch (e) {
      console.error('Search error:', e);
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
        
        // Try to play audio in browser if URL available
        if (data.track.audio_url && audioRef.current) {
          audioRef.current.src = data.track.audio_url;
          audioRef.current.play().catch(() => {});
        }
      }
    } catch (e) {
      console.error('Play error:', e);
    }
    setLoading(false);
  };

  const playNext = () => {
    if (currentIndex < currentPlaylist.length - 1) {
      playSong(currentPlaylist[currentIndex + 1], currentIndex + 1);
    }
  };

  const playPrev = () => {
    if (currentIndex > 0) {
      playSong(currentPlaylist[currentIndex - 1], currentIndex - 1);
    }
  };

  const stop = async () => {
    try {
      await fetch(`${API_URL}/music/stop`, { method: 'POST' });
    } catch {}
    setNowPlaying(null);
    setCurrentIndex(-1);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      search();
    }
  };

  return (
    <div className="music-player-panel">
      <audio ref={audioRef} />
      
      {/* Header */}
      <div className="music-header">
        <span className="music-icon">🎵</span>
        <span className="music-title">MUSIC PLAYER</span>
        <button className="music-close" onClick={onClose}>×</button>
      </div>
      
      {/* Now Playing */}
      {nowPlaying && (
        <div className="now-playing-section">
          <div className="now-playing-thumb">
            {nowPlaying.thumbnail && (
              <img src={nowPlaying.thumbnail} alt="" />
            )}
          </div>
          <div className="now-playing-info">
            <div className="now-playing-label">NOW PLAYING</div>
            <div className="now-playing-name">{nowPlaying.title}</div>
            <div className="now-playing-channel">{nowPlaying.channel}</div>
            <div className="now-playing-controls">
              <button onClick={playPrev} disabled={currentIndex <= 0}>⏮</button>
              <button onClick={stop} className="stop-btn">⏹</button>
              <button onClick={playNext} disabled={currentIndex >= currentPlaylist.length - 1}>⏭</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Search */}
      <div className="music-search-bar">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search songs (e.g., Alan Walker)"
        />
        <button onClick={search} disabled={searching}>
          {searching ? '...' : '🔍'}
        </button>
      </div>
      
      {/* Playlist */}
      <div className="music-playlist">
        {results.length === 0 && !searching && (
          <div className="music-empty">
            <div className="empty-icon">🎶</div>
            <div>Search for songs to play</div>
            <div className="empty-hint">Try "Alan Walker" or "Imagine Dragons"</div>
          </div>
        )}
        {results.map((item, index) => (
          <div 
            key={item.video_id} 
            className={`music-track ${currentIndex === index ? 'active' : ''}`}
            onClick={() => playSong(item, index)}
          >
            <div className="track-num">{index + 1}</div>
            <img src={item.thumbnail} alt="" className="track-thumb" />
            <div className="track-info">
              <div className="track-name">{item.title}</div>
              <div className="track-artist">{item.channel}</div>
            </div>
            <div className="track-play">▶</div>
          </div>
        ))}
      </div>
      
      {loading && <div className="music-loading">Loading...</div>}
    </div>
  );
};

export default MusicPlayer;
