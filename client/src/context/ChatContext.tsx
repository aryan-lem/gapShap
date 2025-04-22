import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// Types
export interface Message {
    id: number;
    senderId: number;
    senderName: string;
    content: string;
    sentAt: number;
    timestamp: string;
    read: boolean;
    conversationId?: number; // Added to match backend model
}

export interface Conversation {
    id: number;
    name: string;
    isGroup: boolean;
    participants: Array<{ id: number; name: string; pictureUrl?: string }>;
    lastMessage?: Message;
    unreadCount: number;
}

interface ChatContextType {
    conversations: Conversation[];
    activeConversation: Conversation | null;
    messages: Message[];
    loading: boolean;
    error: string | null;
    connected: boolean; // Added connection status
    createDirectConversation: (userId: number) => Promise<void>;
    createGroupConversation: (name: string, participantIds: number[]) => Promise<void>;
    selectConversation: (conversationId: number) => void;
    sendMessage: (content: string) => void;
    markAsRead: (conversationId: number) => void;
    loadMoreMessages: () => Promise<boolean>;
    loadingMoreMessages: boolean;
    hasMoreMessages: boolean;
}

const ChatContext = createContext<ChatContextType>({
    conversations: [],
    activeConversation: null,
    messages: [],
    loading: false,
    error: null,
    connected: false, // Added default value
    createDirectConversation: async () => { },
    createGroupConversation: async () => { },
    selectConversation: () => { },
    sendMessage: () => { },
    markAsRead: () => { },
    loadMoreMessages: async () => false,
    loadingMoreMessages: false,
    hasMoreMessages: false,
});

