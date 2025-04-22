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
    sentAt:number;
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
                console.log('MESSAGE BODY:', message.body);
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

    const selectConversation = async (conversationId: number) => {
        try {
            setLoading(true);

            // Find the selected conversation
            const conversation = conversations.find(c => c.id === conversationId);
            if (!conversation) {
                throw new Error('Conversation not found');
            }

            setActiveConversation(conversation);

            // Load messages for this conversation
            const response = await fetch(`${API_URL}/api/conversations/${conversationId}/messages`, {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to load messages');
            }

            const data = await response.json();
            setMessages(data);

            // Mark messages as read
            markAsRead(conversationId);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
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

const handleIncomingMessage = (message: Message) => {
    console.log('Received message:', message);
    console.log('Active conversation check:', {
        activeConvId: activeConversation?.id,
        messageConvId: message.conversationId,
        equal: activeConversation?.id === message.conversationId
    });
    
    if (!message.conversationId) {
        console.error('Message missing conversationId:', message);
        return;
    }

    // CRITICAL FIX: Update the messages array FIRST before modifying the conversations list
    // This ensures immediate UI update in the chat thread
    if (activeConversation && message.conversationId === activeConversation.id) {
        console.log('Adding message to active conversation');
        
        // Update active conversation messages immediately
        setMessages(prev => {
            const isDuplicate = prev.some(m => m.id === message.id);
            if (isDuplicate) {
                return prev;
            }
            return [...prev, message];
        });
        
        // Mark as read since we're already viewing this conversation
        markAsRead(message.conversationId);
    }
    
    // THEN update the conversations list
    setConversations(prev => {
        const existingConversation = prev.find(c => c.id === message.conversationId);
        
        if (existingConversation) {
            return prev.map(conv => 
                conv.id === message.conversationId 
                ? {
                    ...conv,
                    lastMessage: message,
                    unreadCount: activeConversation?.id === message.conversationId ? 0 : conv.unreadCount + 1
                } 
                : conv
            );
        } else {
            fetchConversation(message.conversationId||0);
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
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};