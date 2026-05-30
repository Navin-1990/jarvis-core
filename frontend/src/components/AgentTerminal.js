import React, { useState, useEffect, useRef } from 'react';

const AgentTerminal = ({ name, info, index, total, onClose }) => {
  const [closing, setClosing] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = 0;
    }
  }, [info.logs]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 300);
  };

  const logs = info.logs || [];

  return (
    <div className={`agent-terminal ${closing ? 'closing' : ''}`}>
      <div className="terminal-scanline" />
      <div className="terminal-header">
        <div className="terminal-title">
          <span className={`terminal-dot ${info.status}`} />
          <span className="terminal-name">{name.toUpperCase()}</span>
          <span className={`terminal-status-badge ${info.status}`}>
            {info.status === 'active' ? 'EXECUTING' : info.status === 'completed' ? 'COMPLETE' : 'STANDBY'}
          </span>
        </div>
        <button className="terminal-close" onClick={handleClose}>x</button>
      </div>
      <div className="terminal-body" ref={bodyRef}>
        {logs.length === 0 ? (
          <div style={{ color: 'var(--primary-dim)', opacity: 0.4, fontFamily: 'var(--font-hud)', fontSize: 9, letterSpacing: 2 }}>
            AWAITING INSTRUCTIONS...
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={log.id} className="terminal-line" style={{ animationDelay: `${i * 0.05}s` }}>
              <span className="t-time">{log.time}</span>
              <span className={`t-type ${log.type}`}>{log.type}</span>
              <span className="t-msg">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AgentTerminal;
