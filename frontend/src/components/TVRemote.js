import React, { useState } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const TVRemote = ({ onClose }) => {
  const [status, setStatus] = useState(null);

  const sendAction = async (action) => {
    try {
      await fetch(`${API_URL}/device/tv/action/${action}`, { method: 'POST' });
    } catch { /* ignore */ }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_URL}/device/tv/status`);
      const data = await res.json();
      setStatus(data);
    } catch { /* ignore */ }
  };

  React.useEffect(() => { fetchStatus(); }, []);

  return (
    <div className="panel-card tv-panel">
      <div className="panel-header">
        <span className="panel-icon">&#128250;</span>
        <span className="panel-title">TV REMOTE</span>
        <button className="terminal-close" onClick={onClose}>x</button>
      </div>
      <div className="panel-body">
        {status && (
          <div className="tv-status-bar">
            <span className={`tv-power-dot ${status.power === 'active' ? 'on' : 'off'}`} />
            <span>Power: {status.power || 'unknown'}</span>
            <span>Vol: {status.volume ?? '—'}</span>
          </div>
        )}
        <div className="tv-grid">
          <button className="tv-btn power" onClick={() => sendAction('power_on')}>
            <span className="tv-btn-icon">&#9212;</span>
            <span>ON</span>
          </button>
          <button className="tv-btn power-off" onClick={() => sendAction('power_off')}>
            <span className="tv-btn-icon">&#9212;</span>
            <span>OFF</span>
          </button>

          <button className="tv-btn" onClick={() => sendAction('volume_up')}>
            <span className="tv-btn-icon">&#128266;</span>
            <span>VOL +</span>
          </button>
          <button className="tv-btn" onClick={() => sendAction('volume_down')}>
            <span className="tv-btn-icon">&#128264;</span>
            <span>VOL -</span>
          </button>
          <button className="tv-btn" onClick={() => sendAction('mute')}>
            <span className="tv-btn-icon">&#128263;</span>
            <span>MUTE</span>
          </button>

          <button className="tv-btn" onClick={() => sendAction('channel_up')}>
            <span className="tv-btn-icon">&#9650;</span>
            <span>CH +</span>
          </button>
          <button className="tv-btn" onClick={() => sendAction('channel_down')}>
            <span className="tv-btn-icon">&#9660;</span>
            <span>CH -</span>
          </button>

          <button className="tv-btn" onClick={() => sendAction('home')}>
            <span className="tv-btn-icon">&#8962;</span>
            <span>HOME</span>
          </button>
          <button className="tv-btn" onClick={() => sendAction('back')}>
            <span className="tv-btn-icon">&#8592;</span>
            <span>BACK</span>
          </button>

          <button className="tv-btn app-btn" onClick={() => sendAction('netflix')}>
            <span className="tv-btn-label">NETFLIX</span>
          </button>
          <button className="tv-btn app-btn" onClick={() => sendAction('youtube')}>
            <span className="tv-btn-label">YOUTUBE</span>
          </button>
          <button className="tv-btn app-btn" onClick={() => sendAction('prime')}>
            <span className="tv-btn-label">PRIME</span>
          </button>

          <button className="tv-btn nav" onClick={() => sendAction('up')}>&#9650;</button>
          <button className="tv-btn nav" onClick={() => sendAction('down')}>&#9660;</button>
          <button className="tv-btn nav" onClick={() => sendAction('left')}>&#9664;</button>
          <button className="tv-btn nav" onClick={() => sendAction('right')}>&#9654;</button>
          <button className="tv-btn nav ok" onClick={() => sendAction('confirm')}>OK</button>
        </div>
      </div>
    </div>
  );
};

export default TVRemote;
