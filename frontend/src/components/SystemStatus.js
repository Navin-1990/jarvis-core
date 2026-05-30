import React from 'react';

const SystemStatus = ({ status }) => {
  if (!status) {
    return (
      <div className="panel">
        <div className="panel-header">System</div>
        <div style={{ color: 'var(--primary-dim)', fontSize: 12 }}>
          Loading system info...
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-header">System</div>
      <div className="status-grid">
        <div className="status-item">
          <div className="status-label">Status</div>
          <div className="status-value" style={{ color: 'var(--secondary)' }}>
            {status.status?.toUpperCase()}
          </div>
        </div>
        <div className="status-item">
          <div className="status-label">LLM</div>
          <div className="status-value">{status.llm_model}</div>
        </div>
        <div className="status-item">
          <div className="status-label">Voice</div>
          <div className="status-value">
            {status.voice_enabled ? 'ON' : 'OFF'}
          </div>
        </div>
        <div className="status-item">
          <div className="status-label">Agents</div>
          <div className="status-value">
            {status.agents ? Object.keys(status.agents).length : 0}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;
