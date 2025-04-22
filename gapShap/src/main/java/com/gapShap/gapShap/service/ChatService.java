package com.gapShap.gapShap.service;

import com.gapShap.gapShap.dto.ConversationDTO;
import com.gapShap.gapShap.dto.MessageDTO;
import com.gapShap.gapShap.dto.UserDTO;
import com.gapShap.gapShap.model.Conversation;
import com.gapShap.gapShap.model.Message;
import com.gapShap.gapShap.model.User;
import com.gapShap.gapShap.repository.ConversationRepository;
import com.gapShap.gapShap.repository.MessageRepository;
import com.gapShap.gapShap.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public ChatService(ConversationRepository conversationRepository,
            MessageRepository messageRepository,
            UserRepository userRepository,
            SimpMessagingTemplate messagingTemplate) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.messagingTemplate = messagingTemplate;
    }

    // Get all conversations for a user

    public List<ConversationDTO> getConversationsForUser(User user) {
        List<Conversation> conversations = conversationRepository.findConversationsForUser(user);
        return conversations.stream()
                .map(conversation -> convertToConversationDTO(conversation, user))
                .sorted((c1, c2) -> {
                    // Get timestamps for both conversations, using createdAt as a fallback
                    Long timestamp1 = c1.getLastMessage() != null ? c1.getLastMessage().getSentAt()
                            : (c1.getCreatedAt() != null ? c1.getCreatedAt().getTime() : 0L);

                    Long timestamp2 = c2.getLastMessage() != null ? c2.getLastMessage().getSentAt()
                            : (c2.getCreatedAt() != null ? c2.getCreatedAt().getTime() : 0L);

                    // Sort in reverse order (newest first)
                    return timestamp2.compareTo(timestamp1);
                })
                .collect(Collectors.toList());
    }

    // Get or create a direct conversation between two users
    @Transactional
    public ConversationDTO getOrCreateDirectConversation(User user1, User user2) {
        if (user1.getId().equals(user2.getId())) {
            throw new IllegalArgumentException("Cannot create conversation with yourself");
        }

        Optional<Conversation> existingConversation = conversationRepository.findDirectConversation(user1, user2);

        Conversation conversation = existingConversation.orElseGet(() -> {
            Conversation newConversation = new Conversation(user1, user2);
            return conversationRepository.save(newConversation);
        });

        return convertToConversationDTO(conversation, user1);
    }

    // Create a group conversation
    @Transactional
    public ConversationDTO createGroupConversation(String name, List<User> participants) {
        if (participants.size() < 2) {
            throw new IllegalArgumentException("Group conversation must have at least 2 participants");
        }

        Conversation conversation = new Conversation(name, participants);
        conversation = conversationRepository.save(conversation);

        return convertToConversationDTO(conversation, participants.get(0));
    }

    // Get messages for a conversation with pagination
    // Update the getMessagesForConversation method
    public List<MessageDTO> getMessagesForConversation(Long conversationId, User currentUser, int page, int size) {
        Optional<Conversation> conversationOpt = conversationRepository.findById(conversationId);
        if (conversationOpt.isEmpty()) {
            throw new NoSuchElementException("Conversation not found");
        }

        Conversation conversation = conversationOpt.get();
        if (!conversation.getParticipants().contains(currentUser)) {
            throw new IllegalArgumentException("User is not part of this conversation");
        }

        Pageable pageable = PageRequest.of(page, size);
        // Change from Asc to Desc to get most recent messages
        List<Message> messages = messageRepository.findByConversationOrderBySentAtDesc(conversation, pageable);

        // Convert to DTOs, collect, and reverse to maintain chronological order for
        // display
        List<MessageDTO> messageDTOs = messages.stream()
                .map(this::convertToMessageDTO)
                .collect(Collectors.toList());

        // Reverse the order so newest messages appear at the bottom in the UI
        Collections.reverse(messageDTOs);

        return messageDTOs;
    }

    // Send a new message
    @Transactional
    public MessageDTO sendMessage(User sender, Long conversationId, String content) {
        Optional<Conversation> conversationOpt = conversationRepository.findById(conversationId);
        if (conversationOpt.isEmpty()) {
            throw new NoSuchElementException("Conversation not found");
        }

        Conversation conversation = conversationOpt.get();
        if (!conversation.getParticipants().contains(sender)) {
            throw new IllegalArgumentException("User is not part of this conversation");
        }

        Message message = new Message(content, sender, conversation);
        message = messageRepository.save(message);

        MessageDTO messageDTO = convertToMessageDTO(message);

        // Send message to all participants in the conversation
        for (User participant : conversation.getParticipants()) {
            if (!participant.getId().equals(sender.getId())) {
                messagingTemplate.convertAndSendToUser(
                        participant.getAuthId(),
                        "/queue/messages",
                        messageDTO);
            }
        }

        return messageDTO;
    }

    // Mark messages as read
    @Transactional
    public void markMessagesAsRead(User user, Long conversationId) {
        Optional<Conversation> conversationOpt = conversationRepository.findById(conversationId);
        if (conversationOpt.isEmpty()) {
            throw new NoSuchElementException("Conversation not found");
        }

        Conversation conversation = conversationOpt.get();
        if (!conversation.getParticipants().contains(user)) {
            throw new IllegalArgumentException("User is not part of this conversation");
        }

        List<Message> unreadMessages = messageRepository
                .findByConversationAndIsReadFalseOrderBySentAtDesc(conversation);
        for (Message message : unreadMessages) {
            if (!message.getSender().getId().equals(user.getId())) {
                message.setRead(true);
                messageRepository.save(message);
            }
        }
    }

    // Convert Message to MessageDTO
    private MessageDTO convertToMessageDTO(Message message) {
        MessageDTO messageDTO = new MessageDTO();
        messageDTO.setId(message.getId());
        messageDTO.setContent(message.getContent());
        messageDTO.setSenderId(message.getSender().getId());
        messageDTO.setSenderName(message.getSender().getName());
        messageDTO.setSenderPicture(message.getSender().getPictureUrl());
        messageDTO.setConversationId(message.getConversation().getId());

        // Send timestamp as milliseconds (most reliable format)
        messageDTO.setSentAt(message.getSentAt().getTime());

        messageDTO.setRead(message.isRead());

        return messageDTO;
    }

    // Convert Conversation to ConversationDTO
    private ConversationDTO convertToConversationDTO(Conversation conversation, User currentUser) {
        ConversationDTO conversationDTO = new ConversationDTO();
        conversationDTO.setId(conversation.getId());
        conversationDTO.setGroupChat(conversation.isGroupChat());
        conversationDTO.setCreatedAt(conversation.getCreatedAt());

        // Get participants (excluding current user for direct chats)
        List<UserDTO> participantDTOs = conversation.getParticipants().stream()
                .map(user -> new UserDTO(user.getId(), user.getName(), user.getEmail(), user.getPictureUrl()))
                .collect(Collectors.toList());
        conversationDTO.setParticipants(participantDTOs);

        // For direct conversations, set the name to the other user's name
        if (!conversation.isGroupChat()) {
            Optional<User> otherUser = conversation.getParticipants().stream()
                    .filter(u -> !u.getId().equals(currentUser.getId()))
                    .findFirst();

            if (otherUser.isPresent()) {
                conversationDTO.setName(otherUser.get().getName());
            }
        } else {
            conversationDTO.setName(conversation.getName());
        }

        // Get last message and unread count
        Pageable pageable = PageRequest.of(0, 1);
        List<Message> lastMessages = messageRepository.findByConversationOrderBySentAtDesc(conversation, pageable);
        if (!lastMessages.isEmpty()) {
            conversationDTO.setLastMessage(convertToMessageDTO(lastMessages.get(0)));
        }

        long unreadCount = messageRepository.countByConversationAndIsReadFalse(conversation);
        conversationDTO.setUnreadCount((int) unreadCount);

        return conversationDTO;
    }
}