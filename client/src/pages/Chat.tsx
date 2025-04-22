import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import ConversationList from '../components/chat/ConversationList';
import MessageThread from '../components/chat/MessageThread';
import NewConversationModal from '../components/chat/NewConversationModal';
import './Chat.css';
const Chat: React.FC = () => {
  const { user } = useAuth();
  const { loading, error } = useChat();
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  
  if (loading) {
    return <div>Loading chats...</div>;
  }
  
  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="chat-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Conversations</h2>
          <button onClick={() => setShowNewConversationModal(true)}>New Chat</button>
        </div>
        <ConversationList />
      </div>
      
      <div className="chat-main">
        <MessageThread />
      </div>
      
      {showNewConversationModal && (
        <NewConversationModal onClose={() => setShowNewConversationModal(false)} />
      )}
    </div>
  );
};

export default Chat;