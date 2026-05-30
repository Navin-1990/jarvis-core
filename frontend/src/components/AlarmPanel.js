import React, { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const AlarmPanel = ({ onClose }) => {
  const [alarms, setAlarms] = useState([]);
  const [label, setLabel] = useState('');
  const [time, setTime] = useState('');

  const fetchAlarms = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/alarms`);
      const data = await res.json();
      setAlarms(data.alarms || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchAlarms(); }, [fetchAlarms]);

  const addAlarm = async (e) => {
    e.preventDefault();
    if (!time) return;
    try {
      await fetch(`${API_URL}/alarms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label || 'Alarm', time }),
      });
      setLabel('');
      setTime('');
      fetchAlarms();
    } catch { /* ignore */ }
  };

  const deleteAlarm = async (id) => {
    try {
      await fetch(`${API_URL}/alarms/${id}`, { method: 'DELETE' });
      fetchAlarms();
    } catch { /* ignore */ }
  };

  return (
    <div className="panel-card alarm-panel">
      <div className="panel-header">
        <span className="panel-icon">&#9200;</span>
        <span className="panel-title">ALARMS</span>
        <button className="terminal-close" onClick={onClose}>x</button>
      </div>
      <div className="panel-body">
        <form className="alarm-form" onSubmit={addAlarm}>
          <input
            className="alarm-input"
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label..."
          />
          <input
            className="alarm-input time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
          <button className="alarm-add-btn" type="submit">SET</button>
        </form>
        <div className="alarm-list">
          {alarms.map((a) => (
            <div key={a.id} className={`alarm-item ${a.enabled ? '' : 'disabled'}`}>
              <span className="alarm-time">{a.time}</span>
              <span className="alarm-label">{a.label}</span>
              <span className={`alarm-status ${a.enabled ? 'on' : 'off'}`}>
                {a.enabled ? 'ON' : 'OFF'}
              </span>
              <button className="alarm-del" onClick={() => deleteAlarm(a.id)}>x</button>
            </div>
          ))}
          {alarms.length === 0 && (
            <div className="alarm-empty">No alarms set</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlarmPanel;
