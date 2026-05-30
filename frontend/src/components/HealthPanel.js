import React, { useState, useEffect } from 'react';

const HealthPanel = ({ apiUrl }) => {
  const [summary, setSummary] = useState({});

  useEffect(() => {
    const fetchSummary = () => {
      fetch(`${apiUrl}/health/summary`)
        .then(r => r.json())
        .then(data => setSummary(data.summary || {}))
        .catch(() => {});
    };
    fetchSummary();
    const interval = setInterval(fetchSummary, 60000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const categories = Object.entries(summary);

  return (
    <div className="panel">
      <div className="panel-header">Health</div>
      {categories.length === 0 ? (
        <div style={{ color: 'var(--primary-dim)', fontSize: 12, opacity: 0.5 }}>
          No health data logged
        </div>
      ) : (
        categories.map(([cat, info]) => (
          <div key={cat} className="health-item">
            <span className="health-category">{cat}</span>
            <span className="health-value">
              {info.latest ? info.latest.value : '—'}
            </span>
          </div>
        ))
      )}
    </div>
  );
};

export default HealthPanel;
