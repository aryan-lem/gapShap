package com.gapShap.gapShap.dto;

import java.util.Date;

public class MessageDTO {
    
    private Long id;
    private String content;
    private Long senderId;
    private String senderName;
    private String senderPicture;
    private Long conversationId;
    private Long sentAt;
    private boolean isRead;
    
    // Default constructor
    public MessageDTO() {}
    
    // Getters and setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getContent() {
        return content;
    }
    
    public void setContent(String content) {
        this.content = content;
    }
    
    public Long getSenderId() {
        return senderId;
    }
    
    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }
    
    public String getSenderName() {
        return senderName;
    }
    
    public void setSenderName(String senderName) {
        this.senderName = senderName;
    }
    
    public String getSenderPicture() {
        return senderPicture;
    }
    
    public void setSenderPicture(String senderPicture) {
        this.senderPicture = senderPicture;
    }
    
    public Long getConversationId() {
        return conversationId;
    }
    
    public void setConversationId(Long conversationId) {
        this.conversationId = conversationId;
    }
    
    public Long getSentAt() {
        return sentAt;
    }
    
    public void setSentAt(Long sentAt) {
        this.sentAt = sentAt;
    }
    
    public boolean isRead() {
        return isRead;
    }
    
    public void setRead(boolean read) {
        isRead = read;
    }
}