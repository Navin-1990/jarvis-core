import React, { useState, useCallback, useRef, useEffect } from 'react';

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
  const playlistRef = useRef(null);

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
    } catch {}
  }, []);

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
    <div className="panel-card music-panel">
      <audio ref={audioRef} />
      
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
              disabled={currentIndex >= currentPlaylist.length - 1}
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
      <div className="panel-body music-playlist-container" ref={playlistRef}>
        {loading && <div className="music-loading">Loading...</div>}
        
        {results.length === 0 && !searching && (
          <div className="music-empty">
            <div className="empty-icon">🎶</div>
            <div>Search for songs</div>
            <div className="empty-hint">e.g., "Alan Walker" or "Coldplay"</div>
          </div>
        )}
        
        {results.length > 0 && (
          <div className="music-results">
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
        )}
      </div>
    </div>
  );
};

export default MusicPlayer;
