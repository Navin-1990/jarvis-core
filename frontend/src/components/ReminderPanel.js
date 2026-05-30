import React, { useState, useEffect, useCallback, memo } from 'react';

const ReminderPanel = memo(({ apiUrl, onClose }) => {
  const [reminders, setReminders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newReminder, setNewReminder] = useState({ title: '', due_date: '', due_time: '', priority: 'medium' });

  const fetchReminders = useCallback(() => {
    fetch(`${apiUrl}/reminders`)
      .then(r => r.json())
      .then(data => setReminders(data.reminders || []))
      .catch(() => {});
  }, [apiUrl]);

  useEffect(() => {
    fetchReminders();
    const interval = setInterval(fetchReminders, 30000);
    return () => clearInterval(interval);
  }, [fetchReminders]);

  const createReminder = async () => {
    if (!newReminder.title.trim()) return;
    
    const due_at = newReminder.due_date && newReminder.due_time 
      ? `${newReminder.due_date}T${newReminder.due_time}:00`
      : new Date().toISOString();
    
    try {
      await fetch(`${apiUrl}/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newReminder.title,
          description: '',
          due_at,
          priority: newReminder.priority
        })
      });
      setNewReminder({ title: '', due_date: '', due_time: '', priority: 'medium' });
      setShowForm(false);
      fetchReminders();
    } catch { /* ignore */ }
  };

  const completeReminder = async (id) => {
    try {
      await fetch(`${apiUrl}/reminders/${id}/complete`, { method: 'POST' });
      fetchReminders();
    } catch { /* ignore */ }
  };

  const deleteReminder = async (id) => {
    try {
      await fetch(`${apiUrl}/reminders/${id}`, { method: 'DELETE' });
      fetchReminders();
    } catch { /* ignore */ }
  };

  const now = new Date();
  const upcoming = reminders.filter(r => new Date(r.due_at) > now && !r.completed);
  const past = reminders.filter(r => new Date(r.due_at) <= now || r.completed);

  return (
    <div className="panel-card">
      <div className="panel-header">
        <span className="panel-icon">📝</span>
        <span className="panel-title">REMINDER CENTER</span>
        <button className="terminal-close" onClick={onClose}>×</button>
      </div>
      
      <div className="panel-body">
        {/* Add Reminder Button */}
        <button 
          className="add-reminder-btn"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '− Cancel' : '+ Add Reminder'}
        </button>

        {/* Create Form */}
        {showForm && (
          <div className="reminder-form">
            <input
              type="text"
              className="reminder-input"
              placeholder="Reminder title..."
              value={newReminder.title}
              onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
            />
            <div className="reminder-form-row">
              <input
                type="date"
                className="reminder-date"
                value={newReminder.due_date}
                onChange={(e) => setNewReminder({ ...newReminder, due_date: e.target.value })}
              />
              <input
                type="time"
                className="reminder-time"
                value={newReminder.due_time}
                onChange={(e) => setNewReminder({ ...newReminder, due_time: e.target.value })}
              />
            </div>
            <select
              className="reminder-priority-select"
              value={newReminder.priority}
              onChange={(e) => setNewReminder({ ...newReminder, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <button className="reminder-create-btn" onClick={createReminder}>
              CREATE
            </button>
          </div>
        )}

        {/* Upcoming Reminders */}
        <div className="reminder-section">
          <div className="reminder-section-title">UPCOMING ({upcoming.length})</div>
          {upcoming.length === 0 ? (
            <div className="empty-state">No upcoming reminders</div>
          ) : (
            <div className="reminder-list">
              {upcoming.map((r) => (
                <div key={r.id} className="reminder-item">
                  <div className="reminder-title">{r.title}</div>
                  <div className="reminder-meta">
                    <span className="reminder-due">
                      📅 {new Date(r.due_at).toLocaleDateString()} {new Date(r.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`reminder-priority ${r.priority}`}>{r.priority}</span>
                  </div>
                  <div className="reminder-actions">
                    <button className="reminder-action-btn" onClick={() => completeReminder(r.id)}>✓ Complete</button>
                    <button className="reminder-action-btn danger" onClick={() => deleteReminder(r.id)}>✕ Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past Reminders */}
        <div className="reminder-section">
          <div className="reminder-section-title">COMPLETED / PAST ({past.length})</div>
          {past.length === 0 ? (
            <div className="empty-state">No past reminders</div>
          ) : (
            <div className="reminder-list">
              {past.slice(0, 5).map((r) => (
                <div key={r.id} className="reminder-item completed">
                  <div className="reminder-title">{r.title}</div>
                  <div className="reminder-meta">
                    <span className="reminder-due">
                      ✓ {r.completed ? 'Completed' : 'Past'}
                    </span>
                  </div>
                  <div className="reminder-actions">
                    <button className="reminder-action-btn danger" onClick={() => deleteReminder(r.id)}>✕ Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .add-reminder-btn {
          width: 100%;
          padding: 12px;
          background: rgba(0, 212, 255, 0.1);
          border: 1px solid var(--primary);
          border-radius: 6px;
          color: var(--primary);
          font-family: var(--font-hud);
          font-size: 10px;
          letter-spacing: 2px;
          cursor: pointer;
          margin-bottom: 16px;
          transition: all 0.3s;
        }
        .add-reminder-btn:hover {
          background: rgba(0, 212, 255, 0.2);
        }
        .reminder-form {
          background: rgba(0, 20, 40, 0.5);
          padding: 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          border: 1px solid var(--border);
        }
        .reminder-input {
          width: 100%;
          padding: 10px 12px;
          background: rgba(0, 20, 40, 0.6);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-bright);
          font-size: 14px;
          margin-bottom: 12px;
        }
        .reminder-form-row {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }
        .reminder-date, .reminder-time {
          flex: 1;
          padding: 8px 12px;
          background: rgba(0, 20, 40, 0.6);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 12px;
        }
        .reminder-priority-select {
          width: 100%;
          padding: 8px 12px;
          background: rgba(0, 20, 40, 0.6);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 12px;
          margin-bottom: 12px;
        }
        .reminder-create-btn {
          width: 100%;
          padding: 10px;
          background: var(--primary);
          border: none;
          border-radius: 6px;
          color: var(--bg);
          font-family: var(--font-hud);
          font-size: 10px;
          letter-spacing: 2px;
          cursor: pointer;
        }
        .reminder-item.completed {
          opacity: 0.5;
        }
        .reminder-action-btn.danger:hover {
          border-color: var(--danger);
          color: var(--danger);
        }
        .empty-state {
          padding: 20px;
          text-align: center;
          color: var(--primary-dim);
          font-size: 12px;
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
});

ReminderPanel.displayName = 'ReminderPanel';
export default ReminderPanel;
