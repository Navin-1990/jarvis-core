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
import VoiceAssistant from './components/VoiceAssistant';
import jarvisAudio from './components/JARVISAudio';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';

function App() {
  const [logs, setLogs] = useState([]);
  const [agents, setAgents] = useState({
    assistant: { status: 'idle', logs: [], lastAction: '' },
    coding: { status: 'idle', logs: [], lastAction: '' },
    device: { status: 'idle', logs: [], lastAction: '' },
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
  const [voiceState, setVoiceState] = useState('idle');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const wsRef = useRef(null);

  // Initialize audio on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioInitialized) {
        jarvisAudio.init();
        setAudioInitialized(true);
        document.removeEventListener('click', initAudio);
        document.removeEventListener('keydown', initAudio);
      }
    };
    document.addEventListener('click', initAudio);
    document.addEventListener('keydown', initAudio);
    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };
  }, [audioInitialized]);

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
      jarvisAudio.play('terminalOpen');
      return [...prev, agentName];
    });
  }, []);

  const closeTerminal = useCallback((agentName) => {
    jarvisAudio.play('terminalClose');
    setActiveTerminals(prev => prev.filter(a => a !== agentName));
  }, []);

  const addNotification = useCallback((type, message, data = null) => {
    const n = { id: Date.now() + Math.random(), type, message, data };
    setNotifications(prev => [n, ...prev].slice(0, 10));
    
    // Play notification sound
    jarvisAudio.play('notification');
    
    // Speak reminder announcements
    if (data?.announcement) {
      jarvisAudio.speak(data.announcement);
    }
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
        jarvisAudio.play('confirm');
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
            jarvisAudio.play('agentActivation');
            openTerminal(data.agent);
          } else if (data.type === 'agent_completed' && data.agent) {
            setAgents(prev => ({
              ...prev,
              [data.agent]: { ...prev[data.agent], status: 'completed', lastAction: data.message },
            }));
            jarvisAudio.play('agentComplete');
            setTimeout(() => {
              setAgents(prev => ({
                ...prev,
                [data.agent]: { ...prev[data.agent], status: 'idle' },
              }));
            }, 5000);
            setTimeout(() => closeTerminal(data.agent), 8000);
          } else if (data.type === 'reminder_due') {
            addNotification('reminder_due', data.message, data.data);
          } else if (data.type === 'alarm_triggered') {
            jarvisAudio.play('alert');
            addNotification('alarm_triggered', data.message);
          } else if (data.type === 'voice_started') {
            setVoiceState('speaking');
          } else if (data.type === 'voice_command') {
            setVoiceState('processing');
          }
        } catch { /* ignore parse errors */ }
      };

      ws.onclose = () => {
        setConnected(false);
        jarvisAudio.play('error');
        addLog('system', 'Neural Link Disconnected. Reconnecting...', '');
        setTimeout(connectWS, 3000);
      };

      ws.onerror = () => {
        jarvisAudio.play('error');
        ws.close();
      };
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
    setVoiceState('processing');
    addLog('command', command, 'user');
    jarvisAudio.play('voiceStart');

    try {
      const res = await fetch(`${API_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      setResponse(data.response || JSON.stringify(data));
      addLog('response', data.response || 'Done', data.agent || '');
      
      // Speak the response if voice is enabled
      if (data.response && !voiceMuted) {
        setVoiceState('speaking');
        setIsSpeaking(true);
        jarvisAudio.speak(data.response).then(() => {
          setIsSpeaking(false);
          setVoiceState('idle');
        });
      } else {
        setVoiceState('idle');
      }
      
      jarvisAudio.play('agentComplete');
    } catch (err) {
      setResponse('Connection error. Is JARVIS backend running?');
      addLog('error', err.message);
      jarvisAudio.play('error');
      jarvisAudio.speak('Connection error. Is JARVIS backend running?');
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
      if (data.muted) {
        jarvisAudio.stopSpeaking();
        jarvisAudio.speak('Voice muted, sir.');
      } else {
        jarvisAudio.speak('Voice enabled, sir.');
      }
    } catch { /* ignore */ }
  };

  // Handle voice command
  const handleVoiceCommand = useCallback(async (command, data) => {
    if (command) {
      setProcessing(true);
      setResponse(data?.response || '');
      setVoiceState('idle');
      
      if (data?.response && !voiceMuted) {
        setIsSpeaking(true);
        setVoiceState('speaking');
        jarvisAudio.speak(data.response).then(() => {
          setIsSpeaking(false);
          setVoiceState('idle');
        });
      }
      
      setProcessing(false);
    }
  }, [voiceMuted]);

  // Handle speaking state change
  const handleSpeakingChange = useCallback((speaking) => {
    setIsSpeaking(speaking);
    setVoiceState(speaking ? 'speaking' : 'idle');
  }, []);

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
          <HolographicHUD 
            processing={processing} 
            speaking={isSpeaking}
            listening={voiceState === 'listening'}
            size={70}
          />
          <div className="brand">
            <h1>J.A.R.V.I.S.</h1>
            <span className="tagline">ADVANCED AI OPERATING SYSTEM</span>
          </div>
        </div>
        <div className="header-center">
          <WeatherWidget />
        </div>
        <div className="header-right">
          {/* Voice - Mic button only */}
          <VoiceAssistant 
            onCommand={handleVoiceCommand}
            onSpeakingStateChange={handleSpeakingChange}
            apiUrl={API_URL}
            disabled={voiceMuted}
          />
          <div className={`neural-link ${connected ? 'active' : ''}`}>
            <div className="link-pulse" />
            <span>{connected ? 'LINK ACTIVE' : 'LINK OFFLINE'}</span>
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

      {/* Main workspace - Clean Layout */}
      <div className="jarvis-workspace">
        {/* Center - Arc Reactor + Command */}
        <div className="center-stage">
          <div className="arc-reactor-container">
            <HolographicHUD 
              processing={processing} 
              speaking={isSpeaking}
              listening={voiceState === 'listening'}
              size={260}
            />
            
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
        </div>

        {/* Right Panel - Agent Terminals + Music */}
        <aside className="panel-right">
          <div className="panel-header-compact">CONTROLS</div>
          <div className="terminal-layer">
            {activeTerminals.map((agentName, index) => (
              <AgentTerminal
                key={agentName}
                name={agentName}
                info={agents[agentName]}
                index={index}
                total={activeTerminals.length}
                onClose={() => closeTerminal(agentName)}
              />
            ))}
            {showMusic && <MusicPlayer onClose={() => setShowMusic(false)} />}
            {showTV && <TVRemote onClose={() => setShowTV(false)} />}
            {showAlarms && <AlarmPanel onClose={() => setShowAlarms(false)} />}
          </div>
        </aside>
      </div>

      {/* Command input - bottom */}
      <CommandOrb onSend={sendCommand} processing={processing} />
    </div>
  );
}

export default App;
