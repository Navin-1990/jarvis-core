import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import HolographicHUD from './components/HolographicHUD';
import AgentTerminal from './components/AgentTerminal';
import CommandOrb from './components/CommandOrb';
import SystemArc from './components/SystemArc';
import LogStream from './components/LogStream';
import MusicPlayer from './components/MusicPlayer';
import TVRemote from './components/TVRemote';
import WeatherWidget from './components/WeatherWidget';
import AlarmPanel from './components/AlarmPanel';
import NotificationToast from './components/NotificationToast';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';

function App() {
  const [logs, setLogs] = useState([]);
  const [agents, setAgents] = useState({
    assistant: { status: 'idle', logs: [], lastAction: '' },
    coding: { status: 'idle', logs: [], lastAction: '' },
    device: { status: 'idle', logs: [], lastAction: '' },
    file: { status: 'idle', logs: [], lastAction: '' },
    website: { status: 'idle', logs: [], lastAction: '' },
  });
  const [activeTerminals, setActiveTerminals] = useState([]);
  const [systemStatus, setSystemStatus] = useState(null);
  const [connected, setConnected] = useState(false);
  const [response, setResponse] = useState('');
  const [processing, setProcessing] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [showTV, setShowTV] = useState(false);
  const [showAlarms, setShowAlarms] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const wsRef = useRef(null);

  const addLog = useCallback((type, message, agent = '') => {
    const entry = {
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString(),
      type, message, agent,
    };
    setLogs(prev => [entry, ...prev].slice(0, 200));

    if (agent && agent !== 'user') {
      setAgents(prev => ({
        ...prev,
        [agent]: {
          ...prev[agent],
          logs: [entry, ...(prev[agent]?.logs || [])].slice(0, 50),
        },
      }));
    }
  }, []);

  const openTerminal = useCallback((agentName) => {
    setActiveTerminals(prev => {
      if (prev.includes(agentName)) return prev;
      return [...prev, agentName];
    });
  }, []);

  const closeTerminal = useCallback((agentName) => {
    setActiveTerminals(prev => prev.filter(a => a !== agentName));
  }, []);

  const addNotification = useCallback((type, message) => {
    const n = { id: Date.now() + Math.random(), type, message };
    setNotifications(prev => [n, ...prev].slice(0, 10));
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  useEffect(() => {
    const connectWS = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        addLog('system', 'JARVIS Neural Link Established', '');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          addLog(data.type || 'event', data.message || JSON.stringify(data), data.agent || '');

          if (data.type === 'agent_started' && data.agent) {
            setAgents(prev => ({
              ...prev,
              [data.agent]: { ...prev[data.agent], status: 'active', lastAction: data.message },
            }));
            openTerminal(data.agent);
          } else if (data.type === 'agent_completed' && data.agent) {
            setAgents(prev => ({
              ...prev,
              [data.agent]: { ...prev[data.agent], status: 'completed', lastAction: data.message },
            }));
            setTimeout(() => {
              setAgents(prev => ({
                ...prev,
                [data.agent]: { ...prev[data.agent], status: 'idle' },
              }));
            }, 5000);
            setTimeout(() => closeTerminal(data.agent), 8000);
          } else if (data.type === 'reminder_due') {
            addNotification('reminder_due', data.message);
          } else if (data.type === 'alarm_triggered') {
            addNotification('alarm_triggered', data.message);
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onclose = () => {
        setConnected(false);
        addLog('system', 'Neural Link Disconnected. Reconnecting...', '');
        setTimeout(connectWS, 3000);
      };

      ws.onerror = () => ws.close();
    };

    connectWS();
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [addLog, openTerminal, closeTerminal, addNotification]);

  useEffect(() => {
    fetch(`${API_URL}/system/status`)
      .then(r => r.json())
      .then(data => {
        setSystemStatus(data);
        if (data.voice_muted !== undefined) setVoiceMuted(data.voice_muted);
      })
      .catch(() => {});
  }, []);

  const sendCommand = async (command) => {
    setProcessing(true);
    setResponse('');
    addLog('command', command, 'user');

    try {
      const res = await fetch(`${API_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      setResponse(data.response || JSON.stringify(data));
      addLog('response', data.response || 'Done', data.agent || '');
    } catch (err) {
      setResponse('Connection error. Is JARVIS backend running?');
      addLog('error', err.message);
    }
    setProcessing(false);
  };

  const toggleTerminal = (agentName) => {
    if (activeTerminals.includes(agentName)) {
      closeTerminal(agentName);
    } else {
      openTerminal(agentName);
    }
  };

  const toggleVoiceMute = async () => {
    try {
      const res = await fetch(`${API_URL}/voice/toggle-mute`, { method: 'POST' });
      const data = await res.json();
      setVoiceMuted(data.muted);
    } catch { /* ignore */ }
  };

  return (
    <div className="jarvis-cinematic">
      <div className="grid-overlay" />
      <div className="vignette" />

      {/* Floating particles */}
      <div className="particles">
        {Array.from({ length: 30 }, (_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${6 + Math.random() * 8}s`,
            }}
          />
        ))}
      </div>

      {/* Notifications */}
      <NotificationToast notifications={notifications} onDismiss={dismissNotification} />

      {/* Header */}
      <header className="hud-header">
        <div className="header-left">
          <HolographicHUD processing={processing} />
          <div className="brand">
            <h1>J.A.R.V.I.S.</h1>
            <span className="tagline">ADVANCED AI OPERATING SYSTEM</span>
          </div>
        </div>
        <div className="header-center">
          <WeatherWidget />
          <SystemArc status={systemStatus} connected={connected} />
        </div>
        <div className="header-right">
          <button
            className={`voice-mute-btn ${voiceMuted ? 'muted' : ''}`}
            onClick={toggleVoiceMute}
            title={voiceMuted ? 'Voice muted' : 'Voice enabled'}
          >
            <span className="mute-icon">{voiceMuted ? '\u{1F507}' : '\u{1F50A}'}</span>
            <span className="mute-label">{voiceMuted ? 'MUTED' : 'VOICE'}</span>
          </button>
          <div className={`neural-link ${connected ? 'active' : ''}`}>
            <div className="link-pulse" />
            <span>{connected ? 'NEURAL LINK ACTIVE' : 'LINK OFFLINE'}</span>
          </div>
        </div>
      </header>

      {/* Agent selector bar */}
      <div className="agent-bar">
        <div className="agent-tabs-scroll">
          {Object.entries(agents).map(([name, info]) => (
            <button
              key={name}
              className={`agent-tab ${info.status} ${activeTerminals.includes(name) ? 'open' : ''}`}
              onClick={() => toggleTerminal(name)}
            >
              <span className="tab-indicator" />
              <span className="tab-name">{name.toUpperCase()}</span>
              <span className={`tab-status ${info.status}`}>
                {info.status === 'active' ? 'RUNNING' : info.status === 'completed' ? 'DONE' : 'STANDBY'}
              </span>
            </button>
          ))}

          {/* Feature tabs */}
          <button
            className={`agent-tab feature-tab ${showMusic ? 'open' : ''}`}
            onClick={() => setShowMusic(!showMusic)}
          >
            <span className="tab-indicator" style={{ background: '#ff6b9d' }} />
            <span className="tab-name">MUSIC</span>
          </button>
          <button
            className={`agent-tab feature-tab ${showTV ? 'open' : ''}`}
            onClick={() => setShowTV(!showTV)}
          >
            <span className="tab-indicator" style={{ background: '#ffaa00' }} />
            <span className="tab-name">TV REMOTE</span>
          </button>
          <button
            className={`agent-tab feature-tab ${showAlarms ? 'open' : ''}`}
            onClick={() => setShowAlarms(!showAlarms)}
          >
            <span className="tab-indicator" style={{ background: '#00ff88' }} />
            <span className="tab-name">ALARMS</span>
          </button>
        </div>
      </div>

      {/* Main workspace */}
      <div className="workspace">
        {/* Floating agent terminals */}
        <div className="terminal-layer">
          {activeTerminals.map((agentName) => (
            <AgentTerminal
              key={agentName}
              name={agentName}
              info={agents[agentName]}
              onClose={() => closeTerminal(agentName)}
            />
          ))}

          {showMusic && <MusicPlayer onClose={() => setShowMusic(false)} />}
          {showTV && <TVRemote onClose={() => setShowTV(false)} />}
          {showAlarms && <AlarmPanel onClose={() => setShowAlarms(false)} />}
        </div>

        {/* Central response area */}
        <div className="center-stage">
          <div className="response-hologram">
            <div className="hologram-border top-left" />
            <div className="hologram-border top-right" />
            <div className="hologram-border bottom-left" />
            <div className="hologram-border bottom-right" />
            <div className="response-label">JARVIS OUTPUT</div>
            <div className="response-text">
              {response || 'Systems nominal. Awaiting your command, sir.'}
            </div>
          </div>
        </div>

        {/* Log stream - bottom */}
        <LogStream logs={logs} />
      </div>

      {/* Command input - bottom */}
      <CommandOrb onSend={sendCommand} processing={processing} />
    </div>
  );
}

export default App;
