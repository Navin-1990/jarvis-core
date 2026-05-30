import React, { useState } from 'react';


const CommandOrb = ({ onSend, processing, onVoiceCommand }) => {
  const [command, setCommand] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!command.trim() || processing) return;
    onSend(command.trim());
    setCommand('');
  };

  return (
    <form className="command-orb" onSubmit={handleSubmit}>
      <button 
        type="button"
        className="orb-mic-btn"
        onClick={onVoiceCommand}
        title="Voice Command"
      >
        🎤
      </button>
      <input
        className="command-field"
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        placeholder="Type your command..."
        disabled={processing}
      />
      <button className="execute-btn" type="submit" disabled={processing || !command.trim()}>
        {processing ? '⟳' : '▶'}
      </button>
    </form>
  );
};

export default CommandOrb;
