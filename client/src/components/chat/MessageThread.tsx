import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import MessageInput from './MessageInput.tsx';
import './MessageThread.css';

const MessageThread: React.FC = () => {
  const { activeConversation, messages, loadMoreMessages, loadingMoreMessages, hasMoreMessages } = useChat();
  const { user } = useAuth();
  const messageEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [prevMessageCount, setPrevMessageCount] = useState(0);
  
  // Track message height before loading more to maintain scroll position
  const [prevScrollHeight, setPrevScrollHeight] = useState(0);

  const sortedMessages = useMemo(() => {
    console.log('Timestamps before sorting:', messages.map(m => ({id: m.id, content: m.content.substring(0, 10), sentAt: m.sentAt})));
  
    const sorted = [...messages].sort((a, b) => {
      // Use sentAt field for sorting - this sorts oldest first, newest last
      return a.sentAt - b.sentAt;
    });
    
    console.log('Sorted order:', sorted.map(m => ({id: m.id, content: m.content.substring(0, 10), sentAt: m.sentAt})));
    return sorted;
  }, [messages]);

  // Save previous scroll position before loading more messages
  useEffect(() => {
    if (messages.length > prevMessageCount && prevMessageCount > 0 && messagesContainerRef.current) {
      // If we loaded more messages (not new ones)
      const container = messagesContainerRef.current;
      const newScrollHeight = container.scrollHeight;
      
      // Restore scroll position to keep it at the same relative point
      if (prevScrollHeight > 0) {
        const scrollDiff = newScrollHeight - prevScrollHeight;
        container.scrollTop = container.scrollTop + scrollDiff;
      }
    }
    
    setPrevMessageCount(messages.length);
  }, [messages, prevMessageCount]);

  // Auto-scroll to bottom when new messages arrive but not when loading older ones
  useEffect(() => {
    // Only auto-scroll if we're already near the bottom
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      if (isNearBottom) {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [sortedMessages]);

  // Handle loading more messages
  const handleLoadMore = async () => {
    if (messagesContainerRef.current) {
      setPrevScrollHeight(messagesContainerRef.current.scrollHeight);
    }
    await loadMoreMessages();
  };

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

      <div className="messages-container" ref={messagesContainerRef}>
        {hasMoreMessages && (
          <div className="load-more-container">
            <button 
              className="load-more-button" 
              onClick={handleLoadMore}
              disabled={loadingMoreMessages}
            >
              {loadingMoreMessages ? 'Loading...' : 'Load older messages'}
            </button>
          </div>
        )}
        
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