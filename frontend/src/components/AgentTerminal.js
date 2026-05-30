import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Floating Holographic Terminal
 * 
 * A glassmorphic, draggable, resizable terminal window inspired by
 * Iron Man's HUD interface.
 */
const AgentTerminal = ({ name, info, index = 0, total = 1, onClose }) => {
  const [closing, setClosing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState({ x: 50 + (index % 3) * 30, y: 100 + Math.floor(index / 3) * 50 });
  const [size, setSize] = useState({ width: 420, height: 320 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const terminalRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ width: 0, height: 0, x: 0, y: 0 });
  const bodyRef = useRef(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (bodyRef.current && !isDragging && !isResizing) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [info.logs, isDragging, isResizing]);

  // Handle drag
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest('.terminal-controls')) return;
    e.preventDefault();
    setIsDragging(true);
    setIsFocused(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  }, [position]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragStartRef.current.x));
        const newY = Math.max(0, Math.min(window.innerHeight - size.height - 100, e.clientY - dragStartRef.current.y));
        setPosition({ x: newX, y: newY });
      }
      if (isResizing) {
        const deltaX = e.clientX - resizeStartRef.current.x;
        const deltaY = e.clientY - resizeStartRef.current.y;
        setSize({
          width: Math.max(300, Math.min(800, resizeStartRef.current.width + deltaX)),
          height: Math.max(200, Math.min(600, resizeStartRef.current.height + deltaY)),
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, size]);

  // Handle resize
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setIsFocused(true);
    resizeStartRef.current = {
      width: size.width,
      height: size.height,
      x: e.clientX,
      y: e.clientY,
    };
  }, [size]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 300);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const logs = info.logs || [];

  // Agent-specific color schemes
  const agentColors = {
    assistant: { primary: '#00d4ff', secondary: '#00ff88' },
    coding: { primary: '#ff6b9d', secondary: '#ff3366' },
    device: { primary: '#ffaa00', secondary: '#ff6600' },
    file: { primary: '#00ff88', secondary: '#00cc66' },
    website: { primary: '#00ccff', secondary: '#0099cc' },
  };
  
  const colors = agentColors[name] || { primary: '#00d4ff', secondary: '#00ff88' };

  return (
    <div
      ref={terminalRef}
      className={`floating-terminal ${closing ? 'closing' : ''} ${isDragging ? 'dragging' : ''} ${isMinimized ? 'minimized' : ''} ${isFocused ? 'focused' : ''}`}
      style={{
        '--terminal-primary': colors.primary,
        '--terminal-secondary': colors.secondary,
        left: position.x,
        top: position.y,
        width: size.width,
        height: isMinimized ? 'auto' : size.height,
        zIndex: isFocused ? 100 : 10 + index,
        '--position-index': index,
      }}
      onMouseDown={() => setIsFocused(true)}
    >
      {/* Terminal glow effect */}
      <div className="terminal-glow" />
      
      {/* Corner decorations */}
      <div className="corner corner-tl" />
      <div className="corner corner-tr" />
      <div className="corner corner-bl" />
      <div className="corner corner-br" />
      
      {/* Header - draggable area */}
      <div className="terminal-header" onMouseDown={handleMouseDown}>
        {/* Agent icon */}
        <div className="terminal-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        
        {/* Title and status */}
        <div className="terminal-title-area">
          <span className="terminal-name">{name.toUpperCase()}</span>
          <span className={`terminal-status ${info.status}`}>
            <span className="status-dot" />
            {info.status === 'active' ? 'EXECUTING' : info.status === 'completed' ? 'COMPLETE' : 'STANDBY'}
          </span>
        </div>
        
        {/* Controls */}
        <div className="terminal-controls">
          <button className="control-btn minimize" onClick={handleMinimize} title="Minimize">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button className="control-btn close" onClick={handleClose} title="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Terminal body */}
      {!isMinimized && (
        <div className="terminal-body" ref={bodyRef}>
          {/* Scanline effect */}
          <div className="scanline-overlay" />
          
          {logs.length === 0 ? (
            <div className="terminal-empty">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
              </div>
              <div className="empty-text">AWAITING INSTRUCTIONS</div>
              <div className="empty-subtext">Agent standing by for commands</div>
            </div>
          ) : (
            <div className="terminal-logs">
              {logs.map((log, i) => (
                <div 
                  key={log.id} 
                  className={`terminal-line ${log.type}`}
                  style={{ animationDelay: `${Math.min(i * 0.05, 0.5)}s` }}
                >
                  <span className="line-time">{log.time}</span>
                  <span className="line-type">{log.type.toUpperCase()}</span>
                  <span className="line-message">{log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Resize handle */}
      {!isMinimized && (
        <div className="resize-handle" onMouseDown={handleResizeStart}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <path d="M21 15L15 21M21 21H9M21 21V9" />
          </svg>
        </div>
      )}
      
      {/* Bottom status bar */}
      {!isMinimized && (
        <div className="terminal-footer">
          <span className="footer-info">
            {logs.length} {logs.length === 1 ? 'entry' : 'entries'}
          </span>
          <span className="footer-divider">|</span>
          <span className="footer-action">
            {info.status === 'active' ? 'Processing...' : info.lastAction || 'Ready'}
          </span>
        </div>
      )}
      
      <style>{`
        .floating-terminal {
          position: fixed;
          background: linear-gradient(
            135deg,
            rgba(0, 20, 40, 0.95) 0%,
            rgba(0, 10, 25, 0.98) 100%
          );
          border: 1px solid var(--terminal-primary);
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 
            0 0 20px rgba(0, 212, 255, 0.15),
            0 0 40px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(20px);
          transition: box-shadow 0.3s, transform 0.2s;
          animation: terminal-appear 0.4s ease-out;
        }
        
        @keyframes terminal-appear {
          from {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        .floating-terminal.dragging {
          cursor: grabbing;
          box-shadow: 
            0 0 40px rgba(0, 212, 255, 0.3),
            0 20px 60px rgba(0, 0, 0, 0.6);
          transform: scale(1.02);
        }
        
        .floating-terminal.focused {
          box-shadow: 
            0 0 30px rgba(0, 212, 255, 0.25),
            0 0 60px rgba(0, 0, 0, 0.5);
        }
        
        .floating-terminal.closing {
          animation: terminal-close 0.3s ease-in forwards;
        }
        
        @keyframes terminal-close {
          to {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
        }
        
        .floating-terminal.minimized {
          height: auto !important;
        }
        
        /* Glow effect */
        .terminal-glow {
          position: absolute;
          inset: -1px;
          background: linear-gradient(
            135deg,
            var(--terminal-primary) 0%,
            transparent 50%,
            var(--terminal-secondary) 100%
          );
          opacity: 0.1;
          pointer-events: none;
          border-radius: 12px;
        }
        
        /* Corner decorations */
        .corner {
          position: absolute;
          width: 12px;
          height: 12px;
          pointer-events: none;
        }
        
        .corner::before,
        .corner::after {
          content: '';
          position: absolute;
          background: var(--terminal-primary);
        }
        
        .corner-tl { top: 0; left: 0; }
        .corner-tl::before { top: 0; left: 0; width: 12px; height: 1px; }
        .corner-tl::after { top: 0; left: 0; width: 1px; height: 12px; }
        
        .corner-tr { top: 0; right: 0; }
        .corner-tr::before { top: 0; right: 0; width: 12px; height: 1px; }
        .corner-tr::after { top: 0; right: 0; width: 1px; height: 12px; }
        
        .corner-bl { bottom: 0; left: 0; }
        .corner-bl::before { bottom: 0; left: 0; width: 12px; height: 1px; }
        .corner-bl::after { bottom: 0; left: 0; width: 1px; height: 12px; }
        
        .corner-br { bottom: 0; right: 0; }
        .corner-br::before { bottom: 0; right: 0; width: 12px; height: 1px; }
        .corner-br::after { bottom: 0; right: 0; width: 1px; height: 12px; }
        
        /* Header */
        .terminal-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: linear-gradient(
            90deg,
            rgba(0, 212, 255, 0.15) 0%,
            transparent 100%
          );
          border-bottom: 1px solid rgba(0, 212, 255, 0.2);
          cursor: grab;
          user-select: none;
          position: relative;
          z-index: 1;
        }
        
        .terminal-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid var(--terminal-primary);
          border-radius: 6px;
        }
        
        .terminal-icon svg {
          width: 16px;
          height: 16px;
          color: var(--terminal-primary);
        }
        
        .terminal-title-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .terminal-name {
          font-family: 'Orbitron', 'Rajdhani', monospace;
          font-size: 13px;
          font-weight: 700;
          color: var(--terminal-primary);
          letter-spacing: 2px;
        }
        
        .terminal-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: currentColor;
        }
        
        .terminal-status.standby { color: rgba(255, 255, 255, 0.5); }
        .terminal-status.standby .status-dot { background: rgba(255, 255, 255, 0.5); }
        
        .terminal-status.active { 
          color: #00ff88; 
          animation: status-pulse 1s ease-in-out infinite;
        }
        .terminal-status.active .status-dot { 
          background: #00ff88;
          box-shadow: 0 0 8px #00ff88;
        }
        
        .terminal-status.completed { color: #00d4ff; }
        .terminal-status.completed .status-dot { background: #00d4ff; }
        
        @keyframes status-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        
        .terminal-controls {
          display: flex;
          gap: 8px;
        }
        
        .control-btn {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .control-btn svg {
          width: 14px;
          height: 14px;
          color: rgba(255, 255, 255, 0.6);
        }
        
        .control-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }
        
        .control-btn.close:hover {
          background: rgba(255, 68, 68, 0.3);
        }
        
        .control-btn.close:hover svg {
          color: #ff4444;
        }
        
        /* Body */
        .terminal-body {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          position: relative;
          padding: 12px;
          min-height: 0;
        }
        
        .terminal-body::-webkit-scrollbar {
          width: 6px;
        }
        
        .terminal-body::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }
        
        .terminal-body::-webkit-scrollbar-thumb {
          background: var(--terminal-primary);
          border-radius: 3px;
        }
        
        .scanline-overlay {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 212, 255, 0.02) 2px,
            rgba(0, 212, 255, 0.02) 4px
          );
          pointer-events: none;
          opacity: 0.5;
        }
        
        .terminal-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 150px;
          gap: 12px;
        }
        
        .empty-icon {
          width: 48px;
          height: 48px;
          color: rgba(0, 212, 255, 0.3);
        }
        
        .empty-text {
          font-family: 'Orbitron', monospace;
          font-size: 12px;
          font-weight: 600;
          color: var(--terminal-primary);
          opacity: 0.5;
          letter-spacing: 2px;
        }
        
        .empty-subtext {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.3);
        }
        
        .terminal-logs {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        
        .terminal-line {
          display: flex;
          gap: 10px;
          padding: 6px 10px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
          font-size: 11px;
          animation: line-appear 0.3s ease-out backwards;
          border-left: 2px solid transparent;
        }
        
        @keyframes line-appear {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
        }
        
        .terminal-line.command { border-left-color: #00d4ff; }
        .terminal-line.response { border-left-color: #00ff88; }
        .terminal-line.error { border-left-color: #ff4444; }
        .terminal-line.event { border-left-color: #ffaa00; }
        .terminal-line.system { border-left-color: #00ccff; }
        
        .line-time {
          color: rgba(255, 255, 255, 0.4);
          font-family: monospace;
          font-size: 10px;
          flex-shrink: 0;
        }
        
        .line-type {
          color: var(--terminal-primary);
          font-weight: 600;
          font-size: 9px;
          letter-spacing: 0.5px;
          flex-shrink: 0;
          min-width: 60px;
        }
        
        .line-message {
          color: rgba(255, 255, 255, 0.8);
          word-break: break-word;
          flex: 1;
        }
        
        /* Resize handle */
        .resize-handle {
          position: absolute;
          bottom: 4px;
          right: 4px;
          width: 20px;
          height: 20px;
          cursor: se-resize;
          opacity: 0.3;
          transition: opacity 0.2s;
        }
        
        .resize-handle:hover {
          opacity: 0.8;
        }
        
        .resize-handle svg {
          width: 100%;
          height: 100%;
          color: var(--terminal-primary);
        }
        
        /* Footer */
        .terminal-footer {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.3);
          border-top: 1px solid rgba(0, 212, 255, 0.1);
          font-size: 10px;
          color: rgba(255, 255, 255, 0.5);
        }
        
        .footer-divider {
          opacity: 0.3;
        }
        
        .footer-action {
          flex: 1;
          text-align: right;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--terminal-primary);
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
};

export default AgentTerminal;
