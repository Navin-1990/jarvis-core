import React from 'react';

const HUDRing = ({ processing }) => {
  const size = 56;
  const center = size / 2;
  const r1 = 24;
  const r2 = 20;
  const r3 = 14;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ flexShrink: 0 }}
    >
      {/* Outer ring */}
      <circle
        cx={center}
        cy={center}
        r={r1}
        fill="none"
        stroke="rgba(0, 212, 255, 0.3)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        style={{
          animation: processing ? 'spin 3s linear infinite' : 'spin 12s linear infinite',
        }}
        transform={`rotate(0 ${center} ${center})`}
      />
      {/* Middle ring */}
      <circle
        cx={center}
        cy={center}
        r={r2}
        fill="none"
        stroke="rgba(0, 212, 255, 0.5)"
        strokeWidth="1"
        strokeDasharray="8 4"
        style={{
          animation: processing ? 'spinReverse 2s linear infinite' : 'spinReverse 8s linear infinite',
        }}
      />
      {/* Inner ring */}
      <circle
        cx={center}
        cy={center}
        r={r3}
        fill={processing ? 'rgba(0, 212, 255, 0.15)' : 'rgba(0, 212, 255, 0.05)'}
        stroke="rgba(0, 212, 255, 0.6)"
        strokeWidth="1"
      />
      {/* Center dot */}
      <circle
        cx={center}
        cy={center}
        r="3"
        fill={processing ? '#00d4ff' : '#0099cc'}
        style={{
          filter: processing ? 'drop-shadow(0 0 6px #00d4ff)' : 'none',
        }}
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); transform-origin: ${center}px ${center}px; }
          to { transform: rotate(360deg); transform-origin: ${center}px ${center}px; }
        }
        @keyframes spinReverse {
          from { transform: rotate(360deg); transform-origin: ${center}px ${center}px; }
          to { transform: rotate(0deg); transform-origin: ${center}px ${center}px; }
        }
      `}</style>
    </svg>
  );
};

export default HUDRing;
