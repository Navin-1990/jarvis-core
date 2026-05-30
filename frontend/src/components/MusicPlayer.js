import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Howl } from 'howler';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Default playlist - popular songs
const DEFAULT_PLAYLIST = [
  { id: '1', video_id: 'L_jWHffIx5E', title: 'Smash Into Pieces - Unstoppable', channel: 'Smash Into Pieces', thumbnail: 'https://i.ytimg.com/vi/L_jWHffIx5E/mqdefault.jpg', duration: '3:33' },
  { id: '2', video_id: 'p7YXXnFfnWI', title: 'Alan Walker - Force', channel: 'Alan Walker', thumbnail: 'https://i.ytimg.com/vi/p7YXXnFfnWI/mqdefault.jpg', duration: '3:28' },
  { id: '3', video_id: '60ItHLz5WEA', title: 'Alan Walker - Sing Me To Sleep', channel: 'Alan Walker', thumbnail: 'https://i.ytimg.com/vi/60ItHLz5WEA/mqdefault.jpg', duration: '3:12' },
  { id: '4', video_id: 'k4V3Mo43dWc', title: 'Alan Walker - Darkside', channel: 'Alan Walker', thumbnail: 'https://i.ytimg.com/vi/k4V3Mo43dWc/mqdefault.jpg', duration: '3:32' },
  { id: '5', video_id: 'M-P4QBt3WCE', title: 'Alan Walker - Different World', channel: 'Alan Walker', thumbnail: 'https://i.ytimg.com/vi/M-P4QBt3WCE/mqdefault.jpg', duration: '3:30' },
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
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('none'); // none, one, all
  const soundRef = useRef(null);
  const progressInterval = useRef(null);

  const getAudioUrl = useCallback(async (videoId) => {
    try {
      const res = await fetch(`${API_URL}/music/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: videoId, title: 'Loading...' }),
      });
      const data = await res.json();
      return data.track?.audio_url || null;
    } catch { return null; }
  }, []);

  const playTrack = async (track, index) => {
    if (soundRef.current) {
      soundRef.current.unload();
      soundRef.current = null;
    }
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }
    
    setIsLoading(true);
    setCurrentTrack(track);
    setCurrentIndex(index);

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
          progressInterval.current = setInterval(() => {
            if (soundRef.current) setProgress(soundRef.current.seek());
          }, 1000);
        },
        onend: () => {
          if (repeat === 'one') playTrack(track, index);
          else if (repeat === 'all' && currentIndex === playlist.length - 1) playTrack(playlist[0], 0);
          else playNext();
        },
        onpause: () => setIsPlaying(false),
        onstop: () => setIsPlaying(false),
        onerror: () => { setIsPlaying(false); setIsLoading(false); }
      });
      
      soundRef.current = sound;
      sound.play();
    } else {
      setIsPlaying(false);
      setIsLoading(false);
      setDuration(180);
    }
  };

  const togglePlay = () => {
    if (!soundRef.current || !currentTrack) return;
    if (isPlaying) soundRef.current.pause();
    else soundRef.current.play();
  };

  const playNext = () => {
    let nextIndex;
    if (shuffle) {
      nextIndex = Math.floor(Math.random() * playlist.length);
      while (nextIndex === currentIndex && playlist.length > 1) {
        nextIndex = Math.floor(Math.random() * playlist.length);
      }
    } else {
      nextIndex = currentIndex < playlist.length - 1 ? currentIndex + 1 : 0;
    }
    playTrack(playlist[nextIndex], nextIndex);
  };

  const playPrev = () => {
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : playlist.length - 1;
    playTrack(playlist[prevIndex], prevIndex);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (soundRef.current) soundRef.current.volume(newVolume);
  };

  const handleSeek = (e) => {
    const seekTime = parseFloat(e.target.value);
    if (soundRef.current) { soundRef.current.seek(seekTime); setProgress(seekTime); }
  };

  const searchTracks = async () => {
    if (!searchQuery.trim()) { setPlaylist(DEFAULT_PLAYLIST); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/music/search`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });
      const data = await res.json();
      if (data.results?.length > 0) {
        setPlaylist(data.results.map((r, i) => ({ id: String(i+1), video_id: r.video_id, title: r.title, channel: r.channel || 'Unknown', thumbnail: r.thumbnail || '', duration: '3:30' })));
        setCurrentIndex(-1); setCurrentTrack(null);
      }
    } catch (e) { console.error('Search error:', e); }
    setIsLoading(false); setShowSearch(false);
  };

  const stop = () => {
    if (soundRef.current) { soundRef.current.stop(); soundRef.current.unload(); soundRef.current = null; }
    if (progressInterval.current) clearInterval(progressInterval.current);
    setIsPlaying(false); setCurrentTrack(null); setCurrentIndex(-1); setProgress(0);
  };

  useEffect(() => () => {
    if (soundRef.current) soundRef.current.unload();
    if (progressInterval.current) clearInterval(progressInterval.current);
  }, []);

  const formatTime = (s) => { if (isNaN(s)) return '0:00'; return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`; };

  return (
    <div className="music-player-panel">
      {/* Header */}
      <div className="music-panel-header">
        <span className="music-icon">🎵</span>
        <span className="music-panel-title">MUSIC PLAYER</span>
        <button className="music-panel-close" onClick={onClose}>×</button>
      </div>

      {/* Now Playing */}
      {currentTrack && (
        <div className="now-playing-mini">
          <img src={currentTrack.thumbnail} alt="" className="now-playing-thumb" />
          <div className="now-playing-info">
            <div className="now-playing-title">{currentTrack.title}</div>
            <div className="now-playing-artist">{currentTrack.channel}</div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="music-panel-controls">
        <div className="controls-row">
          <button className={`ctrl-btn-sm ${shuffle ? 'active' : ''}`} onClick={() => setShuffle(!shuffle)} title="Shuffle">🔀</button>
          <button className="ctrl-btn-sm" onClick={playPrev} title="Previous">⏮</button>
          <button className="ctrl-btn-play" onClick={togglePlay} disabled={!currentTrack || isLoading}>
            {isLoading ? '...' : isPlaying ? '⏸' : '▶'}
          </button>
          <button className="ctrl-btn-sm" onClick={playNext} title="Next">⏭</button>
          <button className={`ctrl-btn-sm ${repeat !== 'none' ? 'active' : ''}`} onClick={() => setRepeat(repeat === 'none' ? 'all' : repeat === 'all' ? 'one' : 'none')} title="Repeat">
            {repeat === 'one' ? '🔂' : '🔁'}
          </button>
        </div>
        
        {/* Progress */}
        {currentTrack && (
          <div className="progress-row">
            <span className="time-label">{formatTime(progress)}</span>
            <input type="range" min="0" max={duration || 180} value={progress} onChange={handleSeek} className="progress-bar" />
            <span className="time-label">{formatTime(duration)}</span>
          </div>
        )}

        {/* Volume */}
        <div className="volume-row">
          <span className="volume-icon">🔊</span>
          <input type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolumeChange} className="volume-bar" />
          <button className="ctrl-btn-sm" onClick={stop} title="Stop">⏹</button>
        </div>
      </div>

      {/* Search */}
      <div className="music-search-bar">
        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search songs..." onKeyDown={(e) => e.key === 'Enter' && searchTracks()} />
        <button onClick={searchTracks} disabled={isLoading}>🔍</button>
      </div>

      {/* Playlist */}
      <div className="music-playlist">
        {playlist.map((track, idx) => (
          <div key={track.id} className={`track-row ${currentIndex === idx ? 'active' : ''}`} onClick={() => playTrack(track, idx)}>
            <span className="track-num">{idx + 1}</span>
            <img src={track.thumbnail} alt="" className="track-thumb" />
            <div className="track-info">
              <div className="track-title">{track.title}</div>
              <div className="track-artist">{track.channel}</div>
            </div>
            <span className="track-dur">{track.duration}</span>
            {currentIndex === idx && isPlaying && <span className="playing-indicator">▶</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MusicPlayer;