import React, { useEffect, useRef, useMemo } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import MessageInput from './MessageInput.tsx';
import './MessageThread.css';

const MessageThread: React.FC = () => {
  const { activeConversation, messages } = useChat();
  const { user } = useAuth();
  const messageEndRef = useRef<HTMLDivElement>(null);

  const sortedMessages = useMemo(() => {
    // Add this console.log to see the actual timestamps
    console.log('Timestamps before sorting:', messages.map(m => ({id: m.id, content: m.content.substring(0, 10), sentAt: m.sentAt})));
  
    const sorted = [...messages].sort((a, b) => {
      // Use sentAt field for sorting - this sorts oldest first, newest last
      return a.sentAt - b.sentAt;
    });
    
    // Log the sorted result to verify
    console.log('Sorted order:', sorted.map(m => ({id: m.id, content: m.content.substring(0, 10), sentAt: m.sentAt})));
    
    return sorted;
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    console.log('Messages updated in msg thread:', messages);
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!activeConversation) {
    return (
      <div className="no-conversation">
        <p>Select a conversation or start a new chat</p>
      </div>
    );
  }
  const formatTime = (timestamp: number) => {
    if (!timestamp) return "Unknown time";
    
    return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
};


  return (
    <div className="message-thread">
      <div className="thread-header">
        <h3>
          {activeConversation.isGroup 
            ? activeConversation.name 
            : activeConversation.participants.find(p => p.id !== Number(user?.userId))?.name || 'Chat'}
        </h3>
        <div className="participants">
          {activeConversation.isGroup && (
            <span>{activeConversation.participants.length} participants</span>
          )}
        </div>
      </div>

      <div className="messages-container">
        {sortedMessages.length === 0 ? (
          <div className="no-messages">No messages yet. Start the conversation!</div>
        ) : (
          sortedMessages.map(message => (
            <div 
              key={message.id} 
              className={`message ${Number(message.senderId) === Number(user?.userId) ? 'outgoing' : 'incoming'}`}
            >
              <div className="message-content">{message.content}</div>
              <div className="message-meta">
                <span className="message-time">{formatTime(message.sentAt)}</span>
                {Number(message.senderId) === Number(user?.userId) && (
                  <span className="message-status">
                    {message.read ? 'Read' : 'Sent'}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messageEndRef} />
      </div>
      
      <MessageInput />
    </div>
  );
};

export default MessageThread;