import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import './App.css';
import HolographicHUD from './components/HolographicHUD';
import AgentTerminal from './components/AgentTerminal';
import SystemArc from './components/SystemArc';
import LogStream from './components/LogStream';
import MusicPlayer from './components/MusicPlayer';
import TVRemote from './components/TVRemote';
import WeatherWidget from './components/WeatherWidget';
import AlarmPanel from './components/AlarmPanel';
import NotificationToast from './components/NotificationToast';
import VoiceAssistant from './components/VoiceAssistant';
import ReminderPanel from './components/ReminderPanel';
import jarvisAudio from './components/JARVISAudio';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';

// Memoized components for performance
const MemoizedHolographicHUD = memo(HolographicHUD);
const MemoizedWeatherWidget = memo(WeatherWidget);
const MemoizedNotificationToast = memo(NotificationToast);
const MemoizedVoiceAssistant = memo(VoiceAssistant);

// Simplified agents: 5 primary agents
const PRIMARY_AGENTS = [
  { key: 'assistant', label: 'ASSISTANT', color: '#00d4ff' },
  { key: 'coding', label: 'CODING', color: '#00ff88' },
  { key: 'device', label: 'DEVICE', color: '#ffaa00' },
  { key: 'media', label: 'MEDIA', color: '#ff6b9d' },
  { key: 'tasks', label: 'TASKS', color: '#7b68ee' },
];

