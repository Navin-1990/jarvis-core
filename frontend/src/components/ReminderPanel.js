import React, { useState, useEffect } from 'react';

const ReminderPanel = ({ apiUrl }) => {
  const [reminders, setReminders] = useState([]);

  useEffect(() => {
    const fetchReminders = () => {
      fetch(`${apiUrl}/reminders`)
        .then(r => r.json())
        .then(data => setReminders(data.reminders || []))
        .catch(() => {});
    };
    fetchReminders();
    const interval = setInterval(fetchReminders, 30000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  return (
    <div className="panel">
      <div className="panel-header">Reminders</div>
      {reminders.length === 0 ? (
        <div style={{ color: 'var(--primary-dim)', fontSize: 12, opacity: 0.5 }}>
          No pending reminders
        </div>
      ) : (
        reminders.slice(0, 5).map((r) => (
          <div key={r.id} className="reminder-item">
            <div className="reminder-title">{r.title}</div>
            <div className="reminder-due">{r.due_at}</div>
            <span className={`reminder-priority ${r.priority}`}>
              {r.priority}
            </span>
          </div>
        ))
      )}
    </div>
  );
};

export default ReminderPanel;
