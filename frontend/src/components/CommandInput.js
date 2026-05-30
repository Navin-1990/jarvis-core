import React, { useState } from 'react';

const CommandInput = ({ onSend, processing }) => {
  const [command, setCommand] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!command.trim() || processing) return;
    onSend(command.trim());
    setCommand('');
  };

  return (
    <form className="command-input-container" onSubmit={handleSubmit}>
      <input
        className="command-input"
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        placeholder="Enter command... (e.g., 'Set a reminder for tomorrow at 9am')"
        disabled={processing}
        autoFocus
      />
      <button className="send-btn" type="submit" disabled={processing || !command.trim()}>
        {processing ? 'PROCESSING...' : 'EXECUTE'}
      </button>
    </form>
  );
};

export default CommandInput;
