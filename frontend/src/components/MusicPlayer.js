import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Howl, Howler } from 'howler';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Default playlist - popular songs with working YouTube IDs
const DEFAULT_PLAYLIST = [
  { 
    id: '1', 
    video_id: 'L_jWHffIx5E', 
    title: 'Smash Into Pieces - Unstoppable', 
    channel: 'Smash Into Pieces',
    thumbnail: 'https://i.ytimg.com/vi/L_jWHffIx5E/mqdefault.jpg',
    duration: '3:33'
  },
  { 
    id: '2', 
    video_id: 'p7YXXnFfnWI', 
    title: 'Alan Walker - Force', 
    channel: 'Alan Walker',
    thumbnail: 'https://i.ytimg.com/vi/p7YXXnFfnWI/mqdefault.jpg',
    duration: '3:28'
  },
  { 
    id: '3', 
    video_id: '60ItHLz5WEA', 
    title: 'Alan Walker - Sing Me To Sleep', 
    channel: 'Alan Walker',
    thumbnail: 'https://i.ytimg.com/vi/60ItHLz5WEA/mqdefault.jpg',
    duration: '3:12'
  },
  { 
    id: '4', 
    video_id: 'k4V3Mo43dWc', 
    title: 'Alan Walker - Darkside', 
    channel: 'Alan Walker',
    thumbnail: 'https://i.ytimg.com/vi/k4V3Mo43dWc/mqdefault.jpg',
    duration: '3:32'
  },
  { 
    id: '5', 
    video_id: 'M-P4QBt3WCE', 
    title: 'Alan Walker - Different World', 
    channel: 'Alan Walker',
    thumbnail: 'https://i.ytimg.com/vi/M-P4QBt3WCE/mqdefault.jpg',
    duration: '3:30'
  },
];

