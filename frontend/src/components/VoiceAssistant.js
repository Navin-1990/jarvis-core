import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Voice Assistant Component - JARVIS Voice Interaction System
 * Provides seamless voice input and output for JARVIS AI
 */
const VoiceAssistant = ({ 
  onCommand, 
  onSpeakingStateChange, 
  apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000',
  disabled = false 
}) => {
  // Voice state management
  const [voiceState, setVoiceState] = useState('idle'); // idle | listening | processing | speaking | error
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState(null);
  
  // Refs
  const recognitionRef = useRef(null);
  const utteranceQueueRef = useRef([]);
  const isSpeakingRef = useRef(false);
  
  // Initialize Speech Recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported in this browser');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // Configure recognition
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = 'en-US';
    
    // Recognition event handlers
    recognition.onstart = () => {
      setVoiceState('listening');
      setError(null);
      console.log('Speech recognition started');
    };
    
    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      
      setInterimTranscript(interim);
      setFinalTranscript(final);
      
      // When we get final results, process the command
      if (final) {
        setVoiceState('processing');
        processVoiceCommand(final.trim());
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      switch (event.error) {
        case 'no-speech':
          setError('No speech detected. Please try again.');
          break;
        case 'audio-capture':
          setError('No microphone found. Please check your device.');
          break;
        case 'not-allowed':
          setError('Microphone access denied. Please allow microphone access.');
          break;
        case 'network':
          setError('Network error during speech recognition.');
          break;
        default:
          setError(`Recognition error: ${event.error}`);
      }
      
      setVoiceState('error');
      setTimeout(() => {
        setVoiceState('idle');
        setError(null);
      }, 3000);
    };
    
    recognition.onend = () => {
      // If we were listening and it ended without final results, try again or reset
      if (voiceState === 'listening') {
        if (interimTranscript && !finalTranscript) {
          // We have interim, might still be processing
          setVoiceState('processing');
        } else {
          setVoiceState('idle');
        }
      }
      setInterimTranscript('');
    };
    
    recognitionRef.current = recognition;
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);
  
  // Text-to-Speech: Queue and speak responses
  const speak = useCallback((text) => {
    if (isMuted || !('speechSynthesis' in window)) {
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // JARVIS voice settings - British male voice if available
    utterance.rate = 0.95;
    utterance.pitch = 0.95;
    utterance.volume = 1.0;
    
    // Try to find a suitable voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes('Daniel') || 
      v.name.includes('British') ||
      v.name.includes('Google UK English Male') ||
      v.lang === 'en-GB'
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    // Event handlers
    utterance.onstart = () => {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      setVoiceState('speaking');
      onSpeakingStateChange?.(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      setVoiceState('idle');
      onSpeakingStateChange?.(false);
      
      // Process next in queue
      if (utteranceQueueRef.current.length > 0) {
        const next = utteranceQueueRef.current.shift();
        speak(next);
      }
    };
    
    utterance.onerror = (event) => {
      console.error('TTS error:', event.error);
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      setVoiceState('idle');
      onSpeakingStateChange?.(false);
    };
    
    // Speak
    window.speechSynthesis.speak(utterance);
  }, [isMuted, onSpeakingStateChange]);
  
  // Queue speech if currently speaking
  const queueSpeech = useCallback((text) => {
    if (isSpeakingRef.current) {
      utteranceQueueRef.current.push(text);
    } else {
      speak(text);
    }
  }, [speak]);
  
  // Process voice command
  const processVoiceCommand = useCallback(async (command) => {
    if (!command) {
      setVoiceState('idle');
      return;
    }
    
    try {
      // Send command to backend
      const response = await fetch(`${apiUrl}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      
      const data = await response.json();
      
      // Speak the response
      if (data.response) {
        queueSpeech(data.response);
      } else if (data.message) {
        queueSpeech(data.message);
      } else {
        queueSpeech('Command processed, sir.');
      }
      
      // Pass command to parent
      onCommand?.(command, data);
      
    } catch (err) {
      console.error('Voice command error:', err);
      queueSpeech('I encountered an error processing your command.');
    }
    
    setVoiceState('idle');
    setFinalTranscript('');
  }, [apiUrl, onCommand, queueSpeech]);
  
  // Start listening
  const startListening = useCallback(() => {
    if (disabled || voiceState !== 'idle') return;
    
    try {
      setError(null);
      setInterimTranscript('');
      setFinalTranscript('');
      recognitionRef.current?.start();
    } catch (err) {
      console.error('Failed to start listening:', err);
      setError('Failed to start microphone');
    }
  }, [disabled, voiceState]);
  
  // Stop listening
  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setVoiceState('idle');
    setInterimTranscript('');
  }, []);
  
  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      if (newMuted) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        isSpeakingRef.current = false;
      }
      return newMuted;
    });
  }, []);
  
  // Expose speak method via ref pattern (parent can trigger speech)
  useEffect(() => {
    window.__jarvisSpeak = speak;
    window.__jarvisQueueSpeech = queueSpeech;
    return () => {
      delete window.__jarvisSpeak;
      delete window.__jarvisQueueSpeech;
    };
  }, [speak, queueSpeech]);
  
  // Get visual indicator based on state
  const getStateColor = () => {
    switch (voiceState) {
      case 'listening': return '#00ff88';
      case 'processing': return '#ffaa00';
      case 'speaking': return '#00d4ff';
      case 'error': return '#ff4444';
      default: return '#00d4ff';
    }
  };
  
  const getStateLabel = () => {
    switch (voiceState) {
      case 'listening': return 'LISTENING';
      case 'processing': return 'PROCESSING';
      case 'speaking': return 'SPEAKING';
      case 'error': return 'ERROR';
      default: return 'READY';
    }
  };
  
  const getStateAnimation = () => {
    switch (voiceState) {
      case 'listening': return 'pulse-listening 1.5s ease-in-out infinite';
      case 'processing': return 'spin-processing 1s linear infinite';
      case 'speaking': return 'wave-speaking 0.5s ease-in-out infinite';
      default: return 'none';
    }
  };

  return (
    <div className="voice-assistant-container">
      {/* Voice state indicator */}
      <div 
        className="voice-state-indicator"
        style={{ '--indicator-color': getStateColor() }}
      >
        <div className="state-ring" style={{ animation: getStateAnimation() }} />
        <div className="state-core" />
      </div>
      
      {/* Microphone button */}
      <button
        className={`voice-mic-btn ${voiceState} ${disabled ? 'disabled' : ''}`}
        onClick={startListening}
        onMouseDown={startListening}
        onMouseUp={stopListening}
        onMouseLeave={stopListening}
        onTouchStart={startListening}
        onTouchEnd={stopListening}
        disabled={disabled || voiceState === 'processing' || error}
        title={disabled ? 'Voice disabled' : 'Hold to speak'}
        style={{ '--mic-color': getStateColor() }}
      >
        {/* Animated rings */}
        <div className="mic-rings">
          <div className="mic-ring ring-1" />
          <div className="mic-ring ring-2" />
          <div className="mic-ring ring-3" />
        </div>
        
        {/* Microphone icon */}
        <svg className="mic-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          <path 
            d="M19 10V12C19 15.87 16.87 19 13 19H11C7.13 19 5 15.87 5 12V10" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          <path 
            d="M12 19V23" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          <path 
            d="M8 23H16" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
        </svg>
        
        {/* State label */}
        <span className="mic-label">{getStateLabel()}</span>
      </button>
      
      {/* Transcript display */}
      {(interimTranscript || finalTranscript) && (
        <div className="voice-transcript">
          {finalTranscript && <div className="transcript-final">{finalTranscript}</div>}
          {interimTranscript && <div className="transcript-interim">{interimTranscript}</div>}
        </div>
      )}
      
      {/* Error display */}
      {error && (
        <div className="voice-error">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}
      
      {/* Mute toggle */}
      <button 
        className={`voice-mute-toggle ${isMuted ? 'muted' : ''}`}
        onClick={toggleMute}
        title={isMuted ? 'Unmute voice' : 'Mute voice'}
      >
        {isMuted ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 5L6 9H2V15H6L11 19V5Z" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 5L6 9H2V15H6L11 19V5Z" />
            <path d="M19.07 4.93C20.94 6.8 22 9.27 22 12C22 14.73 20.94 17.2 19.07 19.07" />
            <path d="M15.54 8.46C16.77 9.69 17.5 11.24 17.5 13C17.5 14.76 16.77 16.31 15.54 17.54" />
          </svg>
        )}
      </button>
      
      {/* Voice activity visualization */}
      <div className={`voice-activity-viz ${voiceState}`}>
        <div className="activity-bars">
          {[...Array(5)].map((_, i) => (
            <div 
              key={i} 
              className="activity-bar"
              style={{ 
                animationDelay: `${i * 0.1}s`,
                height: voiceState === 'listening' || voiceState === 'speaking' 
                  ? `${20 + Math.random() * 30}%` 
                  : '20%'
              }}
            />
          ))}
        </div>
      </div>
      
      <style>{`
        .voice-assistant-container {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          background: rgba(0, 20, 40, 0.8);
          border: 1px solid rgba(0, 212, 255, 0.3);
          border-radius: 50px;
          backdrop-filter: blur(10px);
        }
        
        /* Voice State Indicator */
        .voice-state-indicator {
          position: relative;
          width: 12px;
          height: 12px;
        }
        
        .state-ring {
          position: absolute;
          inset: -4px;
          border: 2px solid var(--indicator-color);
          border-radius: 50%;
          opacity: 0.5;
        }
        
        .state-core {
          position: absolute;
          inset: 2px;
          background: var(--indicator-color);
          border-radius: 50%;
          box-shadow: 0 0 10px var(--indicator-color);
        }
        
        /* Microphone Button */
        .voice-mic-btn {
          position: relative;
          width: 56px;
          height: 56px;
          border: none;
          border-radius: 50%;
          background: linear-gradient(145deg, rgba(0, 212, 255, 0.2), rgba(0, 100, 150, 0.1));
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          overflow: visible;
        }
        
        .voice-mic-btn:hover:not(.disabled) {
          background: linear-gradient(145deg, rgba(0, 212, 255, 0.3), rgba(0, 100, 150, 0.2));
          box-shadow: 0 0 30px rgba(0, 212, 255, 0.4);
        }
        
        .voice-mic-btn.listening {
          background: linear-gradient(145deg, rgba(0, 255, 136, 0.3), rgba(0, 150, 80, 0.2));
          box-shadow: 0 0 40px rgba(0, 255, 136, 0.5);
        }
        
        .voice-mic-btn.processing {
          background: linear-gradient(145deg, rgba(255, 170, 0, 0.3), rgba(200, 130, 0, 0.2));
        }
        
        .voice-mic-btn.speaking {
          background: linear-gradient(145deg, rgba(0, 212, 255, 0.4), rgba(0, 100, 150, 0.3));
          animation: speak-pulse 0.5s ease-in-out infinite;
        }
        
        .voice-mic-btn.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Mic rings animation */
        .mic-rings {
          position: absolute;
          inset: -10px;
          pointer-events: none;
        }
        
        .mic-ring {
          position: absolute;
          inset: 0;
          border: 2px solid var(--mic-color, #00d4ff);
          border-radius: 50%;
          opacity: 0;
        }
        
        .voice-mic-btn.listening .mic-ring {
          animation: ring-pulse 1.5s ease-out infinite;
        }
        
        .mic-ring.ring-1 { animation-delay: 0s; }
        .mic-ring.ring-2 { animation-delay: 0.5s; }
        .mic-ring.ring-3 { animation-delay: 1s; }
        
        @keyframes ring-pulse {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        
        /* Mic Icon */
        .mic-icon {
          width: 24px;
          height: 24px;
          color: var(--mic-color, #00d4ff);
          transition: color 0.3s;
        }
        
        .voice-mic-btn.listening .mic-icon {
          color: #00ff88;
        }
        
        /* Mic Label */
        .mic-label {
          font-size: 8px;
          font-weight: 600;
          color: var(--mic-color, #00d4ff);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        
        /* Transcript Display */
        .voice-transcript {
          max-width: 300px;
          padding: 8px 12px;
          background: rgba(0, 212, 255, 0.1);
          border-left: 2px solid var(--mic-color, #00d4ff);
          border-radius: 4px;
        }
        
        .transcript-final {
          color: #00ff88;
          font-size: 14px;
          font-weight: 500;
        }
        
        .transcript-interim {
          color: rgba(0, 212, 255, 0.7);
          font-size: 14px;
          font-style: italic;
        }
        
        /* Error Display */
        .voice-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: rgba(255, 68, 68, 0.2);
          border: 1px solid rgba(255, 68, 68, 0.5);
          border-radius: 8px;
          color: #ff4444;
          font-size: 12px;
        }
        
        .error-icon {
          font-size: 14px;
        }
        
        /* Mute Toggle */
        .voice-mute-toggle {
          width: 32px;
          height: 32px;
          border: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
        }
        
        .voice-mute-toggle svg {
          width: 16px;
          height: 16px;
          color: rgba(255, 255, 255, 0.7);
        }
        
        .voice-mute-toggle:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        
        .voice-mute-toggle.muted {
          background: rgba(255, 68, 68, 0.3);
        }
        
        .voice-mute-toggle.muted svg {
          color: #ff4444;
        }
        
        /* Voice Activity Visualization */
        .voice-activity-viz {
          display: flex;
          align-items: center;
          height: 24px;
        }
        
        .activity-bars {
          display: flex;
          align-items: center;
          gap: 2px;
          height: 100%;
        }
        
        .activity-bar {
          width: 3px;
          background: linear-gradient(to top, var(--mic-color, #00d4ff), rgba(0, 212, 255, 0.3));
          border-radius: 2px;
          transition: height 0.1s;
        }
        
        .voice-mic-btn.listening .activity-bar,
        .voice-mic-btn.speaking .activity-bar {
          animation: bar-dance 0.3s ease-in-out infinite alternate;
        }
        
        @keyframes bar-dance {
          0% { height: 20%; }
          100% { height: 80%; }
        }
        
        /* Animations */
        @keyframes pulse-listening {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        
        @keyframes spin-processing {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes wave-speaking {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        @keyframes speak-pulse {
          0%, 100% { box-shadow: 0 0 40px rgba(0, 212, 255, 0.5); }
          50% { box-shadow: 0 0 60px rgba(0, 212, 255, 0.7); }
        }
      `}</style>
    </div>
  );
};

export default VoiceAssistant;
