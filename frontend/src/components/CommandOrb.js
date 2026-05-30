import React, { useState } from 'react';

const CommandOrb = ({ onSend, processing }) => {
  const [command, setCommand] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!command.trim() || processing) return;
    onSend(command.trim());
    setCommand('');
  };

  return (
    <form className="command-orb" onSubmit={handleSubmit}>
      <div className={`orb-indicator ${processing ? 'processing' : ''}`}>
        <div className="orb-core" />
      </div>
      <input
        className="command-field"
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        placeholder="Speak your command, sir..."
        disabled={processing}
        autoFocus
      />
      <button className="execute-btn" type="submit" disabled={processing || !command.trim()}>
        {processing ? 'PROCESSING' : 'EXECUTE'}
      </button>
    </form>
  );
};

export default CommandOrb;