export const useChat = () => useContext(ChatContext);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [stompClient, setStompClient] = useState<Client | null>(null);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [connected, setConnected] = useState<boolean>(false); // Added connection status state
    const [currentPage, setCurrentPage] = useState<number>(0);
    const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(true);
    const [loadingMoreMessages, setLoadingMoreMessages] = useState<boolean>(false);
    const PAGE_SIZE = 20;

    // Helper function to fetch a single conversation
    const fetchConversation = async (conversationId: number) => {
        try {
            const response = await fetch(`${API_URL}/api/conversations/${conversationId}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const conversation = await response.json();
                setConversations(prev => [...prev, conversation]);
            }
        } catch (error) {
            console.error("Error fetching conversation:", error);
        }
    };

    // Helper function to setup STOMP client with all needed subscriptions
    const setupClient = (client: Client) => {
        client.onConnect = () => {
            console.log('Connected to WebSocket');
            setConnected(true);

            // Subscribe to personal queue for new messages
            client.subscribe('/user/queue/messages', (message) => {
                console.log('RAW MESSAGE RECEIVED:', message);
                console.log('MESSAGE HEADERS:', message.headers);
                const receivedMessage = JSON.parse(message.body);
                console.log('MESSAGE BODY:', message.body);
                console.log('PARSED MESSAGE:', receivedMessage);
                try {
                    console.log('Received WebSocket message:', message.body);
                    const receivedMessage = JSON.parse(message.body);
                    handleIncomingMessage(receivedMessage);
                } catch (error) {
                    console.error('Error processing message:', error);
                }
            });

            // Subscribe to read receipts
            client.subscribe('/user/queue/receipts', (receipt) => {
                try {
                    const readReceipt = JSON.parse(receipt.body);
                    handleReadReceipt(readReceipt);
                } catch (error) {
                    console.error('Error processing read receipt:', error);
                }
            });

            // Subscribe to global updates (new conversations)
            client.subscribe('/topic/conversations', (data) => {
                try {
                    console.log('Conversation update:', data.body);
                    loadConversations(); // Refresh conversations when notified
                } catch (error) {
                    console.error('Error processing conversation update:', error);
                }
            });
        };

        client.onDisconnect = () => {
            console.log('Disconnected from WebSocket');
            setConnected(false);
        };

        client.onStompError = (frame) => {
            console.error('STOMP error', frame);
            setError('Failed to connect to chat service');
            setConnected(false);
        };

        return client;
    };
    useEffect(() => {
        if (activeConversation) {
            console.log(`Conversation ACTIVATED: ID=${activeConversation.id}, Name=${activeConversation.name}`);
            console.log('Active conversation details:', activeConversation);
        } else {
            console.log('Conversation DEACTIVATED: No active conversation');
        }
    }, [activeConversation]);

    // Initialize WebSocket connection
    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const client = new Client({
            webSocketFactory: () => new SockJS(`${API_URL}/ws`),
            connectHeaders: {
                // Auth headers if needed
            },
            debug: (str) => {
                console.log('STOMP: ' + str);
            },
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
        });

        // Setup the client with all subscriptions
        setupClient(client);

        client.activate();
        setStompClient(client);

        return () => {
            if (client.active) {
                client.deactivate();
            }
        };
    }, [isAuthenticated, user]);

    // Reconnect WebSocket if connection is lost
    useEffect(() => {
        if (isAuthenticated && user && !connected && !stompClient?.active) {
            console.log("Attempting to reconnect WebSocket...");
            const reconnectClient = new Client({
                webSocketFactory: () => new SockJS(`${API_URL}/ws`),
                connectHeaders: {},
                debug: (str) => console.log('STOMP reconnection:', str),
                reconnectDelay: 5000,
            });

            // Setup the reconnect client with all the same subscriptions
            setupClient(reconnectClient);

            reconnectClient.activate();
            setStompClient(reconnectClient);
        }
    }, [isAuthenticated, user, connected, stompClient?.active]);
    // Add this useEffect to handle initial conversation selection if not already selected
    useEffect(() => {
        // Restore active conversation from session storage when conversations load
        const savedConversationId = sessionStorage.getItem('activeConversationId');

        if (savedConversationId && conversations.length > 0) {
            const conversationId = parseInt(savedConversationId);
            const savedConversation = conversations.find(c => c.id === conversationId);

            if (savedConversation && !activeConversation) {
                console.log(`Restoring active conversation from session: ${conversationId}`);
                selectConversation(conversationId);
            }
        }
    }, [conversations, activeConversation]);

    // Near the top of your ChatProvider component, add this effect
    useEffect(() => {
        // Auto-select the first conversation if none is selected
        if (conversations.length > 0 && !activeConversation) {
            // Find the conversation with the most recent message
            const mostRecentConversation = [...conversations].sort((a, b) => {
                const timeA = a.lastMessage?.sentAt || 0;
                const timeB = b.lastMessage?.sentAt || 0;
                return timeB - timeA; // Sort in descending order (newest first)
            })[0];

            if (mostRecentConversation) {
                console.log('Auto-selecting conversation:', mostRecentConversation.id);
                selectConversation(mostRecentConversation.id);
            }
        }
    }, [conversations, activeConversation]);
    // Load conversations
    useEffect(() => {
        if (isAuthenticated) {
            loadConversations();
        }
    }, [isAuthenticated]);

    const loadConversations = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_URL}/api/conversations`, {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to load conversations');
            }

            const data = await response.json();
            setConversations(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    // Modify selectConversation to reset pagination
  const selectConversation = async (conversationId: number) => {
    try {
      console.log(`Attempting to select conversation: ${conversationId}`);
      setLoading(true);

      // Find the selected conversation
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) {
        console.error(`Conversation not found: ${conversationId}`);
        throw new Error('Conversation not found');
      }

      console.log(`Setting active conversation: ${conversationId}`, conversation);
      setActiveConversation(conversation);
      
      // Reset pagination state
      setCurrentPage(0);
      setHasMoreMessages(true);
      
      // Save the active conversation ID to sessionStorage
      saveActiveConversationId(conversationId);

      // Load initial messages for this conversation
      const response = await fetch(`${API_URL}/api/conversations/${conversationId}/messages?page=0&size=${PAGE_SIZE}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load messages');
      }

      const data = await response.json();
      console.log(`Received ${data.length} messages for conversation ${conversationId}`);
      setMessages(data);
      setHasMoreMessages(data.length === PAGE_SIZE); // If we got a full page, there might be more

      // Mark messages as read
      markAsRead(conversationId);
    } catch (err) {
      console.error('Error selecting conversation:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };
// Add function to load more (older) messages
const loadMoreMessages = async (): Promise<boolean> => {
    if (!activeConversation || loadingMoreMessages || !hasMoreMessages) {
      return false;
    }
    
    try {
      setLoadingMoreMessages(true);
      const nextPage = currentPage + 1;
      
      console.log(`Loading more messages for conversation ${activeConversation.id}, page ${nextPage}`);
      const response = await fetch(
        `${API_URL}/api/conversations/${activeConversation.id}/messages?page=${nextPage}&size=${PAGE_SIZE}`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to load more messages');
      }
      
      const olderMessages = await response.json();
      console.log(`Received ${olderMessages.length} older messages`);
      
      if (olderMessages.length < PAGE_SIZE) {
        setHasMoreMessages(false);
      }
      
      if (olderMessages.length > 0) {
        // Prepend older messages to the existing messages
        setMessages(prev => [...olderMessages, ...prev]);
        setCurrentPage(nextPage);
        return true;
      } else {
        setHasMoreMessages(false);
        return false;
      }
      
    } catch (err) {
      console.error('Error loading more messages:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    } finally {
      setLoadingMoreMessages(false);
    }
  };

    const createDirectConversation = async (userId: number) => {
        try {
            setLoading(true);

            const response = await fetch(`${API_URL}/api/conversations/direct/${userId}`, {
                method: 'POST',
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to create conversation');
            }

            const newConversation = await response.json();

            // Update conversations list
            setConversations(prev => {
                // Check if conversation already exists
                const exists = prev.some(c => c.id === newConversation.id);
                if (exists) {
                    return prev;
                }
                return [...prev, newConversation];
            });

            // Set as active conversation
            setActiveConversation(newConversation);
            setMessages([]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const createGroupConversation = async (name: string, participantIds: number[]) => {
        try {
            setLoading(true);

            const response = await fetch(`${API_URL}/api/conversations/group`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, participantIds }),
            });

            if (!response.ok) {
                throw new Error('Failed to create group conversation');
            }

            const newConversation = await response.json();

            // Update conversations list
            setConversations(prev => [...prev, newConversation]);

            // Set as active conversation
            setActiveConversation(newConversation);
            setMessages([]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = useCallback((content: string) => {
        if (!activeConversation || !stompClient || !stompClient.active) {
            setError('Cannot send message: not connected');
            return;
        }

        stompClient.publish({
            destination: '/app/chat.sendMessage',
            body: JSON.stringify({
                conversationId: activeConversation.id,
                content: content,
            }),
        });

        // Optimistically add message to UI
        // In a real app, you might want to mark this as 'sending' until confirmed
        const optimisticMessage = {
            id: Date.now(), // temporary ID
            senderId: Number(user?.userId), // Ensure senderId is a number
            senderName: user?.name || 'You',
            content: content,
            sentAt: Date.now(), // Add sentAt property
            timestamp: new Date().toISOString(),
            read: false,
            conversationId: activeConversation.id, // Added to match backend model
        };

        setMessages(prev => [...prev, optimisticMessage]);
    }, [activeConversation, stompClient, user]);

    const markAsRead = useCallback((conversationId: number) => {
        if (!stompClient || !stompClient.active) {
            console.warn('Cannot mark as read: not connected');
            return;
        }

        stompClient.publish({
            destination: '/app/chat.markRead',
            body: JSON.stringify({
                conversationId: conversationId,
            }),
        });

        // Also call the REST endpoint for immediate effect
        fetch(`${API_URL}/api/conversations/${conversationId}/read`, {
            method: 'POST',
            credentials: 'include',
        }).catch(err => {
            console.error('Error marking messages as read:', err);
        });

        // Update conversation unread count in UI
        setConversations(prev =>
            prev.map(conv =>
                conv.id === conversationId
                    ? { ...conv, unreadCount: 0 }
                    : conv
            )
        );
    }, [stompClient]);

    // Replace your existing handleIncomingMessage function with this improved version:

    // Replace your existing handleIncomingMessage function with this:
    // Save active conversation ID to session storage so it persists
    const saveActiveConversationId = (id: number | null) => {
        if (id) {
            sessionStorage.setItem('activeConversationId', id.toString());
        } else {
            sessionStorage.removeItem('activeConversationId');
        }
    };
    // Update the handleIncomingMessage function to fix the notification logic

    const handleIncomingMessage = (message: Message) => {
        console.log('Received message:', message);

        // Store message conversationId for clarity
        const messageConvId = message.conversationId;
        const savedConversationId = sessionStorage.getItem('activeConversationId');

        // Debug active conversation state  
        console.log('Active conversation check:', {
            activeConvId: activeConversation?.id,
            savedConvId: savedConversationId,
            messageConvId: messageConvId,
            equal: activeConversation?.id === messageConvId || savedConversationId === String(messageConvId),
        });

        // Check both current state and saved ID for more resilience
        const isActiveConversation =
            (activeConversation && messageConvId === activeConversation.id) ||
            (savedConversationId && parseInt(savedConversationId) === messageConvId);

        if (isActiveConversation) {
            console.log('Adding message to active conversation:', messageConvId);

            // If we have a message for active conversation but activeConversation state is null,
            // try to restore it from the saved ID
            if (!activeConversation && savedConversationId && conversations.length > 0) {
                const conversationId = parseInt(savedConversationId);
                const conversation = conversations.find(c => c.id === conversationId);
                if (conversation) {
                    console.log('Restoring active conversation for message:', conversationId);
                    setActiveConversation(conversation);
                }
            }

            // Update messages immediately
            setMessages(prev => {
                const isDuplicate = prev.some(m => m.id === message.id);
                if (isDuplicate) return prev;
                return [...prev, message];
            });

            // Mark as read since we're looking at this conversation
            markAsRead(messageConvId);
        } else {
            console.log('Message not for active conversation:', messageConvId);
        }

        // THEN update the conversations list
        setConversations(prev => {
            const existingConversation = prev.find(c => c.id === messageConvId);

            if (existingConversation) {
                return prev.map(conv =>
                    conv.id === messageConvId
                        ? {
                            ...conv,
                            lastMessage: message,
                            // KEY CHANGE: Don't increment unread count if conversation is active
                            unreadCount: isActiveConversation ? 0 : conv.unreadCount + 1
                        }
                        : conv
                );
            } else {
                if (messageConvId) {
                    fetchConversation(messageConvId);
                }
                return prev;
            }
        });
    };
    const handleReadReceipt = (receipt: { conversationId: number, userId: number }) => {
        // Update message read status if needed
        if (activeConversation?.id === receipt.conversationId) {
            setMessages(prev =>
                prev.map(msg =>
                    msg.senderId === Number(user?.userId) ? { ...msg, read: true } : msg
                )
            );
        }
    };

    return (
        <ChatContext.Provider
            value={{
                conversations,
                activeConversation,
                messages,
                loading,
                error,
                connected, // Added to context value
                createDirectConversation,
                createGroupConversation,
                selectConversation,
                sendMessage,
                markAsRead,
                loadMoreMessages,      // Add this
                loadingMoreMessages,   // Add this
                hasMoreMessages,       // Add this
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};