import React, { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const MusicPlayer = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [nowPlaying, setNowPlaying] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const audioRef = useRef(null);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/music/now-playing`);
      const data = await res.json();
      if (data.track) {
        setNowPlaying(data.track);
        if (data.track.embed_url && !data.track.audio_url) {
          setShowEmbed(true);
        }
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchNowPlaying();
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
    setLoadingAudio(true);
    setShowEmbed(false);
    try {
      const res = await fetch(`${API_URL}/music/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: item.video_id, title: item.title }),
      });
      const data = await res.json();
      
      if (data.success && data.track) {
        const trackData = {
          ...data.track,
          thumbnail: item.thumbnail,
          channel: item.channel
        };
        setNowPlaying(trackData);
        
        // If we have audio URL, play in browser
        if (data.track.audio_url && audioRef.current) {
          audioRef.current.src = data.track.audio_url;
          audioRef.current.play().catch(e => console.log('Audio play failed:', e));
        }
        // If we have embed URL, show embedded player
        else if (data.track.embed_url) {
          setShowEmbed(true);
        }
      } else {
        console.log('Playback failed:', data.message);
      }
    } catch (err) {
      console.log('Play error:', err);
    }
    setLoadingAudio(false);
  };

  const control = async (action) => {
    try {
      await fetch(`${API_URL}/music/${action}`, { method: 'POST' });
      if (action === 'stop') {
        setNowPlaying(null);
        setShowEmbed(false);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
      }
      else if (action === 'pause' && audioRef.current) {
        audioRef.current.pause();
        if (nowPlaying) setNowPlaying({ ...nowPlaying, status: 'paused' });
      }
      else if (action === 'resume' && audioRef.current) {
        audioRef.current.play();
        if (nowPlaying) setNowPlaying({ ...nowPlaying, status: 'playing' });
      }
    } catch { /* ignore */ }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      search();
    }
  };

  return (
    <div className="panel-card music-panel">
      {/* Hidden audio element for playback */}
      <audio ref={audioRef} />
      
      <div className="panel-header">
        <span className="panel-icon">🎵</span>
        <span className="panel-title">MUSIC PLAYER</span>
        <button className="terminal-close" onClick={onClose}>×</button>
      </div>
      <div className="panel-body">
        {/* YouTube Embed Player */}
        {showEmbed && nowPlaying && nowPlaying.embed_url && (
          <div className="youtube-embed">
            <iframe
              src={nowPlaying.embed_url}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="YouTube Player"
            />
          </div>
        )}

        {/* Now Playing */}
        {nowPlaying && !showEmbed && (
          <div className="now-playing">
            <div className="np-label">NOW PLAYING</div>
            {nowPlaying.thumbnail && (
              <img src={nowPlaying.thumbnail} alt="" className="np-thumb" />
            )}
            <div className="np-title">{nowPlaying.title}</div>
            {nowPlaying.channel && (
              <div className="np-channel">{nowPlaying.channel}</div>
            )}
            <div className="np-controls">
              {loadingAudio ? (
                <span className="loading-text">Loading...</span>
              ) : nowPlaying.status === 'playing' ? (
                <button className="ctrl-btn" onClick={() => control('pause')} title="Pause">⏸</button>
              ) : (
                <button className="ctrl-btn" onClick={() => control('resume')} title="Play">▶</button>
              )}
              <button className="ctrl-btn danger" onClick={() => control('stop')} title="Stop">⏹</button>
            </div>
          </div>
        )}
        
        {/* Search */}
        <div className="music-search">
          <input
            className="music-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search songs... (e.g., Alan Walker)"
          />
          <button className="music-search-btn" onClick={search} disabled={searching}>
            {searching ? '...' : '🔍'}
          </button>
        </div>
        
        {/* Results */}
        <div className="music-results">
          {results.length === 0 && query && !searching && (
            <div className="music-empty">No results found</div>
          )}
          {results.map((item, index) => (
            <div key={item.video_id} className="music-item" onClick={() => play(item)}>
              <div className="music-index">{index + 1}</div>
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
    </div>
  );
};

export default MusicPlayer;