function App() {
  // State management
  const [logs, setLogs] = useState([]);
  const [agents, setAgents] = useState({
    assistant: { status: 'idle', logs: [], lastAction: '' },
    coding: { status: 'idle', logs: [], lastAction: '' },
    device: { status: 'idle', logs: [], lastAction: '' },
    media: { status: 'idle', logs: [], lastAction: '' },
    tasks: { status: 'idle', logs: [], lastAction: '' },
  });
  
  // Current time for header
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Conversation history for chat
  const [messages, setMessages] = useState([
    { id: 1, role: 'system', content: 'Systems nominal. Awaiting your command, sir.' }
  ]);
  
  // Active panels
  const [activePanel, setActivePanel] = useState(null); // 'logs' | 'agents' | 'music' | 'tv' | 'alarms' | 'reminders' | null
  const [activeTerminals, setActiveTerminals] = useState([]);
  
  // System state
  const [systemStatus, setSystemStatus] = useState(null);
  const [connected, setConnected] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(false);
  const [voiceState, setVoiceState] = useState('idle'); // idle, listening, processing, speaking
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const [musicAvailable, setMusicAvailable] = useState(false);
  
  const wsRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  // Check music availability
  useEffect(() => {
    fetch(`${API_URL}/music/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'test' })
    })
      .then(r => r.json())
      .then(data => setMusicAvailable(data.results?.length > 0))
      .catch(() => setMusicAvailable(false));
  }, []);

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
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'system',
      content: `🔔 ${message}`
    }]);
    jarvisAudio.play('notification');
    
    if (data?.announcement) {
      jarvisAudio.speak(data.announcement);
    }
  }, []);

  const dismissNotification = useCallback((id) => {
    // Notifications handled differently now
  }, []);

  // WebSocket connection
  useEffect(() => {
    const connectWS = () => {
      try {
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
      } catch {
        setTimeout(connectWS, 3000);
      }
    };

    connectWS();
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [addLog, openTerminal, closeTerminal, addNotification]);

  // Fetch system status
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
    if (!command.trim() || processing) return;
    
    setProcessing(true);
    setVoiceState('processing');
    addLog('command', command, 'user');
    jarvisAudio.play('voiceStart');

    // Add user message to chat
    const userMsgId = Date.now();
    setMessages(prev => [...prev, {
      id: userMsgId,
      role: 'user',
      content: command
    }]);

    const currentInput = command;
    setCommandInput('');

    try {
      const res = await fetch(`${API_URL}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: currentInput }),
      });
      const data = await res.json();
      
      // Add assistant response to chat
      const responseText = data.response || 'Command processed.';
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: responseText,
        agent: data.agent
      }]);
      
      addLog('response', responseText, data.agent || '');
      
      if (responseText && !voiceMuted) {
        setVoiceState('speaking');
        setIsSpeaking(true);
        jarvisAudio.speak(responseText).then(() => {
          setIsSpeaking(false);
          setVoiceState('idle');
        });
      } else {
        setVoiceState('idle');
      }
      
      jarvisAudio.play('agentComplete');
    } catch (err) {
      const errorMsg = 'Connection error. Is JARVIS backend running?';
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: errorMsg,
        agent: 'system'
      }]);
      addLog('error', err.message);
      jarvisAudio.play('error');
      jarvisAudio.speak(errorMsg);
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

  const handleVoiceCommand = useCallback(async (command, data) => {
    if (command) {
      setProcessing(true);
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

  const handleSpeakingChange = useCallback((speaking) => {
    setIsSpeaking(speaking);
    setVoiceState(speaking ? 'speaking' : 'idle');
  }, []);

  // Get AI status based on current state
  const getAIStatus = () => {
    if (isSpeaking || voiceState === 'speaking') return 'speaking';
    if (processing || voiceState === 'processing') return 'thinking';
    if (voiceState === 'listening') return 'listening';
    return 'idle';
  };

  // Format time
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Memoized handlers
  const handleCommandKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendCommand(commandInput);
    }
  }, [commandInput]);

  const togglePanel = useCallback((panel) => {
    setActivePanel(prev => prev === panel ? null : panel);
  }, []);

  return (
    <div className="jarvis-cinematic">
      {/* Background effects */}
      <div className="grid-overlay" />
      <div className="vignette" />
      <div className="particles">
        {useMemo(() => Array.from({ length: 20 }, (_, i) => (
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
        )), [])}
      </div>

      {/* Notifications */}
      <MemoizedNotificationToast notifications={[]} onDismiss={dismissNotification} />

      {/* ═══ HEADER ══════════════════════════════════════════════════════ */}
      <header className="hud-header">
        {/* LEFT: Logo, Time, Date */}
        <div className="header-left">
          <div className="jarvis-logo">
            <span className="logo-icon">◇</span>
            <div className="logo-text">
              <h1>JARVIS</h1>
              <span className="logo-sub">AI OPERATING SYSTEM</span>
            </div>
          </div>
          <div className="header-time-date">
            <div className="time-display">{formatTime(currentTime)}</div>
            <div className="date-display">{formatDate(currentTime)}</div>
          </div>
        </div>

        {/* CENTER: AI Status */}
        <div className="header-center">
          <div className="ai-status-container">
            <MemoizedHolographicHUD 
              processing={processing} 
              speaking={isSpeaking}
              listening={voiceState === 'listening'}
              size={60}
            />
            <div className="ai-status-text">
              <span className="status-label">AI STATUS</span>
              <span className={`status-value ${getAIStatus()}`}>
                {getAIStatus().toUpperCase()}
              </span>
            </div>
          </div>
          <SystemArc status={systemStatus} connected={connected} />
        </div>

        {/* RIGHT: Weather, Profile, Settings */}
        <div className="header-right">
          <MemoizedWeatherWidget />
          <div className="user-section">
            <div className="user-profile">
              <span className="profile-icon">👤</span>
              <span className="profile-name">User</span>
            </div>
            <button className="settings-btn" title="Settings">⚙️</button>
          </div>
          <button
            className={`voice-mute-btn ${voiceMuted ? 'muted' : ''}`}
            onClick={toggleVoiceMute}
            title={voiceMuted ? 'Voice muted' : 'Voice enabled'}
          >
            <span className="mute-icon">{voiceMuted ? '🔇' : '🔊'}</span>
          </button>
          <div className={`neural-link ${connected ? 'active' : ''}`}>
            <div className="link-pulse" />
          </div>
        </div>
      </header>

      {/* ═══ MAIN LAYOUT ══════════════════════════════════════════════════ */}
      <div className="main-layout">
        
        {/* LEFT SIDEBAR: System Logs */}
        <aside className={`sidebar sidebar-logs ${activePanel === 'logs' ? 'active' : ''}`}>
          <div className="sidebar-header">
            <span className="sidebar-icon">📋</span>
            <span className="sidebar-title">SYSTEM LOGS</span>
            <button className="sidebar-toggle" onClick={() => togglePanel('logs')}>
              {activePanel === 'logs' ? '▼' : '◀'}
            </button>
          </div>
          <div className="sidebar-content">
            <LogStream logs={logs} />
          </div>
        </aside>

        {/* CENTER: Arc Reactor + Chat */}
        <main className="center-content">
          {/* Arc Reactor Display */}
          <div className="arc-reactor-section">
            <div className="arc-reactor-container">
              <MemoizedHolographicHUD 
                processing={processing} 
                speaking={isSpeaking}
                listening={voiceState === 'listening'}
                size={260}
              />
              <div className="arc-status-indicator">
                <span className={`status-dot ${getAIStatus()}`} />
                <span className="status-text">{getAIStatus().toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Chat Console */}
          <div className="chat-console">
            <div className="chat-header">
              <span className="chat-icon">💬</span>
              <span>COMMAND CONSOLE</span>
            </div>
            <div className="chat-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`chat-message ${msg.role}`}>
                  <div className="message-avatar">
                    {msg.role === 'user' ? '👤' : msg.role === 'system' ? '🤖' : '✨'}
                  </div>
                  <div className="message-content">
                    <div className="message-text">{msg.content}</div>
                    {msg.agent && <span className="message-agent">{msg.agent}</span>}
                  </div>
                </div>
              ))}
              {processing && (
                <div className="chat-message assistant processing">
                  <div className="message-avatar">✨</div>
                  <div className="message-content">
                    <div className="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-container">
              <textarea
                className="chat-input"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={handleCommandKeyDown}
                placeholder="Speak your command, sir..."
                disabled={processing}
                rows={1}
              />
              <button 
                className="chat-send-btn"
                onClick={() => sendCommand(commandInput)}
                disabled={processing || !commandInput.trim()}
              >
                {processing ? '...' : '➤'}
              </button>
              <MemoizedVoiceAssistant 
                onCommand={handleVoiceCommand}
                onSpeakingStateChange={handleSpeakingChange}
                apiUrl={API_URL}
                disabled={voiceMuted}
              />
            </div>
          </div>
        </main>

        {/* RIGHT SIDEBAR: Agents & Tools */}
        <aside className={`sidebar sidebar-agents ${activePanel === 'agents' ? 'active' : ''}`}>
          <div className="sidebar-header">
            <span className="sidebar-icon">🔧</span>
            <span className="sidebar-title">AGENTS</span>
            <button className="sidebar-toggle" onClick={() => togglePanel('agents')}>
              {activePanel === 'agents' ? '▼' : '▶'}
            </button>
          </div>
          <div className="sidebar-content">
            {/* Agent Tabs */}
            <div className="agent-tabs">
              {PRIMARY_AGENTS.map((agent) => (
                <button
                  key={agent.key}
                  className={`agent-tab ${agents[agent.key]?.status} ${activeTerminals.includes(agent.key) ? 'open' : ''}`}
                  onClick={() => toggleTerminal(agent.key)}
                >
                  <span className="tab-indicator" style={{ background: agent.color }} />
                  <span className="tab-name">{agent.label}</span>
                </button>
              ))}
            </div>

            {/* Tool Buttons */}
            <div className="tool-buttons">
              {musicAvailable && (
                <button 
                  className={`tool-btn ${activePanel === 'music' ? 'active' : ''}`}
                  onClick={() => togglePanel('music')}
                >
                  <span className="tool-icon">🎵</span>
                  <span className="tool-label">MUSIC</span>
                </button>
              )}
              <button 
                className={`tool-btn ${activePanel === 'tv' ? 'active' : ''}`}
                onClick={() => togglePanel('tv')}
              >
                <span className="tool-icon">📺</span>
                <span className="tool-label">TV</span>
              </button>
              <button 
                className={`tool-btn ${activePanel === 'alarms' ? 'active' : ''}`}
                onClick={() => togglePanel('alarms')}
              >
                <span className="tool-icon">⏰</span>
                <span className="tool-label">ALARMS</span>
              </button>
              <button 
                className={`tool-btn ${activePanel === 'reminders' ? 'active' : ''}`}
                onClick={() => togglePanel('reminders')}
              >
                <span className="tool-icon">📝</span>
                <span className="tool-label">REMINDERS</span>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* ═══ PANELS (Sliding) ═════════════════════════════════════════════ */}
      {activePanel === 'music' && (
        <div className="slide-panel music-panel-slide">
          <MusicPlayer onClose={() => setActivePanel(null)} />
        </div>
      )}
      {activePanel === 'tv' && (
        <div className="slide-panel tv-panel-slide">
          <TVRemote onClose={() => setActivePanel(null)} />
        </div>
      )}
      {activePanel === 'alarms' && (
        <div className="slide-panel alarm-panel-slide">
          <AlarmPanel onClose={() => setActivePanel(null)} />
        </div>
      )}
      {activePanel === 'reminders' && (
        <div className="slide-panel reminder-panel-slide">
          <ReminderPanel apiUrl={API_URL} onClose={() => setActivePanel(null)} />
        </div>
      )}

      {/* Active Agent Terminals */}
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
    </div>
  );
}

export default App;
