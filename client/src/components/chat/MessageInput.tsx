import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import './MessageInput.css';
const MessageInput: React.FC = () => {
  const [message, setMessage] = useState('');
  const { sendMessage, activeConversation } = useChat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || !activeConversation) {
      return;
    }
    
    sendMessage(message.trim());
    setMessage('');
  };

  if (!activeConversation) {
    return null;
  }

  return (
    <form className="message-input" onSubmit={handleSubmit}>
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type a message..."
      />
      <button type="submit" disabled={!message.trim()}>Send</button>
    </form>
  );
};

export default MessageInput;