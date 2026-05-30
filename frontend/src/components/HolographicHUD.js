import React from 'react';

const HolographicHUD = ({ processing }) => {
  const s = 50;
  const c = s / 2;

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ flexShrink: 0 }}>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Outer ring - segmented */}
      <circle cx={c} cy={c} r="22" fill="none" stroke="rgba(0,212,255,0.2)" strokeWidth="1"
        strokeDasharray="6 4"
        style={{ transformOrigin: `${c}px ${c}px`, animation: `hSpin ${processing ? '2s' : '10s'} linear infinite` }}
      />

      {/* Middle ring - opposite direction */}
      <circle cx={c} cy={c} r="17" fill="none" stroke="rgba(0,212,255,0.35)" strokeWidth="0.8"
        strokeDasharray="10 5 3 5"
        style={{ transformOrigin: `${c}px ${c}px`, animation: `hSpinR ${processing ? '1.5s' : '7s'} linear infinite` }}
      />

      {/* Arc segments */}
      <path d={`M ${c} ${c-13} A 13 13 0 0 1 ${c+13} ${c}`} fill="none"
        stroke={processing ? '#00ff88' : 'rgba(0,212,255,0.5)'} strokeWidth="1.5"
        style={{ transformOrigin: `${c}px ${c}px`, animation: `hSpin ${processing ? '3s' : '12s'} linear infinite` }}
        filter="url(#glow)"
      />

      {/* Inner circle */}
      <circle cx={c} cy={c} r="8"
        fill={processing ? 'rgba(0,255,136,0.1)' : 'rgba(0,212,255,0.05)'}
        stroke={processing ? 'rgba(0,255,136,0.6)' : 'rgba(0,212,255,0.4)'}
        strokeWidth="0.8"
      />

      {/* Core */}
      <circle cx={c} cy={c} r="3"
        fill={processing ? '#00ff88' : '#00d4ff'}
        filter="url(#glow)"
        style={{ opacity: processing ? 1 : 0.7 }}
      />

      {/* Corner ticks */}
      {[0, 90, 180, 270].map(angle => (
        <line key={angle}
          x1={c + 19 * Math.cos(angle * Math.PI / 180)}
          y1={c + 19 * Math.sin(angle * Math.PI / 180)}
          x2={c + 22 * Math.cos(angle * Math.PI / 180)}
          y2={c + 22 * Math.sin(angle * Math.PI / 180)}
          stroke="rgba(0,212,255,0.4)" strokeWidth="1.5"
        />
      ))}

      <style>{`
        @keyframes hSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes hSpinR { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
      `}</style>
    </svg>
  );
};

export default HolographicHUD;