const MusicPlayer = ({ onClose }) => {
  const [playlist, setPlaylist] = useState(DEFAULT_PLAYLIST);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const soundRef = useRef(null);
  const progressInterval = useRef(null);

  // Get audio URL for a video
  const getAudioUrl = useCallback(async (videoId) => {
    try {
      const res = await fetch(`${API_URL}/music/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: videoId, title: 'Loading...' }),
      });
      const data = await res.json();
      return data.track?.audio_url || null;
    } catch {
      return null;
    }
  }, []);

  // Play a track
  const playTrack = async (track, index) => {
    if (soundRef.current) {
      soundRef.current.unload();
    }
    
    setIsLoading(true);
    setCurrentTrack(track);
    setCurrentIndex(index);

    // Try to get audio URL from backend
    const audioUrl = await getAudioUrl(track.video_id);
    
    if (audioUrl) {
      const sound = new Howl({
        src: [audioUrl],
        html5: true,
        volume: volume,
        onplay: () => {
          setIsPlaying(true);
          setIsLoading(false);
          setDuration(sound.duration());
        },
        onend: () => {
          playNext();
        },
        onerror: () => {
          setIsPlaying(false);
          setIsLoading(false);
        }
      });
      
      soundRef.current = sound;
      sound.play();
      
      // Update progress
      progressInterval.current = setInterval(() => {
        if (soundRef.current) {
          setProgress(soundRef.current.seek());
        }
      }, 1000);
    } else {
      // Fallback - just show the track without audio
      setIsPlaying(false);
      setIsLoading(false);
      setDuration(180); // Default 3 min
    }
  };

  const togglePlay = () => {
    if (!soundRef.current || !currentTrack) return;
    
    if (isPlaying) {
      soundRef.current.pause();
      setIsPlaying(false);
    } else {
      soundRef.current.play();
      setIsPlaying(true);
    }
  };

  const playNext = () => {
    if (currentIndex < playlist.length - 1) {
      playTrack(playlist[currentIndex + 1], currentIndex + 1);
    }
  };

  const playPrev = () => {
    if (currentIndex > 0) {
      playTrack(playlist[currentIndex - 1], currentIndex - 1);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (soundRef.current) {
      soundRef.current.volume(newVolume);
    }
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    if (soundRef.current) {
      soundRef.current.seek(seekTime);
      setProgress(seekTime);
    }
  };

  const searchTracks = async () => {
    if (!searchQuery.trim()) {
      setPlaylist(DEFAULT_PLAYLIST);
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/music/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setPlaylist(data.results.map((r, i) => ({
          id: String(i + 1),
          video_id: r.video_id,
          title: r.title,
          channel: r.channel || 'Unknown',
          thumbnail: r.thumbnail || '',
          duration: '3:30'
        })));
        setCurrentIndex(-1);
        setCurrentTrack(null);
      }
    } catch (e) {
      console.error('Search error:', e);
    }
    setIsLoading(false);
    setShowSearch(false);
  };

  const stop = () => {
    if (soundRef.current) {
      soundRef.current.stop();
      soundRef.current.unload();
      soundRef.current = null;
    }
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    setIsPlaying(false);
    setCurrentTrack(null);
    setCurrentIndex(-1);
    setProgress(0);
  };

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unload();
      }
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="music-mode">
      {/* Header */}
      <div className="music-header">
        <span className="music-icon">🎵</span>
        <span className="music-title">IRON MAN MUSIC</span>
        <button className="music-close" onClick={onClose}>×</button>
      </div>

      {/* Main Content */}
      <div className="music-content">
        {/* Playlist Panel - Left */}
        <div className="music-playlist-panel">
          <div className="playlist-header">
            <span>PLAYLIST</span>
            <button 
              className="search-toggle" 
              onClick={() => setShowSearch(!showSearch)}
            >
              🔍
            </button>
          </div>
          
          {showSearch && (
            <div className="music-search">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search songs..."
                onKeyDown={(e) => e.key === 'Enter' && searchTracks()}
              />
              <button onClick={searchTracks}>🔍</button>
            </div>
          )}
          
          <div className="playlist-tracks">
            {playlist.map((track, index) => (
              <div 
                key={track.id}
                className={`track-item ${currentIndex === index ? 'active' : ''}`}
                onClick={() => playTrack(track, index)}
              >
                <img src={track.thumbnail} alt="" className="track-thumb" />
                <div className="track-info">
                  <div className="track-name">{track.title}</div>
                  <div className="track-artist">{track.channel}</div>
                </div>
                <span className="track-duration">{track.duration}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Visualizer Panel - Center */}
        <div className="music-visualizer-panel">
          <div className={`audio-visualizer ${isPlaying ? 'playing' : ''}`}>
            <div className="arc-reactor-music">
              <div className="arc-core" />
              <div className="arc-ring ring-1" />
              <div className="arc-ring ring-2" />
              <div className="arc-ring ring-3" />
            </div>
          </div>
          
          {/* Now Playing Info */}
          {currentTrack ? (
            <div className="now-playing-info">
              <img src={currentTrack.thumbnail} alt="" className="album-art" />
              <div className="song-title">{currentTrack.title}</div>
              <div className="song-artist">{currentTrack.channel}</div>
            </div>
          ) : (
            <div className="now-playing-info">
              <div className="arc-reactor-music">
                <div className="arc-core" />
                <div className="arc-ring ring-1" />
                <div className="arc-ring ring-2" />
              </div>
              <div className="song-title">Select a track</div>
              <div className="song-artist">from the playlist</div>
            </div>
          )}
        </div>
      </div>

      {/* Controls Panel - Bottom */}
      <div className="music-controls">
        <div className="controls-left">
          {currentTrack && (
            <span className="current-time">{formatTime(progress)}</span>
          )}
        </div>
        
        <div className="controls-center">
          <button className="ctrl-btn" onClick={playPrev} title="Previous">
            ⏮
          </button>
          <button className="ctrl-btn play-btn-main" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
            {isLoading ? '...' : isPlaying ? '⏸' : '▶'}
          </button>
          <button className="ctrl-btn" onClick={playNext} title="Next">
            ⏭
          </button>
          <button className="ctrl-btn danger" onClick={stop} title="Stop">
            ⏹
          </button>
        </div>

        {/* Progress Bar */}
        {currentTrack && (
          <div className="progress-section">
            <input
              type="range"
              min="0"
              max={duration}
              value={progress}
              onChange={handleSeek}
              className="progress-slider"
            />
          </div>
        )}

        <div className="controls-right">
          <span className="volume-label">🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="volume-slider"
          />
          {currentTrack && (
            <span className="total-time">{formatTime(duration)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;