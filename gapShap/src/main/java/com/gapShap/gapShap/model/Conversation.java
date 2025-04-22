package com.gapShap.gapShap.model;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Entity
@Table(name = "conversations")
public class Conversation {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "is_group_chat")
    private boolean isGroupChat;
    
    @Column(name = "conversation_name")
    private String name;
    
    @Column(name = "created_at")
    private Date createdAt;
    
    @ManyToMany
    @JoinTable(
        name = "conversation_participants",
        joinColumns = @JoinColumn(name = "conversation_id"),
        inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private List<User> participants = new ArrayList<>();
    
    @OneToMany(mappedBy = "conversation", cascade = CascadeType.ALL)
    private List<Message> messages = new ArrayList<>();
    
    // Default constructor
    public Conversation() {
        this.createdAt = new Date();
    }
    
    // Constructor for direct conversations
    public Conversation(User user1, User user2) {
        this.isGroupChat = false;
        this.name = null;
        this.createdAt = new Date();
        this.participants.add(user1);
        this.participants.add(user2);
    }
    
    // Constructor for group conversations
    public Conversation(String name, List<User> participants) {
        this.isGroupChat = true;
        this.name = name;
        this.createdAt = new Date();
        this.participants.addAll(participants);
    }
    
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
    
    public List<User> getParticipants() {
        return participants;
    }
    
    public void setParticipants(List<User> participants) {
        this.participants = participants;
    }
    
    public List<Message> getMessages() {
        return messages;
    }
    
    public void setMessages(List<Message> messages) {
        this.messages = messages;
    }
    
    public void addParticipant(User user) {
        this.participants.add(user);
    }
    
    public void addMessage(Message message) {
        this.messages.add(message);
        message.setConversation(this);
    }
}