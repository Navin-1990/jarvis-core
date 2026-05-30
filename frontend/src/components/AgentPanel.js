import React from 'react';

const AGENT_ICONS = {
  assistant: '🤖',
  coding: '💻',
  device: '📺',
  file: '📁',
  website: '🌐',
};

const AgentPanel = ({ agents }) => {
  return (
    <div className="panel">
      <div className="panel-header">Agents</div>
      {Object.entries(agents).map(([name, info]) => (
        <div
          key={name}
          className={`agent-item ${info.status === 'active' ? 'active' : ''}`}
        >
          <span
            className={`agent-status-indicator ${info.status}`}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="agent-name">
              {AGENT_ICONS[name] || '⚡'} {name}
            </div>
            {info.lastAction && (
              <div className="agent-action">{info.lastAction}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AgentPanel;
