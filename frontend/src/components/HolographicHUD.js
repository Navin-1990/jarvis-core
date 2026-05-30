import React, { useEffect, useState, useRef } from 'react';

/**
 * JARVIS Holographic HUD - Arc Reactor Centerpiece
 * 
 * A large, animated, interactive holographic display inspired by
 * Iron Man's Arc Reactor. Reacts to AI activity with visual feedback.
 */
const HolographicHUD = ({ 
  processing = false, 
  speaking = false,
  listening = false,
  className = '',
  size = 280 // Default large size for centerpiece
}) => {
  const [pulsePhase, setPulsePhase] = useState(0);
  const [energyLevel, setEnergyLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [particles, setParticles] = useState([]);
  
  // Determine state for visual effects
  const getState = () => {
    if (processing) return 'processing';
    if (speaking) return 'speaking';
    if (listening) return 'listening';
    return 'idle';
  };
  
  const state = getState();
  
  // Animation loop for continuous effects
  useEffect(() => {
    let animationId;
    let lastTime = 0;
    
    const animate = (timestamp) => {
      const delta = timestamp - lastTime;
      lastTime = timestamp;
      
      // Update pulse phase
      setPulsePhase(prev => (prev + delta * 0.003) % (Math.PI * 2));
      
      // Update rotation
      const baseSpeed = state === 'idle' ? 0.02 : 0.05;
      setRotation(prev => (prev + baseSpeed * (delta * 0.1)) % 360);
      
      // Energy level based on state
      const targetEnergy = state === 'idle' ? 0.7 : 1.0;
      setEnergyLevel(prev => prev + (targetEnergy - prev) * 0.05);
      
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [state]);
  
  // Generate particles
  useEffect(() => {
    if (particles.length === 0) {
      setParticles(Array.from({ length: 20 }, (_, i) => ({
        id: i,
        angle: (i / 20) * 360,
        radius: 0.6 + Math.random() * 0.3,
        speed: 0.5 + Math.random() * 1,
        size: 1 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.5,
      })));
    }
  }, []);
  
  const center = size / 2;
  const pulseScale = 1 + Math.sin(pulsePhase) * 0.05 * energyLevel;
  
  // Color scheme based on state
  const getColors = () => {
    switch (state) {
      case 'processing':
        return { primary: '#ffaa00', secondary: '#ff6600', glow: 'rgba(255, 170, 0, 0.6)' };
      case 'speaking':
        return { primary: '#00ff88', secondary: '#00cc66', glow: 'rgba(0, 255, 136, 0.6)' };
      case 'listening':
        return { primary: '#00d4ff', secondary: '#0099cc', glow: 'rgba(0, 212, 255, 0.6)' };
      default:
        return { primary: '#00d4ff', secondary: '#0088aa', glow: 'rgba(0, 212, 255, 0.4)' };
    }
  };
  
  const colors = getColors();
  
  // Calculate outer ring segments
  const segments = 24;
  const segmentAngle = 360 / segments;
  
  return (
    <div className={`holographic-hud ${state} ${className}`} style={{ width: size, height: size }}>
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: `scale(${pulseScale})` }}
      >
        <defs>
          {/* Primary glow filter */}
          <filter id="arc-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Core glow */}
          <filter id="core-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Outer glow */}
          <filter id="outer-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          
          {/* Radial gradient for core */}
          <radialGradient id="core-gradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.primary} stopOpacity="0.9" />
            <stop offset="50%" stopColor={colors.secondary} stopOpacity="0.5" />
            <stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
          </radialGradient>
          
          {/* Energy field gradient */}
          <radialGradient id="energy-field" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={colors.primary} stopOpacity="0.3" />
            <stop offset="70%" stopColor={colors.primary} stopOpacity="0.1" />
            <stop offset="100%" stopColor={colors.primary} stopOpacity="0" />
          </radialGradient>
          
          {/* Scanline pattern */}
          <pattern id="scanlines" patternUnits="userSpaceOnUse" width="4" height="4">
            <line x1="0" y1="0" x2="4" y2="0" stroke="rgba(0, 212, 255, 0.1)" strokeWidth="1" />
          </pattern>
          
          {/* Hex pattern */}
          <pattern id="hex-pattern" patternUnits="userSpaceOnUse" width="20" height="17.32">
            <polygon 
              points="10,0 20,5 20,12.32 10,17.32 0,12.32 0,5" 
              fill="none" 
              stroke="rgba(0, 212, 255, 0.05)" 
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        
        {/* Background energy field */}
        <circle 
          cx={center} 
          cy={center} 
          r={center * 0.95}
          fill="url(#energy-field)"
          opacity={energyLevel}
        />
        
        {/* Hex pattern overlay */}
        <circle 
          cx={center} 
          cy={center} 
          r={center * 0.9}
          fill="url(#hex-pattern)"
          opacity="0.5"
        />
        
        {/* Outer containment ring */}
        <circle
          cx={center}
          cy={center}
          r={center * 0.92}
          fill="none"
          stroke={colors.primary}
          strokeWidth="1"
          opacity="0.3"
          strokeDasharray="2 6"
          style={{ 
            transformOrigin: `${center}px ${center}px`,
            animation: `outerSpin ${state === 'idle' ? '30s' : '10s'} linear infinite` 
          }}
        />
        
        {/* Outer ring segments */}
        {Array.from({ length: segments }, (_, i) => {
          const startAngle = (i * segmentAngle - 90 + rotation) * Math.PI / 180;
          const endAngle = ((i + 1) * segmentAngle - 90 + rotation) * Math.PI / 180;
          const innerRadius = center * 0.82;
          const outerRadius = center * 0.88;
          
          const x1 = center + innerRadius * Math.cos(startAngle);
          const y1 = center + innerRadius * Math.sin(startAngle);
          const x2 = center + outerRadius * Math.cos(startAngle);
          const y2 = center + outerRadius * Math.sin(startAngle);
          const x3 = center + outerRadius * Math.cos(endAngle);
          const y3 = center + outerRadius * Math.sin(endAngle);
          const x4 = center + innerRadius * Math.cos(endAngle);
          const y4 = center + innerRadius * Math.sin(endAngle);
          
          // Animate segments based on state
          const animated = state !== 'idle' && i % 3 === 0;
          const animPhase = Math.sin(pulsePhase + i * 0.3);
          
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y3} L ${x4} ${y4} Z`}
              fill={colors.primary}
              opacity={animated ? 0.3 + animPhase * 0.3 : 0.15}
              style={{
                transformOrigin: `${center}px ${center}px`,
                transform: animated ? `scale(${1 + animPhase * 0.1})` : 'scale(1)',
              }}
            />
          );
        })}
        
        {/* Second rotating ring */}
        <circle
          cx={center}
          cy={center}
          r={center * 0.75}
          fill="none"
          stroke={colors.primary}
          strokeWidth="2"
          opacity="0.4"
          strokeDasharray="20 10 5 10"
          style={{ 
            transformOrigin: `${center}px ${center}px`,
            animation: `innerSpinReverse ${state === 'idle' ? '20s' : '8s'} linear infinite` 
          }}
          filter="url(#outer-glow)"
        />
        
        {/* Triple rotating rings (Arc Reactor classic) */}
        <circle
          cx={center}
          cy={center}
          r={center * 0.65}
          fill="none"
          stroke={colors.primary}
          strokeWidth="3"
          opacity="0.5"
          filter="url(#arc-glow)"
          style={{ 
            transformOrigin: `${center}px ${center}px`,
            transform: `rotate(${rotation}deg)`,
          }}
        />
        
        <circle
          cx={center}
          cy={center}
          r={center * 0.55}
          fill="none"
          stroke={colors.secondary}
          strokeWidth="2"
          opacity="0.4"
          filter="url(#arc-glow)"
          style={{ 
            transformOrigin: `${center}px ${center}px`,
            transform: `rotate(${-rotation * 1.5}deg)`,
          }}
        />
        
        <circle
          cx={center}
          cy={center}
          r={center * 0.45}
          fill="none"
          stroke={colors.primary}
          strokeWidth="1.5"
          opacity="0.3"
          filter="url(#outer-glow)"
          style={{ 
            transformOrigin: `${center}px ${center}px`,
            transform: `rotate(${rotation * 0.8}deg)`,
          }}
        />
        
        {/* Corner tick marks */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <g key={i} transform={`rotate(${angle + rotation * 0.2}, ${center}, ${center})`}>
            <line
              x1={center}
              y1={center - center * 0.38}
              x2={center}
              y2={center - center * 0.42}
              stroke={colors.primary}
              strokeWidth="2"
              opacity="0.6"
            />
          </g>
        ))}
        
        {/* Inner hex pattern */}
        <polygon
          points={Array.from({ length: 6 }, (_, i) => {
            const angle = (i * 60 - 90 + rotation * 0.3) * Math.PI / 180;
            const r = center * 0.35;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          }).join(' ')}
          fill="none"
          stroke={colors.primary}
          strokeWidth="1"
          opacity="0.3"
        />
        
        {/* Core glow circle */}
        <circle
          cx={center}
          cy={center}
          r={center * 0.28}
          fill="url(#core-gradient)"
          opacity={energyLevel}
          filter="url(#core-glow)"
        />
        
        {/* Core inner ring */}
        <circle
          cx={center}
          cy={center}
          r={center * 0.22}
          fill="none"
          stroke={colors.primary}
          strokeWidth="3"
          opacity="0.7"
          filter="url(#arc-glow)"
          style={{
            transformOrigin: `${center}px ${center}px`,
            transform: `rotate(${rotation * 2}deg)`,
          }}
        />
        
        {/* Core center */}
        <circle
          cx={center}
          cy={center}
          r={center * 0.15}
          fill={colors.primary}
          opacity={energyLevel * 0.9}
          filter="url(#core-glow)"
        />
        
        {/* Brightest center point */}
        <circle
          cx={center}
          cy={center}
          r={center * 0.05}
          fill="#ffffff"
          opacity={energyLevel}
          filter="url(#core-glow)"
        />
        
        {/* Floating particles */}
        {particles.map((particle) => {
          const angle = (particle.angle + rotation * particle.speed) * Math.PI / 180;
          const x = center + center * particle.radius * Math.cos(angle);
          const y = center + center * particle.radius * Math.sin(angle);
          
          return (
            <circle
              key={particle.id}
              cx={x}
              cy={y}
              r={particle.size}
              fill={colors.primary}
              opacity={particle.opacity * energyLevel}
            />
          );
        })}
        
        {/* Energy pulse effect */}
        {state !== 'idle' && (
          <circle
            cx={center}
            cy={center}
            r={center * 0.2 + Math.sin(pulsePhase * 3) * center * 0.05}
            fill="none"
            stroke={colors.primary}
            strokeWidth="2"
            opacity={0.5 + Math.sin(pulsePhase * 3) * 0.3}
            filter="url(#arc-glow)"
          />
        )}
        
        {/* State indicator text */}
        <text
          x={center}
          y={center + center * 0.5}
          textAnchor="middle"
          fill={colors.primary}
          fontSize="10"
          fontFamily="'Orbitron', 'Rajdhani', sans-serif"
          fontWeight="600"
          letterSpacing="2"
          opacity="0.7"
          style={{ textTransform: 'uppercase' }}
        >
          {state.toUpperCase()}
        </text>
      </svg>
      
      {/* State-specific overlays */}
      {state === 'processing' && (
        <div className="processing-overlay">
          <div className="processing-ring" />
        </div>
      )}
      
      {state === 'speaking' && (
        <div className="speaking-waves">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="wave-ring" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      )}
      
      {state === 'listening' && (
        <div className="listening-pulse">
          <div className="listen-ring" />
          <div className="listen-ring" style={{ animationDelay: '0.5s' }} />
        </div>
      )}
      
      <style>{`
        .holographic-hud {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.5s ease;
        }
        
        .holographic-hud svg {
          transition: transform 0.3s ease;
        }
        
        /* State-specific glows */
        .holographic-hud.processing {
          filter: drop-shadow(0 0 20px rgba(255, 170, 0, 0.5));
        }
        
        .holographic-hud.speaking {
          filter: drop-shadow(0 0 25px rgba(0, 255, 136, 0.6));
        }
        
        .holographic-hud.listening {
          filter: drop-shadow(0 0 30px rgba(0, 212, 255, 0.7));
        }
        
        /* Processing overlay */
        .processing-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        
        .processing-ring {
          width: 80%;
          height: 80%;
          border: 2px solid #ffaa00;
          border-radius: 50%;
          animation: processing-pulse 1s ease-in-out infinite;
        }
        
        @keyframes processing-pulse {
          0%, 100% { transform: scale(0.9); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.2; }
        }
        
        /* Speaking waves */
        .speaking-waves {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        
        .wave-ring {
          position: absolute;
          width: 60%;
          height: 60%;
          border: 2px solid #00ff88;
          border-radius: 50%;
          animation: wave-expand 1s ease-out infinite;
        }
        
        @keyframes wave-expand {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        
        /* Listening pulse */
        .listening-pulse {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        
        .listen-ring {
          position: absolute;
          width: 70%;
          height: 70%;
          border: 3px solid #00d4ff;
          border-radius: 50%;
          animation: listen-beat 1.5s ease-in-out infinite;
        }
        
        @keyframes listen-beat {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 0.2; }
        }
        
        /* Spin animations */
        @keyframes outerSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes innerSpinReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
};

export default HolographicHUD;
