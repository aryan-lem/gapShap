import React from 'react';
import { useChat, Conversation } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import './ConversationList.css';

const ConversationList: React.FC = () => {
  const { conversations, selectConversation, activeConversation } = useChat();
  const { user } = useAuth();

  const getConversationName = (conversation: Conversation) => {
    if (conversation.isGroup) {
      return conversation.name;
    }
    // For direct messages, show the other person's name
    const otherUser = conversation.participants.find(p => p.id !== Number(user?.userId));
    return otherUser?.name || 'Unknown User';
  };

  if (conversations.length === 0) {
    return <div>No conversations yet. Start a new chat!</div>;
  }

  return (
    <div className="conversation-list">
      {conversations.map(conversation => (
        <div 
          key={conversation.id} 
          className={`conversation-item ${activeConversation?.id === conversation.id ? 'active' : ''}`}
          onClick={() => selectConversation(conversation.id)}
        >
          <div className="conversation-info">
            <div className="conversation-name">
              {getConversationName(conversation)}
            </div>
            {conversation.lastMessage && (
              <div className="conversation-last-message">
                {conversation.lastMessage.content}
              </div>
            )}
          </div>
          {conversation.unreadCount > 0 && (
            <div className="unread-badge">{conversation.unreadCount}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ConversationList;