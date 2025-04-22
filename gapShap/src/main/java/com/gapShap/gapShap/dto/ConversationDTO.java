package com.gapShap.gapShap.dto;

import java.util.Date;
import java.util.List;

public class ConversationDTO {
    
    private Long id;
    private boolean isGroupChat;
    private String name;
    private Date createdAt;
    private List<UserDTO> participants;
    private MessageDTO lastMessage;
    private int unreadCount;
    
    // Default constructor
    public ConversationDTO() {}
    
    // Getters and setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public boolean isGroupChat() {
        return isGroupChat;
    }
    
    public void setGroupChat(boolean groupChat) {
        isGroupChat = groupChat;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public Date getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }
    
    public List<UserDTO> getParticipants() {
        return participants;
    }
    
    public void setParticipants(List<UserDTO> participants) {
        this.participants = participants;
    }
    
    public MessageDTO getLastMessage() {
        return lastMessage;
    }
    
    public void setLastMessage(MessageDTO lastMessage) {
        this.lastMessage = lastMessage;
    }
    
    public int getUnreadCount() {
        return unreadCount;
    }
    
    public void setUnreadCount(int unreadCount) {
        this.unreadCount = unreadCount;
    }
}