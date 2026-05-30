import React from 'react';

const SystemArc = ({ status, connected }) => {
  const w = 200;
  const h = 36;
  const cx = w / 2;

  return (
    <div style={{ position: 'relative', width: w, height: h }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {/* Main Arc line */}
        <path
          d={`M 10 30 Q ${cx} 2, ${w - 10} 30`}
          fill="none"
          stroke={connected ? 'rgba(0,212,255,0.4)' : 'rgba(255,51,102,0.4)'}
          strokeWidth="1.5"
        />

        {/* Outer glow arc */}
        <path
          d={`M 10 30 Q ${cx} 2, ${w - 10} 30`}
          fill="none"
          stroke={connected ? 'rgba(0,212,255,0.1)' : 'rgba(255,51,102,0.1)'}
          strokeWidth="4"
        />

        {/* Center indicator */}
        <circle cx={cx} cy={6} r="3"
          fill={connected ? '#00d4ff' : '#ff3366'}
          style={{
            filter: connected ? 'drop-shadow(0 0 6px #00d4ff)' : 'drop-shadow(0 0 6px #ff3366)'
          }}
        />

        {/* Tick marks along arc */}
        {[0.2, 0.35, 0.5, 0.65, 0.8].map((t, i) => {
          const x = 10 + (w - 20) * t;
          const y = 30 - (26 * Math.sin(t * Math.PI));
          return (
            <circle key={i} cx={x} cy={y} r="1.5"
              fill={connected ? '#00d4ff' : '#ff3366'}
              opacity="0.7"
            />
          );
        })}
      </svg>
    </div>
  );
};

export default SystemArc;
