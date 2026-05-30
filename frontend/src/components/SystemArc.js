import React from 'react';

const SystemArc = ({ status, connected }) => {
  const w = 260;
  const h = 40;
  const cx = w / 2;

  const model = status?.llm_model || '—';
  const voice = status?.voice_enabled ? 'ON' : 'OFF';
  const agentCount = status?.agents ? Object.keys(status.agents).length : 0;

  return (
    <div style={{ position: 'relative', width: w, height: h }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {/* Arc line */}
        <path
          d={`M 10 35 Q ${cx} 5, ${w - 10} 35`}
          fill="none"
          stroke={connected ? 'rgba(0,212,255,0.3)' : 'rgba(255,51,102,0.3)'}
          strokeWidth="1"
        />

        {/* Tick marks along arc */}
        {[0.15, 0.35, 0.5, 0.65, 0.85].map((t, i) => {
          const x = 10 + (w - 20) * t;
          const y = 35 - (30 * Math.sin(t * Math.PI));
          return (
            <circle key={i} cx={x} cy={y} r="2"
              fill={connected ? '#00d4ff' : '#ff3366'}
              opacity="0.6"
            />
          );
        })}
      </svg>

      {/* Status labels */}
      <div style={{
        position: 'absolute', top: 10, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 40,
        fontFamily: "'Orbitron', monospace", fontSize: 8, letterSpacing: 2,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(0,212,255,0.5)' }}>LLM</div>
          <div style={{ color: '#e0f0ff', fontSize: 9, marginTop: 2 }}>{model}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(0,212,255,0.5)' }}>AGENTS</div>
          <div style={{ color: '#e0f0ff', fontSize: 9, marginTop: 2 }}>{agentCount}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(0,212,255,0.5)' }}>VOICE</div>
          <div style={{ color: '#e0f0ff', fontSize: 9, marginTop: 2 }}>{voice}</div>
        </div>
      </div>
    </div>
  );
};

export default SystemArc;
