import React from 'react';

const LogStream = ({ logs }) => {
  return (
    <div className="log-stream">
      <div className="log-stream-header">SYSTEM LOG STREAM</div>
      {logs.slice(0, 50).map((log) => (
        <div key={log.id} className="stream-line">
          <span className="s-time">{log.time}</span>
          <span className={`s-tag ${log.type}`}>{log.type}</span>
          {log.agent && <span className="s-agent">[{log.agent}]</span>}
          <span className="s-msg">{log.message}</span>
        </div>
      ))}
    </div>
  );
};

export default LogStream;
