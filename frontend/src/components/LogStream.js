import React, { memo } from 'react';

const LogStream = memo(({ logs }) => {
  return (
    <div className="log-stream">
      <div className="log-stream-header">SYSTEM LOG STREAM</div>
      {logs.slice(0, 50).map((log) => (
        <div key={log.id} className="log-entry">
          <span className="log-time">{log.time}</span>
          <span className={`log-type ${log.type}`}>{log.type}</span>
          <span className={`log-message ${log.type}`}>{log.message}</span>
        </div>
      ))}
    </div>
  );
});

LogStream.displayName = 'LogStream';
export default LogStream;
