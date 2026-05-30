import React, { useEffect } from 'react';

const NotificationToast = ({ notifications, onDismiss }) => {
  return (
    <div className="notification-stack">
      {notifications.map((n) => (
        <Toast key={n.id} notification={n} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const Toast = ({ notification, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(notification.id), 15000);
    return () => clearTimeout(timer);
  }, [notification.id, onDismiss]);

  const isAlarm = notification.type === 'alarm_triggered';

  return (
    <div className={`toast ${isAlarm ? 'toast-alarm' : 'toast-reminder'}`}>
      <div className="toast-icon">{isAlarm ? '\u23F0' : '\u{1F514}'}</div>
      <div className="toast-content">
        <div className="toast-type">{isAlarm ? 'ALARM' : 'REMINDER'}</div>
        <div className="toast-message">{notification.message}</div>
      </div>
      <button className="toast-dismiss" onClick={() => onDismiss(notification.id)}>x</button>
    </div>
  );
};

export default NotificationToast;
