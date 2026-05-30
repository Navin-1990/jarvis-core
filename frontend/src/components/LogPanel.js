import React from 'react';

const LogPanel = ({ logs }) => {
  return (
    <div className="panel" style={{ flex: 1 }}>
      <div className="panel-header">Live Logs</div>
      <div className="log-container">
        {logs.length === 0 && (
          <div style={{ color: 'var(--primary-dim)', fontSize: 12, opacity: 0.5 }}>
            No activity yet
          </div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="log-item">
            <span className="log-time">{log.time}</span>
            <span className={`log-type ${log.type}`}>{log.type}</span>
            {log.agent && <span className="log-agent">[{log.agent}]</span>}
            <span className="log-message">{log.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LogPanel;
